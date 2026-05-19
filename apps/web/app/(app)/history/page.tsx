import { redirect } from 'next/navigation';
import { getUserFromCookies } from '@/lib/auth-helpers';
import { GecmisPage } from '@/components/gecmis/gecmis-page';

export default async function HistoryPage() {
  const auth = await getUserFromCookies();
  if (!auth) redirect('/login');

  return <GecmisPage email={auth.email} />;
}
