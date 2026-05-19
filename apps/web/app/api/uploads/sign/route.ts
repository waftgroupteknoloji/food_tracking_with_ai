import { type NextRequest } from 'next/server';
import { SignUploadInputSchema } from '@yemek-takip/validators';
import { getUserFromRequest } from '@/lib/auth-helpers';
import { signUpload, isS3Configured } from '@/lib/s3';
import { ok, fail, failFromError } from '@/lib/api-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return fail('UNAUTHORIZED', 'Giriş gerekli', 401);

    if (!isS3Configured()) {
      return fail(
        'S3_NOT_CONFIGURED',
        'S3 yapılandırması eksik. .env dosyana AWS_* değişkenlerini ekle.',
        503,
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = SignUploadInputSchema.safeParse(body);
    if (!parsed.success) {
      return fail('VALIDATION', 'Geçersiz giriş', 400, parsed.error.flatten());
    }

    const result = await signUpload({
      userId: user.userId,
      folder: parsed.data.folder,
      contentType: parsed.data.contentType,
    });
    return ok(result);
  } catch (err) {
    return failFromError(err);
  }
}
