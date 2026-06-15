import 'server-only';
import { cookies } from 'next/headers';
import { verifyAccessToken } from './auth';
import { ACCESS_COOKIE } from './cookies';
import { connectMongo } from './mongoose';
import { User } from '@/models/User';
import type { UserProfile } from '@yemek-takip/validators';

/**
 * Server component'lerde (layout / page) oturum sahibinin profilini DB'den okur.
 * Onboarding gating'i için kullanılır. Token yoksa/geçersizse null döner.
 */
export async function getCurrentUserProfile() {
  const c = await cookies();
  const token = c.get(ACCESS_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifyAccessToken(token);
  if (!payload) return null;

  await connectMongo();
  const user = await User.findById(payload.userId).lean();
  // Mongoose lean() opsiyonel alanları null verebilir; tüketiciler için
  // Partial<UserProfile> (null yerine undefined) olarak normalize ediyoruz.
  return (user?.profile ?? null) as Partial<UserProfile> | null;
}
