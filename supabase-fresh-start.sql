-- ============================================
-- FRESH START - GROUP SCHEMA
-- Clean slate with "group" naming (no religious language)
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'leader', 'admin')),
  notification_preferences JSONB DEFAULT '{"messages": true, "meetings": true, "resources": true, "push_enabled": true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by authenticated users" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- ============================================
-- GROUPS TABLE
-- ============================================
CREATE TABLE groups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  code TEXT UNIQUE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- ============================================
-- GROUP MEMBERS TABLE
-- ============================================
CREATE TABLE group_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'leader-helper', 'leader', 'admin')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- ============================================
-- GROUP JOIN REQUESTS TABLE
-- ============================================
CREATE TABLE group_join_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE group_join_requests ENABLE ROW LEVEL SECURITY;

-- ============================================
-- THREADS TABLE
-- ============================================
CREATE TABLE threads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE threads ENABLE ROW LEVEL SECURITY;

-- ============================================
-- THREAD MEMBERS TABLE
-- ============================================
CREATE TABLE thread_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  thread_id UUID REFERENCES threads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(thread_id, user_id)
);

ALTER TABLE thread_members ENABLE ROW LEVEL SECURITY;

-- ============================================
-- MESSAGES TABLE
-- ============================================
CREATE TABLE messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  thread_id UUID REFERENCES threads(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  attachments TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- MEETINGS TABLE
-- ============================================
CREATE TABLE meetings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMPTZ NOT NULL,
  location TEXT,
  passages TEXT[] DEFAULT '{}',
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES threads(id) ON DELETE SET NULL,
  attachments TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  -- Series support for recurring events
  series_id UUID,
  series_index INTEGER,  -- 1, 2, 3... for display like "Event (1/4)"
  series_total INTEGER,  -- Total events in series
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_meetings_series_id ON meetings(series_id);

ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RESOURCE FOLDERS TABLE
-- ============================================
CREATE TABLE resource_folders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES resource_folders(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE resource_folders ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RESOURCES TABLE
-- ============================================
CREATE TABLE resources (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('document', 'link', 'video', 'other')),
  content TEXT,
  url TEXT,
  tags TEXT[] DEFAULT '{}',
  visibility TEXT NOT NULL DEFAULT 'all' CHECK (visibility IN ('all', 'leaders_only')),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES resource_folders(id) ON DELETE SET NULL,
  file_path TEXT,
  file_size INTEGER,
  mime_type TEXT,
  shared_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RESOURCE SHARES TABLE
-- ============================================
CREATE TABLE resource_shares (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  shared_with UUID REFERENCES profiles(id) ON DELETE CASCADE,
  shared_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE resource_shares ENABLE ROW LEVEL SECURITY;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);
CREATE INDEX idx_group_join_requests_group_id ON group_join_requests(group_id);
CREATE INDEX idx_group_join_requests_user_id ON group_join_requests(user_id);
CREATE INDEX idx_threads_group_id ON threads(group_id);
CREATE INDEX idx_thread_members_thread_id ON thread_members(thread_id);
CREATE INDEX idx_thread_members_user_id ON thread_members(user_id);
CREATE INDEX idx_messages_thread_id ON messages(thread_id);
CREATE INDEX idx_meetings_group_id ON meetings(group_id);
CREATE INDEX idx_resource_folders_group_id ON resource_folders(group_id);
CREATE INDEX idx_resource_folders_parent_id ON resource_folders(parent_id);
CREATE INDEX idx_resources_group_id ON resources(group_id);
CREATE INDEX idx_resources_folder_id ON resources(folder_id);

-- ============================================
-- TRIGGER: Update timestamps
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_threads_updated_at BEFORE UPDATE ON threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resource_folders_updated_at BEFORE UPDATE ON resource_folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON resources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TRIGGER: Auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- RLS POLICIES: GROUPS
-- ============================================
CREATE POLICY "View groups" ON groups
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (
      id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
      OR created_by = auth.uid()
    )
  );

CREATE POLICY "Create groups" ON groups
  FOR INSERT WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('leader', 'admin')
  );

