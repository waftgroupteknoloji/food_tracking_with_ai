import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUserFromCookies } from '@/lib/auth-helpers';

export default async function HomePage() {
  const auth = await getUserFromCookies();
  if (auth) redirect('/dashboard');

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-background to-accent-50 dark:from-primary-950/30 dark:via-background dark:to-accent-950/30 p-6">
      <div className="max-w-xl text-center space-y-8 animate-fade-in">
        <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
          🟢 AI destekli kalori takibi
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
          <span className="text-primary">Yemek</span>
          <span className="text-accent"> Takip</span>
        </h1>
        <p className="text-lg text-muted-foreground">
          Fotoğraf yükle, aktiviteni yaz, kilonu izle.
          Kişisel kalori günlüğünü tek bir yerde tut.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition"
          >
            Giriş Yap
          </Link>
          <Link
            href="/register"
            className="px-6 py-3 rounded-lg border border-border bg-card hover:bg-secondary transition font-medium"
          >
            Kayıt Ol
          </Link>
        </div>
      </div>
    </main>
  );
}
