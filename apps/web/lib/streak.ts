import { User, type UserDoc } from '@/models/User';
import { updateStreak } from '@yemek-takip/utils';

/**
 * Bir log atıldıktan sonra streak'i günceller. localDate user TZ'sinde.
 */
export async function bumpStreak(userId: string, localDate: string): Promise<UserDoc | null> {
  const user = await User.findById(userId);
  if (!user) return null;

  const next = updateStreak(
    {
      current: user.streak?.current ?? 0,
      longest: user.streak?.longest ?? 0,
      lastLogDate: user.streak?.lastLogDate ?? null,
    },
    localDate,
  );

  user.streak = next;
  await user.save();
  return user;
}
