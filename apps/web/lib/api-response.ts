import { NextResponse } from 'next/server';
import type { ApiResponse } from '@yemek-takip/validators';

export function ok<T>(data: T, init?: ResponseInit): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ ok: true, data } satisfies ApiResponse<T>, init);
}

export function fail(
  code: string,
  message: string,
  status = 400,
  details?: unknown,
): NextResponse<ApiResponse<never>> {
  return NextResponse.json(
    { ok: false, error: { code, message, details } } as ApiResponse<never>,
    { status },
  );
}

export function failFromError(err: unknown): NextResponse<ApiResponse<never>> {
  if (err instanceof Error) {
    return fail('INTERNAL', err.message, 500);
  }
  return fail('INTERNAL', 'Beklenmeyen bir hata oluştu', 500);
}
