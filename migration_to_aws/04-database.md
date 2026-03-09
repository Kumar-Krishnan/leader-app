# Phase 4: Database — Supabase PostgreSQL → DynamoDB

## Decision: DynamoDB vs Aurora PostgreSQL

### DynamoDB (NoSQL)
- **Pros**: Serverless, auto-scaling, pay-per-request, no connection management, fits well with Lambda
- **Cons**: Requires rethinking data access patterns, no JOINs, no RPC functions, denormalization needed
- **Best if**: You want fully serverless, low operational overhead

### Aurora Serverless v2 (PostgreSQL)
- **Pros**: Keep existing schema/queries almost as-is, supports JOINs and RPCs, easier migration
- **Cons**: Connection management with Lambda (need RDS Proxy), not truly serverless (min capacity), higher base cost
- **Best if**: You want to minimize application-layer changes

**This guide assumes DynamoDB.** If you choose Aurora, the migration is simpler — port the schema, set up RDS Proxy, and update connection strings in repos.

---

## DynamoDB Table Design

### Single-Table Design vs Multiple Tables
For this app, **multiple tables** is cleaner and more maintainable given the distinct entities. Use GSIs (Global Secondary Indexes) for alternate access patterns.

### Table: `profiles`
| Attribute | Type | Key |
|---|---|---|
| `id` (user sub from Cognito) | String | PK |
| `email` | String | GSI-1 PK |
| `full_name` | String | |
| `role` | String | |
| `avatar_url` | String | |
| `created_at` | String | |

### Table: `groups`
| Attribute | Type | Key |
|---|---|---|
| `id` | String (UUID) | PK |
| `name` | String | |
| `group_code` | String | GSI-1 PK (for join-by-code lookup) |
| `description` | String | |
| `timezone` | String | |
| `created_by` | String | |
| `created_at` | String | |

### Table: `group_members`
| Attribute | Type | Key |
|---|---|---|
| `group_id` | String | PK |
| `member_id` | String (user_id or placeholder_id) | SK |
| `member_type` | String (`user` or `placeholder`) | |
| `role` | String | |
| `user_id` | String | GSI-1 PK (find all groups for a user) |
| `joined_at` | String | |

### Table: `threads`
| Attribute | Type | Key |
|---|---|---|
| `id` | String (UUID) | PK |
| `group_id` | String | GSI-1 PK |
| `title` | String | |
| `created_by` | String | |
| `visibility` | String | |
| `created_at` | String | GSI-1 SK (sort threads by date) |

### Table: `thread_members`
| Attribute | Type | Key |
|---|---|---|
| `thread_id` | String | PK |
| `user_id` | String | SK |
| `last_read_at` | String | |

GSI-1: `user_id` (PK) — find all threads for a user

### Table: `messages`
| Attribute | Type | Key |
|---|---|---|
| `thread_id` | String | PK |
| `id` | String (UUID) | SK |
| `sender_id` | String | |
| `content` | String | |
| `created_at` | String | |
| `updated_at` | String | |

Messages are always queried by thread, sorted by creation time. Use `id` as SK (UUIDs are time-ordered if using v7, or add a `created_at#id` composite SK).

### Table: `meetings`
| Attribute | Type | Key |
|---|---|---|
| `id` | String (UUID) | PK |
| `group_id` | String | GSI-1 PK |
| `title` | String | |
| `start_time` | String | GSI-1 SK |
| `end_time` | String | |
| `location` | String | |
| `notes` | String | |
| `created_by` | String | |
| `series_id` | String | GSI-2 PK (query all meetings in a series) |
| `series_index` | Number | |
| `series_total` | Number | |
| `reminder_sent_at` | String | |

### Table: `meeting_attendees`
| Attribute | Type | Key |
|---|---|---|
| `meeting_id` | String | PK |
| `attendee_id` | String | SK |
| `attendee_type` | String (`user` or `placeholder`) | |
| `status` | String (`pending`, `accepted`, `declined`) | |
| `user_id` | String | GSI-1 PK (find all meetings for a user) |

### Table: `meeting_co_leaders`
| Attribute | Type | Key |
|---|---|---|
| `meeting_id` | String | PK |
| `user_id` | String | SK |

### Table: `resources`
| Attribute | Type | Key |
|---|---|---|
| `id` | String (UUID) | PK |
| `group_id` | String | GSI-1 PK |
| `folder_id` | String | GSI-2 PK (resources in a folder) |
| `title` | String | |
| `type` | String | |
| `url` | String | |
| `storage_path` | String | |
| `created_by` | String | |
| `created_at` | String | GSI-1 SK |

