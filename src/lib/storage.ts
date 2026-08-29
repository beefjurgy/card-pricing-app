import "server-only";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!; // no trailing slash, e.g. https://pub-xxxxxxxx.r2.dev

// Same "<id>[-back].<ext>" naming scheme the old local-disk code used, kept
// identical so the one-time migration script can reuse existing
// public/uploads/* filenames as R2 keys verbatim.
export function imageKey(id: string, suffix: string, mimeType: string): string {
  const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  return `${id}${suffix}.${ext}`;
}

export async function uploadImage(file: File, key: string): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type || "application/octet-stream",
    })
  );
  return `${PUBLIC_URL}/${key}`;
}

export async function deleteImage(url: string): Promise<void> {
  if (!url) return;
  const key = url.startsWith(PUBLIC_URL) ? url.slice(PUBLIC_URL.length + 1) : url;
  try {
    await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch (err) {
    console.error("Failed to remove R2 image:", err);
  }
}
