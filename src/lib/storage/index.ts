/**
 * Storage Module
 * 
 * This module provides an abstraction layer for file storage.
 * To switch providers, simply change the import and instantiation below.
 * 
 * Current provider: Supabase Storage
 * 
 * To switch to AWS S3:
 * 1. Follow setup instructions in awsS3Storage.ts
 * 2. Change the import and export below:
 *    import { AwsS3StorageProvider } from './awsS3Storage';
 *    export const storage = new AwsS3StorageProvider();
 */

import { StorageProvider } from './types';
import { SupabaseStorageProvider } from './supabaseStorage';
// import { AwsS3StorageProvider } from './awsS3Storage';

// Change this line to switch storage providers
export const storage: StorageProvider = new SupabaseStorageProvider();
// export const storage: StorageProvider = new AwsS3StorageProvider();

// Re-export types for convenience
export * from './types';

// Default bucket name for resources
export const RESOURCES_BUCKET = 'resources';

/**
 * Helper function to generate a unique file path
 */
export function generateFilePath(
  parishId: string,
  fileName: string,
  folder?: string
): string {
  const timestamp = Date.now();
  const ext = fileName.split('.').pop() || 'bin';
  const safeName = fileName
    .replace(/\.[^/.]+$/, '') // Remove extension
    .replace(/[^a-zA-Z0-9]/g, '_') // Replace special chars
    .substring(0, 50); // Limit length
  
  const basePath = folder 
    ? `${parishId}/${folder}` 
    : parishId;
  
  return `${basePath}/${timestamp}_${safeName}.${ext}`;
}

/**
 * Helper to get file extension from mime type
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const mimeMap: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'text/plain': 'txt',
    'text/csv': 'csv',
  };
  
  return mimeMap[mimeType] || 'bin';
}