CREATE POLICY "Update groups" ON groups
  FOR UPDATE USING (
    id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- RLS POLICIES: GROUP_MEMBERS
-- ============================================
CREATE POLICY "View group members" ON group_members
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Add group members" ON group_members
  FOR INSERT WITH CHECK (
    NOT EXISTS (SELECT 1 FROM group_members pm2 WHERE pm2.group_id = group_members.group_id)
    OR
    (SELECT role FROM group_members pm3 
     WHERE pm3.group_id = group_members.group_id 
       AND pm3.user_id = auth.uid()
     LIMIT 1) IN ('leader-helper', 'leader', 'admin')
  );

CREATE POLICY "Update group members" ON group_members
  FOR UPDATE USING (
    (SELECT role FROM group_members pm4 
     WHERE pm4.group_id = group_members.group_id 
       AND pm4.user_id = auth.uid()
     LIMIT 1) IN ('leader', 'admin')
  );

CREATE POLICY "Delete group members" ON group_members
  FOR DELETE USING (
    user_id = auth.uid()
    OR
    (SELECT role FROM group_members pm5 
     WHERE pm5.group_id = group_members.group_id 
       AND pm5.user_id = auth.uid()
     LIMIT 1) = 'admin'
  );

-- ============================================
-- RLS POLICIES: GROUP_JOIN_REQUESTS
-- ============================================
CREATE POLICY "Users view own join requests" ON group_join_requests
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Leaders view join requests" ON group_join_requests
  FOR SELECT USING (
    group_id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid() AND role IN ('leader-helper', 'leader', 'admin')
    )
  );

CREATE POLICY "Users can request to join" ON group_join_requests
  FOR INSERT WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Leaders can review requests" ON group_join_requests
  FOR UPDATE USING (
    group_id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid() AND role IN ('leader-helper', 'leader', 'admin')
    )
  );

-- ============================================
-- RLS POLICIES: THREADS
-- ============================================
CREATE POLICY "Users view threads in their group" ON threads
  FOR SELECT USING (
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Leaders create threads" ON threads
  FOR INSERT WITH CHECK (
    group_id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid() AND role IN ('leader-helper', 'leader', 'admin')
    )
  );

CREATE POLICY "Leaders update threads" ON threads
  FOR UPDATE USING (
    group_id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid() AND role IN ('leader', 'admin')
    )
  );

-- ============================================
-- RLS POLICIES: THREAD_MEMBERS
-- ============================================
CREATE POLICY "View thread members" ON thread_members
  FOR SELECT USING (
    thread_id IN (
      SELECT id FROM threads WHERE group_id IN (
        SELECT group_id FROM group_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Leaders add thread members" ON thread_members
  FOR INSERT WITH CHECK (
    thread_id IN (
      SELECT id FROM threads WHERE group_id IN (
        SELECT group_id FROM group_members 
        WHERE user_id = auth.uid() AND role IN ('leader-helper', 'leader', 'admin')
      )
    )
  );

-- ============================================
-- RLS POLICIES: MESSAGES
-- ============================================
CREATE POLICY "View messages in threads" ON messages
  FOR SELECT USING (
    thread_id IN (SELECT thread_id FROM thread_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Send messages" ON messages
  FOR INSERT WITH CHECK (
    thread_id IN (SELECT thread_id FROM thread_members WHERE user_id = auth.uid())
    AND sender_id = auth.uid()
  );

CREATE POLICY "Update own messages" ON messages
  FOR UPDATE USING (sender_id = auth.uid());

CREATE POLICY "Delete own messages" ON messages
  FOR DELETE USING (sender_id = auth.uid());

-- ============================================
-- RLS POLICIES: MEETINGS
-- ============================================
CREATE POLICY "View meetings in group" ON meetings
  FOR SELECT USING (
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Leaders create meetings" ON meetings
  FOR INSERT WITH CHECK (
    group_id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid() AND role IN ('leader-helper', 'leader', 'admin')
    )
  );

CREATE POLICY "Leaders update meetings" ON meetings
  FOR UPDATE USING (
    group_id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid() AND role IN ('leader', 'admin')
    )
  );

CREATE POLICY "Leaders delete meetings" ON meetings
  FOR DELETE USING (
    group_id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid() AND role IN ('leader', 'admin')
    )
  );

-- ============================================
-- RLS POLICIES: RESOURCE_FOLDERS
-- ============================================
CREATE POLICY "View resource folders" ON resource_folders
  FOR SELECT USING (
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Create resource folders" ON resource_folders
  FOR INSERT WITH CHECK (
    group_id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid() AND role IN ('leader-helper', 'leader', 'admin')
    )
  );

CREATE POLICY "Update resource folders" ON resource_folders
  FOR UPDATE USING (
    group_id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid() AND role IN ('leader-helper', 'leader', 'admin')
    )
  );

CREATE POLICY "Delete resource folders" ON resource_folders
  FOR DELETE USING (
    group_id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid() AND role IN ('leader', 'admin')
    )
  );

-- ============================================
-- RLS POLICIES: RESOURCES
-- ============================================
CREATE POLICY "View resources in group" ON resources
  FOR SELECT USING (
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
    AND (
      visibility = 'all'
      OR (
        visibility = 'leaders_only'
        AND group_id IN (
          SELECT group_id FROM group_members 
          WHERE user_id = auth.uid() AND role IN ('leader-helper', 'leader', 'admin')
        )
      )
    )
  );

CREATE POLICY "Leaders create resources" ON resources
  FOR INSERT WITH CHECK (
    group_id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid() AND role IN ('leader-helper', 'leader', 'admin')
    )
  );

