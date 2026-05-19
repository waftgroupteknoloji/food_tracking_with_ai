'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RegisterInputSchema, type RegisterInput } from '@yemek-takip/validators';
import { api } from '@/lib/api';
import { ApiError } from '@yemek-takip/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterInputSchema),
  });

  const mutation = useMutation({
    mutationFn: (input: RegisterInput) => api.auth.register(input),
    onSuccess: () => {
      router.replace('/dashboard');
      router.refresh();
    },
    onError: (err) => {
      setServerError(err instanceof ApiError ? err.message : 'Kayıt başarısız');
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hadi başlayalım</CardTitle>
        <CardDescription>
          Birkaç saniyede hesap oluştur, kalori takibine başla.
        </CardDescription>
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
            <Label htmlFor="displayName">İsim</Label>
            <Input
              id="displayName"
              autoComplete="name"
              placeholder="Adın"
              {...register('displayName')}
            />
            {errors.displayName && (
              <p className="text-xs text-destructive">{errors.displayName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-posta</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="sen@ornek.com"
              {...register('email')}
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
              autoComplete="new-password"
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
            {mutation.isPending ? 'Hesap oluşturuluyor…' : 'Hesap Oluştur'}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Hesabın var mı?{' '}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Giriş yap
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
