'use client';

import imageCompression from 'browser-image-compression';
import { api } from './api';
import type { UploadFolder } from '@yemek-takip/validators';

export interface UploadResult {
  key: string;
  publicUrl: string;
}

/**
 * Web: dosyayı sıkıştırır → presigned URL al → S3'e PUT.
 */
export async function uploadImage(
  file: File,
  folder: UploadFolder,
): Promise<UploadResult> {
  const compressed = await imageCompression(file, {
    maxSizeMB: 1.5,
    maxWidthOrHeight: 1600,
    fileType: 'image/jpeg',
    useWebWorker: true,
  });

  const { key, uploadUrl, publicUrl } = await api.uploads.sign({
    folder,
    contentType: 'image/jpeg',
  });

  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg' },
    body: compressed,
  });

  if (!res.ok) {
    throw new Error(`S3 yükleme başarısız (${res.status})`);
  }

  return { key, publicUrl };
}
