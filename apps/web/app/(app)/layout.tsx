import { redirect } from 'next/navigation';
import { getUserFromCookies } from '@/lib/auth-helpers';
import { getCurrentUserProfile } from '@/lib/server-user';
import { isProfileComplete } from '@/lib/profile';
import { AppNav } from '@/components/app-nav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const auth = await getUserFromCookies();
  if (!auth) redirect('/login');

  const profile = await getCurrentUserProfile();
  if (!isProfileComplete(profile)) redirect('/onboarding');

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppNav email={auth.email} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
