import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { api } from './api';
import type { UploadFolder } from '@yemek-takip/validators';

export interface UploadResult {
  key: string;
  publicUrl: string;
  localUri: string;
}

export async function ensureMediaPermissions(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
}

export async function ensureCameraPermissions(): Promise<boolean> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  return status === 'granted';
}

export async function pickFromLibrary(): Promise<string | null> {
  const ok = await ensureMediaPermissions();
  if (!ok) throw new Error('Galeri izni reddedildi');
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.9,
    allowsEditing: false,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  return result.assets[0].uri;
}

export async function takePhoto(): Promise<string | null> {
  const ok = await ensureCameraPermissions();
  if (!ok) throw new Error('Kamera izni reddedildi');
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.9,
    allowsEditing: false,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  return result.assets[0].uri;
}

/**
 * Mobil: URI'yi resize/compress eder → presigned URL al → S3'e PUT.
 */
export async function uploadImageFromUri(
  uri: string,
  folder: UploadFolder,
): Promise<UploadResult> {
  // Resize ve compress (max 1600px, jpeg q=0.85)
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1600 } }],
    { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
  );

  const { key, uploadUrl, publicUrl } = await api.uploads.sign({
    folder,
    contentType: 'image/jpeg',
  });

  // RN'de fetch ile binary body PUT
  const blob = await (await fetch(manipulated.uri)).blob();
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg' },
    body: blob,
  });

  if (!res.ok) {
    throw new Error(`S3 yükleme başarısız (${res.status})`);
  }

  return { key, publicUrl, localUri: manipulated.uri };
}
