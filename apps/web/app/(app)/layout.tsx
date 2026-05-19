import { redirect } from 'next/navigation';
import { getUserFromCookies } from '@/lib/auth-helpers';
import { AppNav } from '@/components/app-nav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const auth = await getUserFromCookies();
  if (!auth) redirect('/login');

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppNav email={auth.email} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
