import { addDaysToLocal, daysBetween } from './date';

export interface StreakState {
  current: number;
  longest: number;
  lastLogDate: string | null;
}

/**
 * Yeni bir log atıldığında streak state'ini günceller.
 * - Aynı gün log: değişmez
 * - Önceki gün log: current++
 * - Önceki gün dışında: current = 1 (sıfırlanmış)
 */
export function updateStreak(prev: StreakState, todayDate: string): StreakState {
  if (prev.lastLogDate === todayDate) return prev;

  let current: number;
  if (prev.lastLogDate === null) {
    current = 1;
  } else {
    const yesterday = addDaysToLocal(todayDate, -1);
    if (prev.lastLogDate === yesterday) {
      current = prev.current + 1;
    } else {
      current = 1;
    }
  }

  return {
    current,
    longest: Math.max(prev.longest, current),
    lastLogDate: todayDate,
  };
}

/**
 * Kullanıcının "şu an" streak değerini hesaplar.
 * Eğer son log bugün veya dün ise streak.current döner, değilse 0 döner.
 */
export function effectiveStreak(state: StreakState, todayDate: string): number {
  if (!state.lastLogDate) return 0;
  const diff = daysBetween(todayDate, state.lastLogDate);
  if (diff === 0 || diff === 1) return state.current;
  return 0;
}
