import type { UserProfile } from '@yemek-takip/validators';

/**
 * Kalori hesabı (BMR/TDEE) ve hedef takibi için gereken çekirdek profil
 * alanları. Bunlardan biri eksikse kullanıcı onboarding'e yönlendirilir.
 */
export function isProfileComplete(
  profile: Partial<UserProfile> | null | undefined,
): boolean {
  if (!profile) return false;
  return Boolean(
    profile.sex &&
      profile.heightCm &&
      profile.birthDate &&
      profile.goalWeightKg &&
      profile.activityLevel,
  );
}
