/**
 * Supabase Storage Provider Implementation
 */

import { Platform } from 'react-native';
import { supabase } from '../supabase';
import {
  StorageProvider,
  UploadOptions,
  UploadResult,
  DownloadResult,
  DeleteResult,
  ListResult,
} from './types';

export class SupabaseStorageProvider implements StorageProvider {
  getProviderName(): string {
    return 'supabase';
  }

  async upload(
    bucket: string,
    path: string,
    file: Blob | File | { uri: string; name: string; type: string },
    options?: UploadOptions
  ): Promise<UploadResult> {
    try {
      let uploadData: Blob | File | { uri: string; name: string; type: string };
      
      // Handle different file input types
      if (file instanceof Blob || file instanceof File) {
        uploadData = file;
      } else if (Platform.OS === 'web') {
        // On web, fetch the URI and convert to blob
        const response = await fetch(file.uri);
        uploadData = await response.blob();
      } else {
        // On native, pass the file object directly
        uploadData = file as any;
      }

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, uploadData, {
          contentType: options?.contentType,
          cacheControl: options?.cacheControl || '3600',
          upsert: options?.upsert ?? false,
        });

      if (error) {
        return { path: '', error: new Error(error.message) };
      }

      return { path: data.path };
    } catch (error) {
      return { path: '', error: error as Error };
    }
  }

  async getDownloadUrl(
    bucket: string,
    path: string,
    expiresIn: number = 3600
  ): Promise<DownloadResult> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

      if (error) {
        return { url: '', error: new Error(error.message) };
      }

      return {
        url: data.signedUrl,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
      };
    } catch (error) {
      return { url: '', error: error as Error };
    }
  }

  async delete(bucket: string, path: string): Promise<DeleteResult> {
    try {
      const { error } = await supabase.storage.from(bucket).remove([path]);

      if (error) {
        return { success: false, error: new Error(error.message) };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  getPublicUrl(bucket: string, path: string): { url: string } {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return { url: data.publicUrl };
  }

  async list(bucket: string, prefix?: string): Promise<ListResult> {
    try {
      const { data, error } = await supabase.storage.from(bucket).list(prefix);

      if (error) {
        return { files: [], error: new Error(error.message) };
      }

      return {
        files: (data || []).map((file) => ({
          name: file.name,
          path: prefix ? `${prefix}/${file.name}` : file.name,
          size: file.metadata?.size,
          mimeType: file.metadata?.mimetype,
          createdAt: file.created_at ? new Date(file.created_at) : undefined,
          updatedAt: file.updated_at ? new Date(file.updated_at) : undefined,
        })),
      };
    } catch (error) {
      return { files: [], error: error as Error };
    }
  }
}

