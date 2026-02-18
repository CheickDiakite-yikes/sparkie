import { Client } from '@replit/object-storage';

const bucketId =
  process.env.REPLIT_OBJECT_STORAGE_BUCKET_ID ||
  process.env.OBJECT_STORAGE_BUCKET_ID ||
  undefined;

export function createObjectStorageClient() {
  return new Client(bucketId ? { bucketId } : undefined);
}

