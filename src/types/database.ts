/**
 * Global user role in the application
 * - user: Regular user
 * - leader: Can create groups and manage content
 * - admin: Full system access
 */
export type UserRole = 'user' | 'leader' | 'admin';

/**
 * Role within a specific group
 * - member: Regular group member
 * - leader-helper: Can approve join requests
 * - leader: Can create content and manage members
 * - admin: Full group control, can see join code
 */
export type GroupRole = 'member' | 'leader-helper' | 'leader' | 'admin';

/**
 * Status of a group join request
 */
export type JoinRequestStatus = 'pending' | 'approved' | 'rejected';

/**
 * User profile extending Supabase auth.users
 * Created automatically via database trigger on user signup
 */
export interface Profile {
  /** UUID matching auth.users.id */
  id: string;
  /** User's email address */
  email: string;
  /** User's display name */
  full_name: string | null;
  /** URL to user's avatar image */
  avatar_url: string | null;
  /** Global application role */
  role: UserRole;
  /** User's notification settings */
  notification_preferences: NotificationPreferences;
  /** HubSpot CRM contact ID for sync */
  hubspot_contact_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * User notification preferences
 */
export interface NotificationPreferences {
  /** Receive notifications for new messages */
  messages: boolean;
  /** Receive notifications for meetings */
  meetings: boolean;
  /** Receive notifications for new resources */
  resources: boolean;
  /** Whether push notifications are enabled */
  push_enabled: boolean;
}

/**
 * A group/community that users can belong to
 */
export interface Group {
  id: string;
  /** Display name of the group */
  name: string;
  /** Optional description */
  description: string | null;
  /** Join code for new members (visible to admins) */
  code: string | null;
  /** User ID who created the group */
  created_by: string | null;
  /** Whether this is a system-managed group */
  is_system: boolean;
  /** Type of system group (e.g., 'hubspot') */
  system_type: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * User membership in a group
 */
export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  /** User's role within this specific group */
  role: GroupRole;
  joined_at: string;
}

/**
 * GroupMember with related Group and Profile data
 */
export interface GroupMemberWithDetails extends GroupMember {
  group?: Group;
  user?: Profile;
}

/**
 * A discussion thread within a group
 */
export interface Thread {
  id: string;
  /** Thread title */
  name: string;
  /** Group this thread belongs to */
  group_id: string;
  /** User who created the thread */
  created_by: string;
  /** Whether the thread is archived */
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * User membership in a thread
 */
export interface ThreadMember {
  id: string;
  thread_id: string;
  user_id: string;
  joined_at: string;
}

/**
 * A message within a thread
 */
export interface Message {
  id: string;
  thread_id: string;
  /** User who sent the message */
  sender_id: string;
  /** Message text content */
  content: string;
  /** URLs to attached files */
  attachments: string[];
  created_at: string;
}

/**
 * A scheduled meeting/event within a group
 */
export interface Meeting {
  id: string;
  /** Meeting title */
  title: string;
  /** Optional description/notes */
  description: string | null;
  /** ISO date string of meeting date/time */
  date: string;
  /** Physical or virtual location */
  location: string | null;
  /** Discussion topics or text references */
  passages: string[];
  /** Group this meeting belongs to */
  group_id: string;
  /** Optional linked discussion thread */
  thread_id: string | null;
  /** URLs to attached files */
  attachments: string[];
  /** User who created the meeting */
  created_by: string;
  /** ID for recurring meeting series */
  series_id: string | null;
  /** Position in series (1, 2, 3...) for display like "Event (1/4)" */
  series_index: number | null;
  /** Total events in the series */
  series_total: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * RSVP status for meeting attendees
 */
export type AttendeeStatus = 'invited' | 'accepted' | 'declined' | 'maybe';

/**
 * Meeting attendance record
 */
export interface MeetingAttendee {
  id: string;
  meeting_id: string;
  user_id: string;
  /** RSVP status */
  status: AttendeeStatus;
  invited_at: string;
  responded_at: string | null;
  /** True if RSVP was set for entire series */
  is_series_rsvp: boolean;
}

/**
 * MeetingAttendee with related Profile data
 */
export interface MeetingAttendeeWithProfile extends MeetingAttendee {
  user?: Profile;
}

/**
 * Meeting with attendee list populated
 */
export interface MeetingWithAttendees extends Meeting {
  attendees?: MeetingAttendeeWithProfile[];
}

/**
 * A folder for organizing resources within a group
 */
export interface ResourceFolder {
  id: string;
  /** Folder name */
  name: string;
  /** Group this folder belongs to */
  group_id: string;
  /** Parent folder ID (null for root level) */
  parent_id: string | null;
  /** User who created the folder */
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * A shared resource (document, link, video, etc.) within a group
 */
export interface Resource {
  id: string;
  /** Display title */
  title: string;
  /** Resource type */
  type: 'document' | 'link' | 'video' | 'other';
  /** Text content (for text-based resources) */
  content: string | null;
  /** External URL (for link type) */
  url: string | null;
  /** Tags for categorization */
  tags: string[];
  /** Visibility level - controls who can see this resource */
  visibility: 'all' | 'leaders_only' | 'members_only';
  /** Group this resource belongs to */
  group_id: string;
  /** Parent folder ID (null for root level) */
  folder_id: string | null;
  /** Storage path for uploaded files */
  file_path: string | null;
  /** File size in bytes */
  file_size: number | null;
  /** MIME type of uploaded file */
  mime_type: string | null;
  /** User who uploaded/created the resource */
  shared_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Legacy resource sharing record (user-to-user)
 * @deprecated Use resource_group_shares for group-based sharing
 */
export interface ResourceShare {
  id: string;
  resource_id: string;
  shared_with: string;
  shared_at: string;
}

/**
 * Comment on a resource or folder
 */
export interface ResourceComment {
  id: string;
  /** Resource ID (mutually exclusive with folder_id) */
  resource_id: string | null;
  /** Folder ID (mutually exclusive with resource_id) */
  folder_id: string | null;
  /** User who posted the comment */
  user_id: string;
  /** Comment text */
  content: string;
  created_at: string;
  updated_at: string;
}

/**
 * ResourceComment with related Profile data
 */
export interface ResourceCommentWithUser extends ResourceComment {
  user?: Profile;
}

/**
 * Request from a user to join a group
 */
export interface GroupJoinRequest {
  id: string;
  group_id: string;
  user_id: string;
  /** Current request status */
  status: JoinRequestStatus;
  /** User who approved/rejected (if any) */
  reviewed_by: string | null;
  /** When the request was reviewed */
  reviewed_at: string | null;
  created_at: string;
}

/**
 * GroupJoinRequest with related Profile and Group data
 */
export interface GroupJoinRequestWithDetails extends GroupJoinRequest {
  user?: Profile;
  group?: Group;
}

/**
 * Status of a HubSpot sync run
 */
export type HubSpotSyncStatus = 'pending' | 'running' | 'completed' | 'failed';

/**
 * Status of a HubSpot file tracking record
 */
export type HubSpotFileSyncStatus = 'synced' | 'failed' | 'deleted';

/**
 * HubSpot sync state record
 * Tracks each sync run and its statistics
 */
export interface HubSpotSyncState {
  id: string;
  /** Timestamp of last successful sync */
  last_sync_at: string | null;
  /** Current status of the sync run */
  status: HubSpotSyncStatus;
  /** Number of files successfully synced */
  files_synced: number;
  /** Number of files skipped (already exist) */
  files_skipped: number;
  /** Number of files that failed to sync */
  files_failed: number;
  /** Error message if sync failed */
  error_message: string | null;
  /** When the sync started */
  started_at: string | null;
  /** When the sync completed */
  completed_at: string | null;
  created_at: string;
}

/**
 * HubSpot file tracking record
 * Maps HubSpot files to local resources for deduplication
 */
export interface HubSpotFile {
  id: string;
  /** HubSpot's file ID */
  hubspot_file_id: string;
  /** Original filename in HubSpot */
  hubspot_file_name: string;
  /** File size in bytes */
  hubspot_file_size: number | null;
  /** HubSpot file URL */
  hubspot_file_url: string | null;
  /** Local resource ID (if synced) */
  resource_id: string | null;
  /** Sync status of this file */
  sync_status: HubSpotFileSyncStatus;
  /** Last time this file was synced */
  last_synced_at: string;
  created_at: string;
}

/**
 * Meeting reminder token record
 * Stores secure tokens for meeting reminder email confirmation flow
 */
export interface MeetingReminderToken {
  id: string;
  /** Meeting this token is for */
  meeting_id: string;
  /** Leader who will confirm the reminder */
  leader_id: string;
  /** Secure 64-character hex token */
  token: string;
  /** When the reminder email was sent to the leader */
  reminder_sent_at: string | null;
  /** When the leader confirmed and triggered attendee emails */
  confirmed_at: string | null;
  /** When emails were sent to attendees */
  attendee_email_sent_at: string | null;
  /** Leader-customized description for the reminder */
  custom_description: string | null;
  /** Personal message from leader to attendees */
  custom_message: string | null;
  /** Token expiration time (7 days from creation) */
  expires_at: string;
  created_at: string;
}

/**
 * Supabase Database type definition for the TypeScript client.
 * Used for typed queries and mutations.
 *
 * @example
 * ```typescript
 * import { createClient } from '@supabase/supabase-js';
 * import { Database } from './types/database';
 *
 * const supabase = createClient<Database>(url, key);
 * ```
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      groups: {
        Row: Group;
        Insert: Omit<Group, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Group, 'id' | 'created_at'>>;
      };
      group_members: {
        Row: GroupMember;
        Insert: Omit<GroupMember, 'id' | 'joined_at'>;
        Update: Partial<Omit<GroupMember, 'id'>>;
      };
      threads: {
        Row: Thread;
        Insert: Omit<Thread, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Thread, 'id' | 'created_at'>>;
      };
      thread_members: {
        Row: ThreadMember;
        Insert: Omit<ThreadMember, 'id' | 'joined_at'>;
        Update: Partial<Omit<ThreadMember, 'id'>>;
      };
      messages: {
        Row: Message;
        Insert: Omit<Message, 'id' | 'created_at'>;
        Update: Partial<Omit<Message, 'id' | 'created_at'>>;
      };
      meetings: {
        Row: Meeting;
        Insert: Omit<Meeting, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Meeting, 'id' | 'created_at'>>;
      };
      meeting_attendees: {
        Row: MeetingAttendee;
        Insert: Omit<MeetingAttendee, 'id' | 'invited_at'>;
        Update: Partial<Omit<MeetingAttendee, 'id'>>;
      };
      resources: {
        Row: Resource;
        Insert: Omit<Resource, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Resource, 'id' | 'created_at'>>;
      };
      resource_folders: {
        Row: ResourceFolder;
        Insert: Omit<ResourceFolder, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ResourceFolder, 'id' | 'created_at'>>;
      };
      resource_shares: {
        Row: ResourceShare;
        Insert: Omit<ResourceShare, 'id' | 'shared_at'>;
        Update: Partial<Omit<ResourceShare, 'id'>>;
      };
      hubspot_sync_state: {
        Row: HubSpotSyncState;
        Insert: Omit<HubSpotSyncState, 'id' | 'created_at'>;
        Update: Partial<Omit<HubSpotSyncState, 'id' | 'created_at'>>;
      };
      hubspot_files: {
        Row: HubSpotFile;
        Insert: Omit<HubSpotFile, 'id' | 'created_at'>;
        Update: Partial<Omit<HubSpotFile, 'id' | 'created_at'>>;
      };
      meeting_reminder_tokens: {
        Row: MeetingReminderToken;
        Insert: Omit<MeetingReminderToken, 'id' | 'created_at'>;
        Update: Partial<Omit<MeetingReminderToken, 'id' | 'created_at'>>;
      };
    };
  };
}