### Table: `resource_folders`
| Attribute | Type | Key |
|---|---|---|
| `id` | String (UUID) | PK |
| `group_id` | String | GSI-1 PK |
| `parent_id` | String | |
| `name` | String | |
| `created_by` | String | |

### Table: `placeholder_profiles`
| Attribute | Type | Key |
|---|---|---|
| `id` | String (UUID) | PK |
| `email` | String | GSI-1 PK (lookup by email for migration) |
| `full_name` | String | |
| `created_by` | String | |

### Table: `group_join_requests`
| Attribute | Type | Key |
|---|---|---|
| `id` | String (UUID) | PK |
| `group_id` | String | GSI-1 PK |
| `user_id` | String | GSI-2 PK |
| `status` | String | |
| `created_at` | String | |

### Table: `meeting_reminder_tokens`
| Attribute | Type | Key |
|---|---|---|
| `id` | String (UUID) | PK |
| `meeting_id` | String | GSI-1 PK |
| `leader_id` | String | |
| `token` | String | GSI-2 PK (lookup by token) |
| `used` | Boolean | |
| `reminder_sent_at` | String | |

### Tables that can use simpler structures:
- `resource_group_shares` — PK: `resource_id`, SK: `shared_with_group_id`
- `resource_folder_group_shares` — PK: `folder_id`, SK: `shared_with_group_id`
- `location_events` — PK: `id`, write-only analytics (or send to Kinesis/Firehose instead)
- `resource_comments` — PK: `resource_id`, SK: `id`

---

## RPC Functions → Lambda Replacements

The 9 Supabase RPC functions become Lambda functions (or logic inside existing API Lambdas):

| Supabase RPC | AWS Replacement |
|---|---|
| `request_to_join_group(group_code)` | Lambda: lookup group by code (GSI), create join request |
| `approve_join_request(request_id)` | Lambda: verify leader role, add to group_members, update request |
| `reject_join_request(request_id)` | Lambda: verify leader role, update request status |
| `update_member_role(member_id, new_role)` | Lambda: verify caller is leader+, enforce escalation rules |
| `create_placeholder_member(group_id, email, full_name, role)` | Lambda: create placeholder, add to group_members |
| `migrate_placeholder_to_user(user_id, email)` | Cognito post-confirmation trigger (see 03-auth.md) |
| `get_unread_thread_groups(user_id)` | Lambda: query thread_members for user, compare last_read_at vs latest message |
| `get_pending_reminder_groups(user_id)` | Lambda: query meetings where user is leader and reminder_sent_at is null |
| `rsvp_to_series(series_id, user_id, status)` | Lambda: query meetings by series_id (GSI), batch update attendee records |

---

## RLS → Application-Level Authorization

Every DynamoDB operation must include authorization checks that were previously handled by RLS. Implement as middleware in your Lambda functions:

```typescript
// Example: authorization middleware
async function assertGroupMember(userId: string, groupId: string): Promise<GroupMember> {
  const member = await dynamodb.get({
    TableName: "group_members",
    Key: { group_id: groupId, member_id: userId },
  });
  if (!member.Item) throw new ForbiddenError("Not a member of this group");
  return member.Item as GroupMember;
}

async function assertGroupLeader(userId: string, groupId: string): Promise<void> {
  const member = await assertGroupMember(userId, groupId);
  if (!["leader", "admin"].includes(member.role)) {
    throw new ForbiddenError("Must be a leader");
  }
}
```

---

## Data Migration Script

```typescript
// Pseudocode for migrating PostgreSQL → DynamoDB
import { createClient } from "@supabase/supabase-js";
import { DynamoDBClient, BatchWriteItemCommand } from "@aws-sdk/client-dynamodb";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const dynamo = new DynamoDBClient({ region: "us-east-1" });

async function migrateTable(tableName: string, transform: (row: any) => any) {
  const { data } = await supabase.from(tableName).select("*");
  // Batch write to DynamoDB in chunks of 25
  for (const chunk of chunkArray(data, 25)) {
    await dynamo.send(new BatchWriteItemCommand({
      RequestItems: {
        [tableName]: chunk.map(row => ({
          PutRequest: { Item: transform(row) }
        }))
      }
    }));
  }
}
```

## Cost Estimate (DynamoDB On-Demand)
- For a small-to-medium app: likely < $5/month
- Reads: $0.25 per million read request units
- Writes: $1.25 per million write request units
- Storage: $0.25 per GB/month