CREATE POLICY "Leaders update resources" ON resources
  FOR UPDATE USING (
    group_id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid() AND role IN ('leader-helper', 'leader', 'admin')
    )
  );

CREATE POLICY "Leaders delete resources" ON resources
  FOR DELETE USING (
    group_id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid() AND role IN ('leader-helper', 'leader', 'admin')
    )
  );

-- ============================================
-- STORAGE BUCKET
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('resources', 'resources', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Users can view resource files" ON storage.objects;
DROP POLICY IF EXISTS "Leaders can upload resource files" ON storage.objects;
DROP POLICY IF EXISTS "Leaders can update resource files" ON storage.objects;
DROP POLICY IF EXISTS "Leaders can delete resource files" ON storage.objects;

CREATE POLICY "Users can view resource files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'resources'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Leaders can upload resource files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'resources'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Leaders can update resource files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'resources'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Leaders can delete resource files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'resources'
    AND auth.role() = 'authenticated'
  );

-- ============================================
-- RPC FUNCTIONS
-- ============================================

-- Request to join a group
CREATE OR REPLACE FUNCTION request_to_join_group(group_code TEXT)
RETURNS VOID AS $$
DECLARE
  target_group_id UUID;
BEGIN
  SELECT id INTO target_group_id FROM groups WHERE code = group_code;
  
  IF target_group_id IS NULL THEN
    RAISE EXCEPTION 'Invalid group code';
  END IF;
  
  INSERT INTO group_join_requests (group_id, user_id, status)
  VALUES (target_group_id, auth.uid(), 'pending')
  ON CONFLICT (group_id, user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Approve join request
CREATE OR REPLACE FUNCTION approve_join_request(request_id UUID)
RETURNS VOID AS $$
DECLARE
  req RECORD;
BEGIN
  SELECT * INTO req FROM group_join_requests WHERE id = request_id;
  
  IF req IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  
  -- Add user to group
  INSERT INTO group_members (group_id, user_id, role)
  VALUES (req.group_id, req.user_id, 'member');
  
  -- Update request status
  UPDATE group_join_requests
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = NOW()
  WHERE id = request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reject join request
CREATE OR REPLACE FUNCTION reject_join_request(request_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE group_join_requests
  SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = NOW()
  WHERE id = request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update member role
CREATE OR REPLACE FUNCTION update_member_role(member_id UUID, new_role TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE group_members
  SET role = new_role
  WHERE id = member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- REALTIME: Enable live updates
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE threads;
ALTER PUBLICATION supabase_realtime ADD TABLE thread_members;
ALTER PUBLICATION supabase_realtime ADD TABLE group_members;
ALTER PUBLICATION supabase_realtime ADD TABLE group_join_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE meetings;
ALTER PUBLICATION supabase_realtime ADD TABLE resources;

