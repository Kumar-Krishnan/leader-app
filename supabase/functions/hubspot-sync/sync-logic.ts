/**
 * HubSpot file sync business logic
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { HubSpotClient, HubSpotFile } from './hubspot-api.ts';

export interface SyncResult {
  synced: number;
  skipped: number;
  failed: number;
  errors: string[];
}

export interface SyncState {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  files_synced: number;
  files_skipped: number;
  files_failed: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
}

/**
 * Get the MIME type based on file extension
 */
function getMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',
    csv: 'text/csv',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    mp4: 'video/mp4',
    mp3: 'audio/mpeg',
    zip: 'application/zip',
  };
  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
}

/**
 * Sanitize filename for storage path (remove special characters)
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[[\](){}]/g, '') // Remove brackets and parentheses
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace other special chars with underscore
    .replace(/_+/g, '_') // Collapse multiple underscores
    .replace(/^_|_$/g, ''); // Trim underscores from start/end
}

/**
 * Get the resource type based on MIME type
 */
function getResourceType(mimeType: string): 'document' | 'video' | 'link' | 'other' {
  if (mimeType.startsWith('video/')) return 'video';
  if (
    mimeType.includes('pdf') ||
    mimeType.includes('document') ||
    mimeType.includes('sheet') ||
    mimeType.includes('presentation') ||
    mimeType.startsWith('text/')
  ) {
    return 'document';
  }
  return 'other';
}

/**
 * Check if a file should be skipped (already exists or was deleted)
 * Returns: 'exists' | 'deleted' | 'new'
 */
async function checkFileStatus(
  supabase: SupabaseClient,
  file: HubSpotFile,
  groupId: string,
  folderId: string | null
): Promise<'exists' | 'deleted' | 'new'> {
  // Check tracking table first (by HubSpot file ID)
  const { data: tracked } = await supabase
    .from('hubspot_files')
    .select('resource_id, sync_status')
    .eq('hubspot_file_id', file.id)
    .single();

  if (tracked) {
    // File was previously synced then deleted by user - don't re-sync
    if (tracked.sync_status === 'deleted') {
      console.log(`File ${file.name} was deleted by user, skipping`);
      return 'deleted';
    }
    // File still exists
    if (tracked.resource_id) {
      console.log(`File ${file.name} already tracked with HubSpot ID ${file.id}`);
      return 'exists';
    }
  }

  // Fallback: check by name AND size in target location
  const { data: existing } = await supabase
    .from('resources')
    .select('id')
    .eq('group_id', groupId)
    .eq('folder_id', folderId)
    .eq('title', file.name)
    .eq('file_size', file.size)
    .single();

  if (existing) {
    console.log(`File ${file.name} exists with matching name and size`);
    return 'exists';
  }

  return 'new';
}

/**
 * Get or create the "HubSpot Resources" folder in the HubSpot group
 */
