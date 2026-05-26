/**
 * Reklam (Rewarded Ad) helper'ı. Gerçek AdMob entegrasyonu için
 * `react-native-google-mobile-ads` paketi kurulduğunda alttaki TODO bloğunu
 * doldur. Şu an stub mode: 2 saniye delay sonra başarılı kabul ediyor.
 *
 * Env var: EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID set edilirse gerçek SDK kullanılır.
 */

const ADMOB_UNIT_ID = process.env.EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID;

function randomNonce() {
  return `mob-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface AdResult {
  adNonce: string;
  /** Gerçek SDK kullanıldıysa true */
  real: boolean;
}

export async function showRewardedAd(): Promise<AdResult> {
  if (!ADMOB_UNIT_ID) {
    // Stub: kullanıcıya "izleniyor" hissi vermek için 2 sn bekle, sonra başarı.
    await new Promise((r) => setTimeout(r, 2000));
    return { adNonce: randomNonce(), real: false };
  }

  // TODO: gerçek entegrasyon:
  //
  //   import mobileAds, { RewardedAd, RewardedAdEventType } from 'react-native-google-mobile-ads';
  //   await mobileAds().initialize();
  //   const ad = RewardedAd.createForAdRequest(ADMOB_UNIT_ID);
  //   return new Promise((resolve, reject) => {
  //     const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => ad.show());
  //     const unsubEarned = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
  //       unsubLoaded(); unsubEarned();
  //       resolve({ adNonce: randomNonce(), real: true });
  //     });
  //     ad.load();
  //   });

  await new Promise((r) => setTimeout(r, 2000));
  return { adNonce: randomNonce(), real: false };
}
