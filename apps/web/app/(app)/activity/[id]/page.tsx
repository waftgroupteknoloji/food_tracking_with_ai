import { notFound, redirect } from 'next/navigation';
import { connectMongo } from '@/lib/mongoose';
import { Activity, serializeActivity } from '@/models/Activity';
import { getUserFromCookies } from '@/lib/auth-helpers';
import { ActivityEditor } from '@/components/activity-editor';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ActivityDetailPage({ params }: PageProps) {
  const auth = await getUserFromCookies();
  if (!auth) redirect('/login');

  const { id } = await params;
  await connectMongo();
  const activity = await Activity.findOne({ _id: id, userId: auth.userId }).lean({ getters: true });
  if (!activity) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 pb-24 md:pb-8 animate-fade-in">
      <ActivityEditor initial={serializeActivity(activity as any)} />
    </main>
  );
}
