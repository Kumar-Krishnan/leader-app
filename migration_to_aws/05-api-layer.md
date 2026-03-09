# Phase 5: API Layer — Supabase PostgREST → API Gateway + Lambda

## What We Have Now
- Supabase auto-generates a REST API (PostgREST) from the database schema
- All 8 repositories in `src/repositories/` call this API via `supabase.from('table').select/insert/update/delete`
- 9 RPC functions called via `supabase.rpc('function_name', params)`
- Auth header (JWT) sent automatically with every request

## AWS Architecture

### API Gateway (HTTP API)
- HTTP API (cheaper and faster than REST API for this use case)
- Cognito authorizer on all routes
- Routes map to Lambda functions

### Lambda Functions
Two approaches:

**Option A: One Lambda per entity (recommended)**
- `profiles-handler` — CRUD for profiles
- `groups-handler` — CRUD for groups + join requests
- `members-handler` — CRUD for group members + placeholders
- `threads-handler` — CRUD for threads + thread members
- `messages-handler` — CRUD for messages
- `meetings-handler` — CRUD for meetings + attendees + co-leaders
- `resources-handler` — CRUD for resources + folders + shares + comments
- `analytics-handler` — location events (write-only)

**Option B: Single monolith Lambda**
- One Lambda handles all routes, uses internal routing
- Simpler deployment, but larger cold starts

**Recommendation: Option A** — smaller bundles, faster cold starts, independent scaling.

### Route Design

```
# Profiles
GET    /profiles/{id}
PUT    /profiles/{id}

# Groups
GET    /groups                          # List user's groups
POST   /groups                          # Create group
GET    /groups/{groupId}                # Get group details
POST   /groups/join                     # Request to join (by code)
POST   /groups/{groupId}/join-requests/{id}/approve
POST   /groups/{groupId}/join-requests/{id}/reject

# Members
GET    /groups/{groupId}/members
POST   /groups/{groupId}/members        # Add member / create placeholder
PUT    /groups/{groupId}/members/{id}   # Update role
DELETE /groups/{groupId}/members/{id}

# Threads
GET    /groups/{groupId}/threads
POST   /groups/{groupId}/threads
GET    /threads/{threadId}
GET    /threads/{threadId}/members

# Messages
GET    /threads/{threadId}/messages
POST   /threads/{threadId}/messages
PUT    /messages/{messageId}
DELETE /messages/{messageId}

# Meetings
GET    /groups/{groupId}/meetings
POST   /groups/{groupId}/meetings
PUT    /meetings/{meetingId}
DELETE /meetings/{meetingId}
GET    /meetings/{meetingId}/attendees
POST   /meetings/{meetingId}/attendees
PUT    /meetings/{meetingId}/attendees/{id}
DELETE /meetings/{meetingId}/attendees/{id}
POST   /meetings/series/{seriesId}/rsvp

# Resources
GET    /groups/{groupId}/resources
POST   /groups/{groupId}/resources
DELETE /resources/{resourceId}
GET    /groups/{groupId}/folders
POST   /groups/{groupId}/folders
GET    /resources/{resourceId}/comments
POST   /resources/{resourceId}/comments
DELETE /comments/{commentId}

# Storage (pre-signed URLs)
POST   /storage/upload-url
POST   /storage/download-url

# Analytics
POST   /analytics/location-event

# Aggregates (replacing RPCs)
GET    /users/{userId}/unread-groups
GET    /users/{userId}/pending-reminders
```

### Lambda Handler Pattern

```typescript
// Example: meetings-handler/index.ts
import { APIGatewayProxyHandlerV2WithJWTAuthorizer } from "aws-lambda";
import { DynamoDBDocumentClient, QueryCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  const userId = event.requestContext.authorizer.jwt.claims.sub as string;
  const method = event.requestContext.http.method;
  const path = event.rawPath;

  // Route internally
  if (method === "GET" && path.match(/\/groups\/[\w-]+\/meetings/)) {
    return listMeetings(userId, event.pathParameters!.groupId!);
  }
  // ... other routes
};

async function listMeetings(userId: string, groupId: string) {
  // 1. Verify user is a group member
  await assertGroupMember(userId, groupId);

  // 2. Query meetings for group
  const result = await ddb.send(new QueryCommand({
    TableName: "meetings",
    IndexName: "group-index",
    KeyConditionExpression: "group_id = :gid",
    ExpressionAttributeValues: { ":gid": groupId },
  }));

  return { statusCode: 200, body: JSON.stringify(result.Items) };
}
```

## Client-Side Changes: Repository Refactor

Each repository file switches from `supabase.from()` to `fetch()` calls against API Gateway.

### API Client
Create a shared API client:

```typescript
// src/lib/apiClient.ts
import { cognitoAuthService } from "../services/auth/cognitoAuthService";

const API_BASE = process.env.EXPO_PUBLIC_API_URL; // e.g. https://abc123.execute-api.us-east-1.amazonaws.com

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const session = await cognitoAuthService.getSession();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.idToken}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `API error ${res.status}`);
  }

  return res.json();
}
```

### Repository Example

```typescript
// src/repositories/meetingsRepo.ts — Before
export async function getMeetings(groupId: string) {
  const { data, error } = await supabase
    .from("meetings")
    .select("*, meeting_attendees(*)")
    .eq("group_id", groupId);
  if (error) throw error;
  return data;
}

// src/repositories/meetingsRepo.ts — After
export async function getMeetings(groupId: string) {
  return apiRequest<Meeting[]>(`/groups/${groupId}/meetings`);
}
```

The repo layer gets simpler since authorization and joins are handled server-side.

## Performance Considerations
- **Cold starts**: Use provisioned concurrency for critical paths (auth, meetings) if cold starts are noticeable
- **Bundle size**: Keep Lambda bundles small — only import what each handler needs
- **DynamoDB**: Use `BatchGetItem` when a single API call needs data from multiple items
- **Caching**: Add API Gateway caching for read-heavy, infrequently-changing data (group details, member lists)
