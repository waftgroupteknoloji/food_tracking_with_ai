import { notFound, redirect } from 'next/navigation';
import { connectMongo } from '@/lib/mongoose';
import { Meal, serializeMeal } from '@/models/Meal';
import { getUserFromCookies } from '@/lib/auth-helpers';
import { MealEditor } from '@/components/meal-editor';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fresh?: string }>;
}

export default async function MealDetailPage({ params, searchParams }: PageProps) {
  const auth = await getUserFromCookies();
  if (!auth) redirect('/login');

  const { id } = await params;
  const { fresh } = await searchParams;

  await connectMongo();
  const meal = await Meal.findOne({ _id: id, userId: auth.userId }).lean({ getters: true });
  if (!meal) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 pb-24 md:pb-8 animate-fade-in">
      <MealEditor initialMeal={serializeMeal(meal as any)} startInEditMode={fresh === '1'} />
    </main>
  );
}
