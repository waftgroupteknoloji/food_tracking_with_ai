import { S3Client, DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';

let cached: S3Client | null = null;

function s3(): S3Client {
  if (cached) return cached;
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error('AWS_* environment değişkenleri tanımlı değil');
  }
  cached = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
  return cached;
}

function bucket(): string {
  const name = process.env.S3_BUCKET_NAME;
  if (!name) throw new Error('S3_BUCKET_NAME tanımlı değil');
  return name;
}

function publicBase(): string {
  const base = process.env.S3_PUBLIC_BASE_URL;
  if (base) return base.replace(/\/+$/, '');
  return `https://${bucket()}.s3.${process.env.AWS_REGION}.amazonaws.com`;
}

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export async function signUpload(params: {
  userId: string;
  folder: 'meals' | 'weight' | 'avatar';
  contentType: string;
}): Promise<{ key: string; uploadUrl: string; publicUrl: string }> {
  const ext = EXT_BY_TYPE[params.contentType] ?? 'jpg';
  const key = `users/${params.userId}/${params.folder}/${randomUUID()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: bucket(),
    Key: key,
    ContentType: params.contentType,
  });

  const uploadUrl = await getSignedUrl(s3(), command, { expiresIn: 300 });
  const publicUrl = `${publicBase()}/${key}`;
  return { key, uploadUrl, publicUrl };
}

export async function deleteObject(key: string): Promise<void> {
  try {
    await s3().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
  } catch (err) {
    // Silme hatası işlemi bloklamasın — log atılır, devam edilir
    console.error('[s3.deleteObject] failed:', key, err);
  }
}

export function isS3Configured(): boolean {
  return Boolean(
    process.env.AWS_REGION &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.S3_BUCKET_NAME,
  );
}