async function getOrCreateHubSpotFolder(
  supabase: SupabaseClient,
  groupId: string
): Promise<string> {
  const folderName = 'HubSpot Resources';

  // Check if folder exists
  const { data: existing } = await supabase
    .from('resource_folders')
    .select('id')
    .eq('group_id', groupId)
    .eq('name', folderName)
    .is('parent_id', null)
    .single();

  if (existing) {
    return existing.id;
  }

  // Create folder
  const { data: created, error } = await supabase
    .from('resource_folders')
    .insert({
      name: folderName,
      group_id: groupId,
      parent_id: null,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create HubSpot folder: ${error.message}`);
  }

  return created.id;
}

/**
 * Upload a file to Supabase Storage and create resource record
 */
async function syncFile(
  supabase: SupabaseClient,
  hubspot: HubSpotClient,
  file: HubSpotFile,
  groupId: string,
  folderId: string
): Promise<void> {
  // Get signed download URL from HubSpot
  const downloadUrl = await hubspot.getSignedUrl(file.id);

  // Download the file
  const blob = await hubspot.downloadFile(downloadUrl);

  // Generate storage path with sanitized filename
  const sanitizedName = sanitizeFilename(file.name);
  const storagePath = `hubspot/${groupId}/${file.id}-${sanitizedName}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('resources')
    .upload(storagePath, blob, {
      contentType: getMimeType(file.extension),
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  // Create resource record
  const mimeType = getMimeType(file.extension);
  const { data: resource, error: resourceError } = await supabase
    .from('resources')
    .insert({
      title: file.name,
      type: getResourceType(mimeType),
      group_id: groupId,
      folder_id: folderId,
      file_path: storagePath,
      file_size: file.size,
      mime_type: mimeType,
      tags: ['hubspot', 'synced'],
      visibility: 'all',
      shared_by: null, // System sync, no specific user
    })
    .select('id')
    .single();

  if (resourceError) {
    // Clean up uploaded file if resource creation fails
    await supabase.storage.from('resources').remove([storagePath]);
    throw new Error(`Resource creation failed: ${resourceError.message}`);
  }

  // Track the file mapping
  const { error: trackError } = await supabase
    .from('hubspot_files')
    .insert({
      hubspot_file_id: file.id,
      hubspot_file_name: file.name,
      hubspot_file_size: file.size,
      hubspot_file_url: file.url,
      resource_id: resource.id,
      sync_status: 'synced',
    });

  if (trackError) {
    console.warn(`Failed to track file mapping: ${trackError.message}`);
    // Don't fail the sync for tracking errors
  }
}

/**
 * Create a new sync state record
 */
async function createSyncState(supabase: SupabaseClient): Promise<string> {
  const { data, error } = await supabase
    .from('hubspot_sync_state')
    .insert({
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create sync state: ${error.message}`);
  }

  return data.id;
}

/**
 * Update sync state with results
 */
async function updateSyncState(
  supabase: SupabaseClient,
  syncId: string,
  result: SyncResult,
  status: 'completed' | 'failed',
  errorMessage?: string
): Promise<void> {
  await supabase
    .from('hubspot_sync_state')
    .update({
      status,
      files_synced: result.synced,
      files_skipped: result.skipped,
      files_failed: result.failed,
      error_message: errorMessage || (result.errors.length > 0 ? result.errors.join('; ') : null),
      completed_at: new Date().toISOString(),
      last_sync_at: new Date().toISOString(),
    })
    .eq('id', syncId);
}

/**
 * Main sync function
 */
export async function syncHubSpotFiles(
  supabaseUrl: string,
  supabaseServiceKey: string,
  hubspotToken: string
): Promise<SyncResult> {
  // Initialize clients with service role key for admin access
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
  const hubspot = new HubSpotClient(hubspotToken);

  const result: SyncResult = {
    synced: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  // Create sync state record
  const syncId = await createSyncState(supabase);

  try {
    // Get HubSpot group ID
    const { data: groupData, error: groupError } = await supabase
      .rpc('get_hubspot_group_id');

    if (groupError || !groupData) {
      throw new Error('HubSpot group not found. Run the migration first.');
    }

    const groupId = groupData;

    // Get or create the HubSpot Resources folder
    const folderId = await getOrCreateHubSpotFolder(supabase, groupId);

    // Fetch all files from HubSpot
    console.log('Fetching files from HubSpot...');
    const files = await hubspot.getAllFiles();
    console.log(`Found ${files.length} files in HubSpot`);

    // Process each file
    for (const file of files) {
      try {
        // Check file status (exists, deleted, or new)
        const status = await checkFileStatus(supabase, file, groupId, folderId);

        if (status === 'exists' || status === 'deleted') {
          result.skipped++;
          continue;
        }

        // Sync the file
        console.log(`Syncing file: ${file.name}`);
        await syncFile(supabase, hubspot, file, groupId, folderId);
        result.synced++;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Failed to sync ${file.name}: ${message}`);
        result.failed++;
        result.errors.push(`${file.name}: ${message}`);

        // Track failed file
        await supabase
          .from('hubspot_files')
          .upsert({
            hubspot_file_id: file.id,
            hubspot_file_name: file.name,
            hubspot_file_size: file.size,
            sync_status: 'failed',
          }, {
            onConflict: 'hubspot_file_id',
          });
      }
    }

    // Update sync state with success
    await updateSyncState(supabase, syncId, result, 'completed');

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.errors.push(message);
    await updateSyncState(supabase, syncId, result, 'failed', message);
    throw error;
  }

  return result;
}
