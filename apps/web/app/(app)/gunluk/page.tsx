import { redirect } from 'next/navigation';
import { getUserFromCookies } from '@/lib/auth-helpers';
import { GunlukFeed } from '@/components/gunluk/gunluk-feed';

export default async function GunlukPage() {
  const auth = await getUserFromCookies();
  if (!auth) redirect('/login');

  return <GunlukFeed email={auth.email} />;
}
