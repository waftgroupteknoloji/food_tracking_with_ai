import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import {
  ApiClient,
  endpoints,
  type TokenStorage,
  type Endpoints,
} from '@yemek-takip/api-client';
import type { AuthTokens } from '@yemek-takip/validators';

const ACCESS_KEY = 'auth_access';
const REFRESH_KEY = 'auth_refresh';

const secureStorage: TokenStorage = {
  getAccessToken: () => SecureStore.getItemAsync(ACCESS_KEY),
  getRefreshToken: () => SecureStore.getItemAsync(REFRESH_KEY),
  setTokens: async (tokens: AuthTokens) => {
    await SecureStore.setItemAsync(ACCESS_KEY, tokens.accessToken);
    await SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken);
  },
  clearTokens: async () => {
    await SecureStore.deleteItemAsync(ACCESS_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  },
};

// Öncelik: app.json'daki extra.apiUrl (statik, cache'den etkilenmez)
// → EXPO_PUBLIC_API_URL (env, restart gerektirir)
// → localhost fallback
const baseUrl =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  process.env.EXPO_PUBLIC_API_URL ??
  'http://localhost:3000';

// Hangi URL'ye fetch atıyoruz? Metro terminal'inde göreceğiz.
console.log('[api] baseUrl =', baseUrl);

let onAuthFailure: (() => void) | undefined;

export function setAuthFailureHandler(fn: () => void) {
  onAuthFailure = fn;
}

export const apiClient = new ApiClient({
  baseUrl,
  storage: secureStorage,
  useCookies: false,
  onAuthFailure: () => onAuthFailure?.(),
});

export const api: Endpoints = endpoints(apiClient);

export async function persistTokens(tokens: AuthTokens) {
  await secureStorage.setTokens(tokens);
}

export async function clearTokens() {
  await secureStorage.clearTokens();
}

export { baseUrl as API_BASE_URL };
