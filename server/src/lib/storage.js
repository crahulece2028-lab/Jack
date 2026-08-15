import { randomUUID } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { del } from '@vercel/blob';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.join(__dirname, '..', '..');

const EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

function uploadsDir() {
  return path.isAbsolute(process.env.UPLOAD_DIR || '')
    ? process.env.UPLOAD_DIR
    : path.join(SERVER_ROOT, process.env.UPLOAD_DIR || 'uploads');
}

function isS3() {
  return process.env.STORAGE_DRIVER === 's3';
}

/** True when files live in Vercel Blob (uploads happen directly from the browser). */
export function isBlob() {
  return process.env.STORAGE_DRIVER === 'vercel-blob';
}

let s3Client;

function s3() {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.S3_REGION || 'us-east-1',
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: process.env.S3_ENDPOINT ? true : undefined,
      credentials:
        process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
          ? {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            }
          : undefined,
    });
  }
  return s3Client;
}

function bucket() {
  if (!process.env.S3_BUCKET) {
    throw new Error('S3_BUCKET environment variable is required when STORAGE_DRIVER=s3');
  }
  return process.env.S3_BUCKET;
}

/** Save a binary buffer and return its storage key. */
export async function save(buffer, mime) {
  const ext = EXT[mime] || '.jpg';
  const key = `notes/${randomUUID()}${ext}`;

  if (isBlob()) {
    throw new Error('Vercel Blob uploads must go through the client');
  }

  if (isS3()) {
    await s3().send(
      new PutObjectCommand({ Bucket: bucket(), Key: key, Body: buffer, ContentType: mime })
    );
    return key;
  }

  const dir = uploadsDir();
  mkdirSync(path.join(dir, path.dirname(key)), { recursive: true });
  writeFileSync(path.join(dir, key), buffer);
  return key;
}

/** Open a readable stream for a stored key. */
export async function createStream(key) {
  if (isBlob()) {
    throw new Error('Blob images are served directly from Vercel, not streamed');
  }
  if (isS3()) {
    const cmd = new GetObjectCommand({ Bucket: bucket(), Key: key });
    const res = await s3().send(cmd);
    return res.Body;
  }
  const full = path.join(uploadsDir(), key);
  if (!existsSync(full)) {
    const err = new Error('File not found');
    err.status = 404;
    throw err;
  }
  return createReadStream(full);
}

/** Permanently delete a stored key (or Vercel Blob pathname). */
export async function remove(key) {
  if (isBlob()) {
    try {
      await del(key);
    } catch {
      // Best-effort delete; orphaned blobs are harmless.
    }
    return;
  }
  if (isS3()) {
    try {
      await s3().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
    } catch {
      // Best-effort delete; orphaned objects are harmless.
    }
    return;
  }
  const full = path.join(uploadsDir(), key);
  if (existsSync(full)) rmSync(full);
}

/** True when files live on the local disk. */
export const usesLocalDisk = () => !isS3() && !isBlob();
