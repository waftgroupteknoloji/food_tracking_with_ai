import { ok } from '@/lib/api-response';
import { isMongoReachable } from '@/lib/mongoose';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const mongoOk = await isMongoReachable();
  return ok({
    status: 'ok',
    mongo: mongoOk,
    time: new Date().toISOString(),
  });
}
