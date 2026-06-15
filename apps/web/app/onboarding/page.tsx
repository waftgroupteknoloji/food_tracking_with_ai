import { redirect } from 'next/navigation';
import { getUserFromCookies } from '@/lib/auth-helpers';
import { getCurrentUserProfile } from '@/lib/server-user';
import { isProfileComplete } from '@/lib/profile';
import { OnboardingFlow } from './onboarding-flow';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const auth = await getUserFromCookies();
  if (!auth) redirect('/login');

  const profile = await getCurrentUserProfile();
  if (isProfileComplete(profile)) redirect('/dashboard');

  return <OnboardingFlow initialProfile={profile} />;
}
