/**
 * AWS S3 Storage Provider Implementation (Template)
 * 
 * To use this:
 * 1. npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
 * 2. Add AWS credentials to your .env:
 *    - AWS_ACCESS_KEY_ID
 *    - AWS_SECRET_ACCESS_KEY
 *    - AWS_REGION
 *    - AWS_S3_BUCKET (optional, can use bucket param)
 * 3. Uncomment the implementation below
 * 4. Update src/lib/storage/index.ts to use AwsS3StorageProvider
 */

import {
  StorageProvider,
  UploadOptions,
  UploadResult,
  DownloadResult,
  DeleteResult,
  ListResult,
} from './types';

// Uncomment when ready to use AWS S3:
// import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
// import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export class AwsS3StorageProvider implements StorageProvider {
  // private client: S3Client;
  // private region: string;

  constructor() {
    // Uncomment and configure:
    // this.region = process.env.EXPO_PUBLIC_AWS_REGION || 'us-east-1';
    // this.client = new S3Client({
    //   region: this.region,
    //   credentials: {
    //     accessKeyId: process.env.EXPO_PUBLIC_AWS_ACCESS_KEY_ID!,
    //     secretAccessKey: process.env.EXPO_PUBLIC_AWS_SECRET_ACCESS_KEY!,
    //   },
    // });
  }

  getProviderName(): string {
    return 'aws-s3';
  }

  async upload(
    bucket: string,
    path: string,
    file: Blob | File | { uri: string; name: string; type: string },
    options?: UploadOptions
  ): Promise<UploadResult> {
    // Example implementation:
    // try {
    //   let body: Buffer | Blob;
    //   let contentType = options?.contentType;
    //
    //   if (file instanceof Blob || file instanceof File) {
    //     body = file;
    //     contentType = contentType || (file as File).type;
    //   } else {
    //     // For React Native, fetch the file
    //     const response = await fetch(file.uri);
    //     body = await response.blob();
    //     contentType = contentType || file.type;
    //   }
    //
    //   const command = new PutObjectCommand({
    //     Bucket: bucket,
    //     Key: path,
    //     Body: body,
    //     ContentType: contentType,
    //     Metadata: options?.metadata,
    //   });
    //
    //   await this.client.send(command);
    //   return { path };
    // } catch (error) {
    //   return { path: '', error: error as Error };
    // }

    throw new Error('AWS S3 provider not configured. See awsS3Storage.ts for setup instructions.');
  }

  async getDownloadUrl(
    bucket: string,
    path: string,
    expiresIn: number = 3600
  ): Promise<DownloadResult> {
    // Example implementation:
    // try {
    //   const command = new GetObjectCommand({
    //     Bucket: bucket,
    //     Key: path,
    //   });
    //
    //   const url = await getSignedUrl(this.client, command, { expiresIn });
    //   return {
    //     url,
    //     expiresAt: new Date(Date.now() + expiresIn * 1000),
    //   };
    // } catch (error) {
    //   return { url: '', error: error as Error };
    // }

    throw new Error('AWS S3 provider not configured. See awsS3Storage.ts for setup instructions.');
  }

  async delete(bucket: string, path: string): Promise<DeleteResult> {
    // Example implementation:
    // try {
    //   const command = new DeleteObjectCommand({
    //     Bucket: bucket,
    //     Key: path,
    //   });
    //
    //   await this.client.send(command);
    //   return { success: true };
    // } catch (error) {
    //   return { success: false, error: error as Error };
    // }

    throw new Error('AWS S3 provider not configured. See awsS3Storage.ts for setup instructions.');
  }

  async list(bucket: string, prefix?: string): Promise<ListResult> {
    // Example implementation:
    // try {
    //   const command = new ListObjectsV2Command({
    //     Bucket: bucket,
    //     Prefix: prefix,
    //   });
    //
    //   const response = await this.client.send(command);
    //   
    //   return {
    //     files: (response.Contents || []).map((item) => ({
    //       name: item.Key?.split('/').pop() || '',
    //       path: item.Key || '',
    //       size: item.Size,
    //       updatedAt: item.LastModified,
    //     })),
    //   };
    // } catch (error) {
    //   return { files: [], error: error as Error };
    // }

    throw new Error('AWS S3 provider not configured. See awsS3Storage.ts for setup instructions.');
  }
}

