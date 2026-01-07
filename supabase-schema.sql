-- Leader App Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'leader', 'admin')),
  notification_preferences JSONB DEFAULT '{"messages": true, "meetings": true, "resources": true, "push_enabled": true}'::jsonb,
  hubspot_contact_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- THREADS TABLE (Group Chats)
-- ============================================
CREATE TABLE threads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE threads ENABLE ROW LEVEL SECURITY;

-- Thread members table
CREATE TABLE thread_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  thread_id UUID REFERENCES threads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(thread_id, user_id)
);

ALTER TABLE thread_members ENABLE ROW LEVEL SECURITY;

-- Policies for threads
CREATE POLICY "Members can view their threads" ON threads FOR SELECT
  USING (id IN (SELECT thread_id FROM thread_members WHERE user_id = auth.uid()));

CREATE POLICY "Leaders can create threads" ON threads FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leader', 'admin')));

CREATE POLICY "Leaders can update threads" ON threads FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leader', 'admin')));

-- Policies for thread_members
CREATE POLICY "Members can view thread members" ON thread_members FOR SELECT
  USING (thread_id IN (SELECT thread_id FROM thread_members WHERE user_id = auth.uid()));

CREATE POLICY "Leaders can add members" ON thread_members FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leader', 'admin')));

CREATE POLICY "Leaders can remove members" ON thread_members FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leader', 'admin')));

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

-- Policies for messages
CREATE POLICY "Members can view thread messages" ON messages FOR SELECT
  USING (thread_id IN (SELECT thread_id FROM thread_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can send messages" ON messages FOR INSERT
  WITH CHECK (
    thread_id IN (SELECT thread_id FROM thread_members WHERE user_id = auth.uid())
    AND sender_id = auth.uid()
  );

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
  thread_id UUID REFERENCES threads(id) ON DELETE SET NULL,
  attachments TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- Policies for meetings
CREATE POLICY "Anyone can view meetings" ON meetings FOR SELECT USING (true);

CREATE POLICY "Leaders can create meetings" ON meetings FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leader', 'admin')));

CREATE POLICY "Leaders can update meetings" ON meetings FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leader', 'admin')));

CREATE POLICY "Leaders can delete meetings" ON meetings FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leader', 'admin')));

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
  shared_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- Policies for resources
CREATE POLICY "Users can view public resources" ON resources FOR SELECT
  USING (
    visibility = 'all'
    OR (visibility = 'leaders_only' AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leader', 'admin')
    ))
  );

CREATE POLICY "Leaders can create resources" ON resources FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leader', 'admin')));

CREATE POLICY "Leaders can update resources" ON resources FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leader', 'admin')));

CREATE POLICY "Leaders can delete resources" ON resources FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leader', 'admin')));

-- ============================================
-- RESOURCE SHARES TABLE (Leader to Leader sharing)
-- ============================================
CREATE TABLE resource_shares (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  shared_with UUID REFERENCES profiles(id) ON DELETE CASCADE,
  shared_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(resource_id, shared_with)
);

ALTER TABLE resource_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leaders can view their shared resources" ON resource_shares FOR SELECT
  USING (
    shared_with = auth.uid()
    OR resource_id IN (SELECT id FROM resources WHERE shared_by = auth.uid())
  );

CREATE POLICY "Leaders can share resources" ON resource_shares FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('leader', 'admin')));

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_threads_updated_at
  BEFORE UPDATE ON threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meetings_updated_at
  BEFORE UPDATE ON meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resources_updated_at
  BEFORE UPDATE ON resources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- ============================================
-- Enable realtime for messages (for live chat)
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE threads;
ALTER PUBLICATION supabase_realtime ADD TABLE thread_members;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_messages_thread_id ON messages(thread_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_thread_members_user_id ON thread_members(user_id);
CREATE INDEX idx_thread_members_thread_id ON thread_members(thread_id);
CREATE INDEX idx_meetings_date ON meetings(date);
CREATE INDEX idx_resources_visibility ON resources(visibility);
CREATE INDEX idx_resources_tags ON resources USING GIN(tags);


