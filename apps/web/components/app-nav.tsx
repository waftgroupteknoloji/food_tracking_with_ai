'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { LogOut, Home, User, History, Scale, Plus } from 'lucide-react';

const links = [
  { href: '/dashboard', label: 'Bugün', icon: Home },
  { href: '/history', label: 'Geçmiş', icon: History },
  { href: '/weight', label: 'Kilo', icon: Scale },
  { href: '/profile', label: 'Profil', icon: User },
] as const;

export function AppNav({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useMutation({
    mutationFn: () => api.auth.logout(),
    onSettled: () => {
      router.replace('/login');
      router.refresh();
    },
  });

  // The Bugün dashboard ships its own top nav + mobile tab bar.
  if (pathname === '/dashboard') return null;

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="font-bold text-xl">
          <span className="text-primary">Yemek</span>
          <span className="text-accent"> Takip</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary',
                )}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="accent" className="hidden sm:inline-flex">
            <Link href="/add/meal">
              <Plus size={16} /> Ekle
            </Link>
          </Button>
          <span className="hidden lg:block text-sm text-muted-foreground">{email}</span>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            title="Çıkış"
          >
            <LogOut size={18} />
          </Button>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-background z-40">
        <div className="grid grid-cols-4">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex flex-col items-center gap-1 py-2 text-xs',
                  active ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <Icon size={20} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
