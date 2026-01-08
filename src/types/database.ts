export type UserRole = 'user' | 'leader' | 'admin';
export type ParishRole = 'member' | 'leader-helper' | 'leader' | 'admin';
export type JoinRequestStatus = 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  notification_preferences: NotificationPreferences;
  hubspot_contact_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  messages: boolean;
  meetings: boolean;
  resources: boolean;
  push_enabled: boolean;
}

export interface Parish {
  id: string;
  name: string;
  description: string | null;
  code: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParishMember {
  id: string;
  parish_id: string;
  user_id: string;
  role: ParishRole;
  joined_at: string;
}

export interface ParishMemberWithDetails extends ParishMember {
  parish?: Parish;
  user?: Profile;
}

export interface Thread {
  id: string;
  name: string;
  parish_id: string;
  created_by: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface ThreadMember {
  id: string;
  thread_id: string;
  user_id: string;
  joined_at: string;
}

export interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  attachments: string[];
  created_at: string;
}

export interface Meeting {
  id: string;
  title: string;
  description: string | null;
  date: string;
  location: string | null;
  passages: string[];
  parish_id: string;
  thread_id: string | null;
  attachments: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ResourceFolder {
  id: string;
  name: string;
  parish_id: string;
  parent_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Resource {
  id: string;
  title: string;
  type: 'document' | 'link' | 'video' | 'other';
  content: string | null;
  url: string | null;
  tags: string[];
  visibility: 'all' | 'leaders_only';
  parish_id: string;
  folder_id: string | null;
  file_path: string | null;
  file_size: number | null;
  mime_type: string | null;
  shared_by: string;
  created_at: string;
  updated_at: string;
}

export interface ResourceShare {
  id: string;
  resource_id: string;
  shared_with: string;
  shared_at: string;
}

export interface ParishJoinRequest {
  id: string;
  parish_id: string;
  user_id: string;
  status: JoinRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface ParishJoinRequestWithDetails extends ParishJoinRequest {
  user?: Profile;
  parish?: Parish;
}

// Supabase Database type for client
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      parishes: {
        Row: Parish;
        Insert: Omit<Parish, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Parish, 'id' | 'created_at'>>;
      };
      parish_members: {
        Row: ParishMember;
        Insert: Omit<ParishMember, 'id' | 'joined_at'>;
        Update: Partial<Omit<ParishMember, 'id'>>;
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
    };
  };
}
