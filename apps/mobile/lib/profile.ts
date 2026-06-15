import type { PublicUser } from '@yemek-takip/validators';

/**
 * Kalori hesabı (BMR/TDEE) ve hedef takibi için gereken çekirdek profil
 * alanları. Bunlardan biri eksikse kullanıcı onboarding'e yönlendirilir.
 */
export function isProfileComplete(user: PublicUser | null | undefined): boolean {
  const p = user?.profile;
  if (!p) return false;
  return Boolean(
    p.sex && p.heightCm && p.birthDate && p.goalWeightKg && p.activityLevel,
  );
}
