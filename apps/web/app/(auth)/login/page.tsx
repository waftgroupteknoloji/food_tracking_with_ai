'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LoginInputSchema, type LoginInput } from '@yemek-takip/validators';
import { api } from '@/lib/api';
import { ApiError } from '@yemek-takip/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/dashboard';
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginInputSchema),
  });

  const mutation = useMutation({
    mutationFn: (input: LoginInput) => api.auth.login(input),
    onSuccess: () => {
      router.replace(next);
      router.refresh();
    },
    onError: (err) => {
      setServerError(err instanceof ApiError ? err.message : 'Giriş başarısız');
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tekrar hoşgeldin</CardTitle>
        <CardDescription>Hesabına giriş yap ve günlüğünü aç.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit((data) => {
            setServerError(null);
            mutation.mutate(data);
          })}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="email">E-posta</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email')}
              placeholder="sen@ornek.com"
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Şifre</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>
          {serverError && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md p-3">
              {serverError}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? 'Giriş yapılıyor…' : 'Giriş Yap'}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Hesabın yok mu?{' '}
            <Link
              href="/register"
              className="text-primary font-medium hover:underline"
            >
              Kayıt ol
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
