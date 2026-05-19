import type { ActivityLevel, Sex } from '@yemek-takip/validators';

/**
 * Mifflin-St Jeor formülü ile BMR hesaplar.
 * Kalori (kcal/gün) — dinlenme metabolik hızı.
 */
export function calculateBMR(params: {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  sex: Sex;
}): number {
  const { weightKg, heightCm, ageYears, sex } = params;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  if (sex === 'male') return Math.round(base + 5);
  if (sex === 'female') return Math.round(base - 161);
  return Math.round(base - 78); // other: ortalama
}

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
};

/**
 * BMR × aktivite çarpanı = Toplam Günlük Enerji İhtiyacı.
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  const multiplier = ACTIVITY_MULTIPLIER[activityLevel] ?? 1.2;
  return Math.round(bmr * multiplier);
}

/**
 * BMI hesabı (kg / m²).
 */
export function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return +(weightKg / (heightM * heightM)).toFixed(1);
}

export function bmiCategory(bmi: number): 'underweight' | 'normal' | 'overweight' | 'obese' {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25) return 'normal';
  if (bmi < 30) return 'overweight';
  return 'obese';
}

export function ageFromBirthDate(birthDate: string | Date, today: Date = new Date()): number {
  const bd = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  let age = today.getFullYear() - bd.getFullYear();
  const m = today.getMonth() - bd.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
  return age;
}

/**
 * Kilo verme hedefi için TDEE'den varsayılan açık (deficit) — günlük 500 kcal.
 * Haftada ~0.5 kg vermeyi hedefler.
 */
export function suggestedDailyKcal(tdee: number): number {
  return Math.max(1200, tdee - 500);
}

/**
 * MET × kilo × süre (saat) = yakılan kalori.
 */
export function calculateKcalBurned(metValue: number, weightKg: number, durationMin: number): number {
  return Math.round(metValue * weightKg * (durationMin / 60));
}
