import { DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const client = () =>
  new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    // SDK รุ่นใหม่ใส่ checksum (CRC32 ของไฟล์ว่าง) ลงใน presigned URL ทำให้ R2 ตอบ 403 เมื่อส่งไฟล์จริง → ใช้เฉพาะตอนที่จำเป็น
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
    },
  });

export const ALLOWED_TYPES = ['image/webp', 'image/jpeg', 'image/png', 'image/avif'] as const;
/** ทุกไฟล์ของโปรเจ็คอยู่ใต้ path นี้ใน bucket */
const PREFIX = 'drone_lukhamhan';
/** ไฟล์ผ่านเซิร์ฟเวอร์ของเรา (เหมือน dekgp) จึงไม่ต้องตั้ง CORS ที่ bucket · 4 MB เพื่อไม่ชนลิมิตของ serverless */
export const MAX_BYTES = 4 * 1024 * 1024;

/** อัปโหลดรูปจากเซิร์ฟเวอร์ตรงไป R2 แล้วคืน URL สาธารณะ */
export async function putImage(folder: string, contentType: string, body: Uint8Array) {
  const ext = contentType.split('/')[1];
  const key = `${PREFIX}/${folder}/${crypto.randomUUID()}.${ext}`;
  await client().send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key, Body: body, ContentType: contentType, CacheControl: 'public, max-age=31536000, immutable' }));
  return { publicUrl: `${process.env.R2_PUBLIC_URL}/${key}`, key };
}

export type MediaItem = { key: string; url: string; size: number; modified: string; folder: string };

/** รายการรูปทั้งหมดใต้ path ของโปรเจ็ค (ล่าสุดก่อน) */
export async function listImages(): Promise<MediaItem[]> {
  const out: MediaItem[] = [];
  let token: string | undefined;
  do {
    const r = await client().send(new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET_NAME, Prefix: `${PREFIX}/`, ContinuationToken: token }));
    for (const o of r.Contents ?? []) {
      if (!o.Key || o.Key.endsWith('/')) continue;
      out.push({ key: o.Key, url: `${process.env.R2_PUBLIC_URL}/${o.Key}`, size: o.Size ?? 0, modified: (o.LastModified ?? new Date(0)).toISOString(), folder: o.Key.split('/')[1] ?? '' });
    }
    token = r.IsTruncated ? r.NextContinuationToken : undefined;
  } while (token);
  return out.sort((a, b) => b.modified.localeCompare(a.modified));
}

export async function deleteImage(key: string) {
  if (!key.startsWith(`${PREFIX}/`) || key.includes('..')) throw new Error('key ไม่ถูกต้อง');
  await client().send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }));
}

/** อ่านรูปจาก bucket ผ่านเซิร์ฟเวอร์ (ใช้ตอนครอบตัดรูปเดิมใหม่ เลี่ยงปัญหา CORS) */
export async function readImage(url: string) {
  const base = `${process.env.R2_PUBLIC_URL}/`;
  if (!url.startsWith(base)) throw new Error('ไม่ใช่รูปของชมรม');
  const key = decodeURIComponent(url.slice(base.length));
  if (!key.startsWith(`${PREFIX}/`) || key.includes('..')) throw new Error('key ไม่ถูกต้อง');
  const r = await client().send(new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }));
  return { body: await r.Body!.transformToByteArray(), type: r.ContentType ?? 'image/webp' };
}
