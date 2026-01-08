-- ============================================
-- RESOURCES V2 MIGRATION
-- Adds: Folders, file storage support
-- ============================================

-- ============================================
-- RESOURCE FOLDERS TABLE
-- ============================================
CREATE TABLE resource_folders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  parish_id UUID REFERENCES parishes(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES resource_folders(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE resource_folders ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ADD FOLDER_ID AND FILE FIELDS TO RESOURCES
-- ============================================
ALTER TABLE resources ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES resource_folders(id) ON DELETE SET NULL;
ALTER TABLE resources ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE resources ADD COLUMN IF NOT EXISTS file_size INTEGER;
ALTER TABLE resources ADD COLUMN IF NOT EXISTS mime_type TEXT;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_resource_folders_parish_id ON resource_folders(parish_id);
CREATE INDEX idx_resource_folders_parent_id ON resource_folders(parent_id);
CREATE INDEX idx_resources_folder_id ON resources(folder_id);

-- ============================================
-- RLS POLICIES FOR FOLDERS
-- ============================================

-- View folders in your parishes
CREATE POLICY "View resource folders" ON resource_folders
  FOR SELECT
  USING (
    parish_id IN (SELECT parish_id FROM parish_members WHERE user_id = auth.uid())
  );

-- Leaders can create folders
CREATE POLICY "Create resource folders" ON resource_folders
  FOR INSERT
  WITH CHECK (
    parish_id IN (
      SELECT parish_id FROM parish_members 
      WHERE user_id = auth.uid() AND role IN ('leader-helper', 'leader', 'admin')
    )
  );

-- Leaders can update folders
CREATE POLICY "Update resource folders" ON resource_folders
  FOR UPDATE
  USING (
    parish_id IN (
      SELECT parish_id FROM parish_members 
      WHERE user_id = auth.uid() AND role IN ('leader-helper', 'leader', 'admin')
    )
  );

-- Leaders can delete folders
CREATE POLICY "Delete resource folders" ON resource_folders
  FOR DELETE
  USING (
    parish_id IN (
      SELECT parish_id FROM parish_members 
      WHERE user_id = auth.uid() AND role IN ('leader', 'admin')
    )
  );

-- ============================================
-- TRIGGER: Update timestamps
-- ============================================
CREATE TRIGGER update_resource_folders_updated_at
  BEFORE UPDATE ON resource_folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STORAGE BUCKET SETUP
-- Run these commands in Supabase SQL Editor
-- Or set up via Dashboard > Storage
-- ============================================

-- Create the storage bucket for resources
INSERT INTO storage.buckets (id, name, public)
VALUES ('resources', 'resources', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can view resource files" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'resources'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Leaders can upload resource files" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'resources'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Leaders can update resource files" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'resources'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Leaders can delete resource files" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'resources'
    AND auth.role() = 'authenticated'
  );
