'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LogOut, Moon, Sun, Monitor } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const logout = useMutation({
    mutationFn: () => api.auth.logout(),
    onSettled: () => {
      router.replace('/login');
      router.refresh();
    },
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 pb-24 md:pb-8 space-y-6 animate-fade-in">
      <Link
        href="/profile"
        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
      >
        <ArrowLeft size={16} /> Profil
      </Link>

      <header>
        <h1 className="text-3xl font-bold tracking-tight">Ayarlar</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Tema</CardTitle>
          <CardDescription>Sistem ayarına göre otomatik veya manuel.</CardDescription>
        </CardHeader>
        <CardContent>
          {mounted && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { v: 'light', l: 'Açık', i: Sun },
                { v: 'dark', l: 'Koyu', i: Moon },
                { v: 'system', l: 'Otomatik', i: Monitor },
              ].map((o) => (
                <button
                  key={o.v}
                  onClick={() => setTheme(o.v)}
                  className={`flex flex-col items-center gap-1 py-3 rounded-lg border ${
                    theme === o.v
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-card border-border hover:bg-secondary'
                  }`}
                >
                  <o.i size={18} />
                  <span className="text-sm font-medium">{o.l}</span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hesap</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button asChild variant="outline" className="w-full">
            <Link href="/profile/edit">Profil düzenle</Link>
          </Button>
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
          >
            <LogOut size={16} /> Çıkış yap
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
