/**
 * Storage Provider Interface
 * Implement this interface to add new storage backends (S3, Azure, GCS, etc.)
 */

export interface UploadOptions {
  contentType?: string;
  cacheControl?: string;
  metadata?: Record<string, string>;
}

export interface UploadResult {
  path: string;
  url?: string;
  error?: Error;
}

export interface DownloadResult {
  url: string;
  expiresAt?: Date;
  error?: Error;
}

export interface DeleteResult {
  success: boolean;
  error?: Error;
}

export interface ListResult {
  files: StorageFile[];
  error?: Error;
}

export interface StorageFile {
  name: string;
  path: string;
  size?: number;
  mimeType?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface StorageProvider {
  /**
   * Upload a file to storage
   * @param bucket - The bucket/container name
   * @param path - The file path within the bucket
   * @param file - File data (Blob, File, or URI for React Native)
   * @param options - Upload options
   */
  upload(
    bucket: string,
    path: string,
    file: Blob | File | { uri: string; name: string; type: string },
    options?: UploadOptions
  ): Promise<UploadResult>;

  /**
   * Get a signed/public URL for downloading a file
   * @param bucket - The bucket/container name
   * @param path - The file path within the bucket
   * @param expiresIn - URL expiration in seconds (for signed URLs)
   */
  getDownloadUrl(
    bucket: string,
    path: string,
    expiresIn?: number
  ): Promise<DownloadResult>;

  /**
   * Delete a file from storage
   * @param bucket - The bucket/container name
   * @param path - The file path within the bucket
   */
  delete(bucket: string, path: string): Promise<DeleteResult>;

  /**
   * List files in a bucket/folder
   * @param bucket - The bucket/container name
   * @param prefix - Optional folder prefix
   */
  list(bucket: string, prefix?: string): Promise<ListResult>;

  /**
   * Get the provider name (for logging/debugging)
   */
  getProviderName(): string;
}

