// ödematik mobile client. SDK v0.14 HTTP yüzeyini birebir aynalar — RN'de
// React DOM component'leri kullanılamadığı için (`OdematikButton`,
// `OdematikSubscriptionsList`) endpoint'lere doğrudan fetch atıyoruz:
//
//   POST /checkout                       → odematikCheckout
//   POST /verify                         → odematikVerify
//   POST /cancel                         → odematikCancel        (pending payment)
//   GET  /billing                        → odematikGetBilling
//   GET  /subscriptions                  → odematikListSubscriptions
//   POST /subscriptions/:id/cancel       → odematikCancelSubscription
//
// Envelope `{ ok, ...data }` ApiClient'ın `{ ok, data }` formatına uymadığı
// için doğrudan fetch + Bearer token (SecureStore'dan).

import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from './api';

const ACCESS_KEY = 'auth_access';
const API_PATH = '/api/odematik';

export interface OdematikBillingInfo {
  unvan: string;
  vkn_tckn: string;
  vergi_dairesi?: string;
  adres: string;
  il: string;
  ilce: string;
}

export interface OdematikCustomer {
  id: string;
  email: string;
  phone?: string;
  billing?: OdematikBillingInfo;
}

export interface CheckoutSuccess {
  ok: true;
  paymentId?: string;
  iframeUrl?: string;
  redirectUrl?: string;
  formHtml?: string;
  amount?: number;
  currency?: string;
  name?: string;
  activated?: boolean;
  trial?: boolean;
  subscription?: unknown;
}

export interface CheckoutError {
  ok: false;
  error: { code: string; message: string; details?: unknown };
}

export type CheckoutResponse = CheckoutSuccess | CheckoutError;

async function authHeaders(): Promise<Record<string, string>> {
  const token = await SecureStore.getItemAsync(ACCESS_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(await authHeaders()),
  };
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => null)) as T | null;
  if (!json) {
    throw new Error(`Sunucu yanıtı okunamadı (HTTP ${res.status})`);
  }
  return json;
}

export async function odematikCheckout(
  planId: string,
  customer: OdematikCustomer,
  couponCode?: string,
): Promise<CheckoutResponse> {
  return postJson<CheckoutResponse>(`${API_PATH}/checkout`, {
    planId,
    customer,
    ...(couponCode ? { couponCode } : {}),
  });
}

export interface VerifyResponse {
  ok: boolean;
  error?: { code: string; message: string };
}

export async function odematikVerify(
  paymentId: string,
  planId: string,
): Promise<VerifyResponse> {
  return postJson<VerifyResponse>(`${API_PATH}/verify`, { paymentId, planId });
}

export async function odematikCancel(paymentId: string): Promise<void> {
  try {
    await postJson(`${API_PATH}/cancel`, { paymentId });
  } catch {
    // best-effort, sessizce yut
  }
}

export interface BillingResponse {
  ok: boolean;
  billing?: OdematikBillingInfo | null;
}

export async function odematikGetBilling(): Promise<OdematikBillingInfo | null> {
  try {
    const res = await fetch(`${API_BASE_URL}${API_PATH}/billing`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(await authHeaders()),
      },
    });
    const json = (await res.json().catch(() => null)) as BillingResponse | null;
    if (!json?.ok) return null;
    return json.billing ?? null;
  } catch {
    return null;
  }
}

// ─── Subscriptions ────────────────────────────────────────────────────────
// SDK v0.14'te eklenen GET /subscriptions + POST /subscriptions/:id/cancel
// endpoint'leri. Mobil tarafta üyelik yönetimi için kullanılır.

export interface OdematikSubscription {
  id: string;
  product: string;
  plan: string;
  status: 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired' | 'paused' | 'pending';
  amount_with_vat: string | number;
  billing_cycle: 'monthly' | 'yearly';
  trial_end?: string | null;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end?: boolean;
  cancelled_at?: string | null;
}

interface ListSubscriptionsResponse {
  ok: boolean;
  subscriptions?: OdematikSubscription[];
  error?: { code: string; message: string };
}

export async function odematikListSubscriptions(): Promise<OdematikSubscription[]> {
  const res = await fetch(`${API_BASE_URL}${API_PATH}/subscriptions`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...(await authHeaders()),
    },
  });
  const json = (await res.json().catch(() => null)) as ListSubscriptionsResponse | null;
  if (!json?.ok) {
    throw new Error(json?.error?.message ?? 'Abonelikler alınamadı');
  }
  return json.subscriptions ?? [];
}

interface CancelSubscriptionResponse {
  ok: boolean;
  subscription?: OdematikSubscription;
  error?: { code: string; message: string };
}

export interface CancelSubscriptionOptions {
  /** true = dönem sonunda iptal (default, kibarsı), false = anında kes */
  atPeriodEnd?: boolean;
  reason?: string;
}

export async function odematikCancelSubscription(
  subscriptionId: string,
  options: CancelSubscriptionOptions = {},
): Promise<OdematikSubscription> {
  const json = await postJson<CancelSubscriptionResponse>(
    `${API_PATH}/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
    options,
  );
  if (!json.ok || !json.subscription) {
    throw new Error(json.error?.message ?? 'Abonelik iptal edilemedi');
  }
  return json.subscription;
}
