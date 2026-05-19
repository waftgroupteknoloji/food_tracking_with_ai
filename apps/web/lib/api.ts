import { ApiClient, endpoints, type Endpoints } from '@yemek-takip/api-client';

const baseUrl =
  typeof window === 'undefined'
    ? process.env.NEXT_PUBLIC_API_URL || `http://localhost:${process.env.PORT || 3000}`
    : '';

let authFailureHandler: (() => void) | undefined;

export function setWebAuthFailureHandler(fn: () => void) {
  authFailureHandler = fn;
}

export const apiClient = new ApiClient({
  baseUrl,
  useCookies: true,
  onAuthFailure: () => authFailureHandler?.(),
});

export const api: Endpoints = endpoints(apiClient);
