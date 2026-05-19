import { type NextRequest } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { User, toPublicUser } from '@/models/User';
import { getUserFromRequest } from '@/lib/auth-helpers';
import { ok, fail, failFromError } from '@/lib/api-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth) return fail('UNAUTHORIZED', 'Giriş gerekli', 401);

    await connectMongo();
    const user = await User.findById(auth.userId);
    if (!user) return fail('UNAUTHORIZED', 'Kullanıcı bulunamadı', 401);

    return ok(toPublicUser(user));
  } catch (err) {
    return failFromError(err);
  }
}
