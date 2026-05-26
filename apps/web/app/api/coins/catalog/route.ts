import { COIN_PACKAGES, SUBSCRIPTION_PLANS } from '@yemek-takip/validators';
import { ok, failFromError } from '@/lib/api-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return ok({ packages: COIN_PACKAGES, plans: SUBSCRIPTION_PLANS });
  } catch (err) {
    return failFromError(err);
  }
}
