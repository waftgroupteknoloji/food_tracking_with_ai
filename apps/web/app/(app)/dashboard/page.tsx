import { redirect } from 'next/navigation';
import { getUserFromCookies } from '@/lib/auth-helpers';
import { BugunDashboard } from '@/components/bugun/bugun-dashboard';

export default async function DashboardPage() {
  const auth = await getUserFromCookies();
  if (!auth) redirect('/login');

  return <BugunDashboard email={auth.email} />;
}
