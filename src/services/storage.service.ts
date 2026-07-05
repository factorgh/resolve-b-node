import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_BUCKET = process.env.R2_BUCKET || '';

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

const isProduction = process.env.NODE_ENV === 'production';

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
      if (isProduction) {
        console.error(`[R2 Storage Service] Upload failed: ${error.message}`);
        throw new Error('File upload failed. Storage service is unavailable.');
      }

      console.warn(`[R2 Storage Service] PutObject failed: ${error.message}. Using dev fallback URL.`);
      const publicUrl = process.env.R2_PUBLIC_URL || 'https://pub-dev.resolvebridge.local';
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
      throw new Error('Failed to generate secure download URL');
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
      throw error;
    }
  },
};
