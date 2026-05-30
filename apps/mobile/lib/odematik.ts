// ödematik mobile client. Mirrors the network calls @odematik/billing'in
// OdematikButton'unun yaptığı (POST /checkout, /verify, /cancel, GET /billing)
// — fakat envelope `{ ok, ...data }` ApiClient'ın `{ ok, data }` formatına
// uymadığı için doğrudan fetch ile konuşur ve Bearer token'ı SecureStore'dan
// okur.

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
  productId: string,
  customer: OdematikCustomer,
): Promise<CheckoutResponse> {
  return postJson<CheckoutResponse>(`${API_PATH}/checkout`, { productId, customer });
}

export interface VerifyResponse {
  ok: boolean;
  error?: { code: string; message: string };
}

export async function odematikVerify(
  paymentId: string,
  productId: string,
): Promise<VerifyResponse> {
  return postJson<VerifyResponse>(`${API_PATH}/verify`, { paymentId, productId });
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
