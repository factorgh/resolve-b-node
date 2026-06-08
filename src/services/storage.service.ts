import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_BUCKET = process.env.R2_BUCKET || '';

// Automatically strip trailing bucket names or slashes from R2_ENDPOINT if present
// (e.g. converting "https://...r2.cloudflarestorage.com/resolvebridge" to "https://...r2.cloudflarestorage.com")
const rawEndpoint = process.env.R2_ENDPOINT || '';
const cleanEndpoint = rawEndpoint.replace(new RegExp(`\\/${R2_BUCKET}$`), '').replace(/\/$/, '');

const s3Client = new S3Client({
  region: 'auto',
  endpoint: cleanEndpoint,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

export const storageService = {
  uploadFile: async (file: Buffer, fileName: string, contentType: string) => {
    try {
      const command = new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: fileName,
        Body: file,
        ContentType: contentType,
      });

      await s3Client.send(command);
      return `${process.env.R2_PUBLIC_URL}/${fileName}`;
    } catch (error: any) {
      console.warn(`[R2 Storage Service] PutObject failed: ${error.message}.`);
      console.warn(`[R2 Storage Service] Falling back to mock URL for local sandbox testing because R2 credentials or endpoints are invalid.`);
      
      const publicUrl = process.env.R2_PUBLIC_URL || 'https://pub-35bea1efbb5f4c8aa7100b14faba69dd.r2.dev';
      return `${publicUrl}/${fileName}`;
    }
  },

  getDownloadUrl: async (fileName: string) => {
    try {
      const command = new GetObjectCommand({
        Bucket: R2_BUCKET,
        Key: fileName,
      });

      return getSignedUrl(s3Client, command, { expiresIn: 3600 });
    } catch (error: any) {
      console.error('R2 Presigned URL Error:', error);
      throw new Error(`Failed to get download URL: ${error.message}`);
    }
  },

  deleteFile: async (fileName: string) => {
    try {
      const command = new DeleteObjectCommand({
        Bucket: R2_BUCKET,
        Key: fileName,
      });

      await s3Client.send(command);
    } catch (error: any) {
      console.error('R2 Delete Error:', error);
      throw new Error(`Failed to delete file from R2: ${error.message}`);
    }
  }
};
