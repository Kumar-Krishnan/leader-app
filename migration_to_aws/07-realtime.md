# Phase 7: Realtime — Supabase Realtime → API Gateway WebSockets

## What We Have Now
- Supabase Realtime subscription on the `messages` table only
- Filtered by `thread_id`
- Handles INSERT, UPDATE, DELETE events
- Service abstracted behind `RealtimeService` interface
- Used only in `useMessages` hook

## AWS Options

### Option A: API Gateway WebSocket API (Recommended)
- Fully managed, serverless
- Pay per message + connection minutes
- Lambda handles connect/disconnect/message events
- Scales automatically

### Option B: AppSync Subscriptions
- GraphQL-based, good if you're already using AppSync
- More opinionated, adds GraphQL dependency
- Overkill for a single subscription use case

### Option C: IoT Core MQTT
- Good for high-throughput pub/sub
- More complex setup
- Better for device-to-device scenarios

**Recommendation: Option A** — simplest for a single subscription use case.

## Architecture

```
Client (React Native)
  ↓ WebSocket connect (wss://abc.execute-api.../production)
  ↓ Send: { action: "subscribe", threadId: "xxx" }
  ↓
API Gateway WebSocket API
  ↓
Lambda: $connect     → Store connectionId in DynamoDB
Lambda: $disconnect  → Remove connectionId from DynamoDB
Lambda: subscribe    → Map connectionId → threadId in DynamoDB
Lambda: message-broadcaster → Called when messages table changes (via DynamoDB Streams)
  ↓
Push to all connections subscribed to the threadId
```

### DynamoDB Table: `websocket_connections`
| Attribute | Type | Key |
|---|---|---|
| `connectionId` | String | PK |
| `userId` | String | |
| `threadId` | String | GSI-1 PK (find all connections for a thread) |
| `connectedAt` | String | |
| `ttl` | Number | TTL attribute (auto-cleanup stale connections) |

### Lambda: `$connect`
```typescript
export const handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  // Verify JWT from query string (WebSocket auth)
  const token = event.queryStringParameters?.token;
  const userId = await verifyToken(token);

  await ddb.put({
    TableName: "websocket_connections",
    Item: {
      connectionId,
      userId,
      connectedAt: new Date().toISOString(),
      ttl: Math.floor(Date.now() / 1000) + 86400, // 24h TTL
    },
  });

  return { statusCode: 200 };
};
```

### Lambda: `subscribe`
```typescript
export const handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const { threadId } = JSON.parse(event.body);

  // Verify user is a thread member (authorization)
  const conn = await ddb.get({ TableName: "websocket_connections", Key: { connectionId } });
  await assertThreadMember(conn.Item.userId, threadId);

  await ddb.update({
    TableName: "websocket_connections",
    Key: { connectionId },
    UpdateExpression: "SET threadId = :tid",
    ExpressionAttributeValues: { ":tid": threadId },
  });

  return { statusCode: 200 };
};
```

### Lambda: `message-broadcaster`
Triggered by DynamoDB Streams on the `messages` table:

```typescript
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";

const api = new ApiGatewayManagementApiClient({
  endpoint: process.env.WEBSOCKET_ENDPOINT, // e.g. https://abc.execute-api.us-east-1.amazonaws.com/production
});

export const handler = async (event) => {
  for (const record of event.Records) {
    if (record.eventName === "INSERT" || record.eventName === "MODIFY" || record.eventName === "REMOVE") {
      const threadId = record.dynamodb.NewImage?.thread_id?.S || record.dynamodb.OldImage?.thread_id?.S;

      // Find all WebSocket connections subscribed to this thread
      const connections = await ddb.query({
        TableName: "websocket_connections",
        IndexName: "thread-index",
        KeyConditionExpression: "threadId = :tid",
        ExpressionAttributeValues: { ":tid": threadId },
      });

      // Broadcast to all connected clients
      const payload = JSON.stringify({
        eventType: record.eventName,
        message: record.eventName === "REMOVE"
          ? unmarshall(record.dynamodb.OldImage)
          : unmarshall(record.dynamodb.NewImage),
      });

      await Promise.all(connections.Items.map(async (conn) => {
        try {
          await api.send(new PostToConnectionCommand({
            ConnectionId: conn.connectionId,
            Data: payload,
          }));
        } catch (err) {
          if (err.statusCode === 410) {
            // Stale connection, clean up
            await ddb.delete({ TableName: "websocket_connections", Key: { connectionId: conn.connectionId } });
          }
        }
      }));
    }
  }
};
```

## Client-Side Changes

### New WebSocket Realtime Service
```typescript
// src/services/realtime/websocketRealtimeService.ts
export class WebSocketRealtimeService implements RealtimeService {
  private ws: WebSocket | null = null;

  subscribe(table: string, filter: string, callback: RealtimeCallback): () => void {
    // Parse filter to get threadId
    const threadId = filter.split("eq.")[1];

    // Get auth token
    const token = await getIdToken();

    // Connect
    this.ws = new WebSocket(`${WS_URL}?token=${token}`);

    this.ws.onopen = () => {
      this.ws.send(JSON.stringify({ action: "subscribe", threadId }));
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      callback(data.eventType, data.message);
    };

    // Return unsubscribe function
    return () => {
      this.ws?.close();
      this.ws = null;
    };
  }
}
```

### Swap in service index
```typescript
// src/services/realtime/index.ts
export const realtimeService = new WebSocketRealtimeService();
```

## Cost
- API Gateway WebSocket: $1 per million messages, $0.25 per million connection minutes
- For a small app with moderate chat usage: < $1/month
