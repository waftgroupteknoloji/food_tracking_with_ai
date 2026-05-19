import type { ApiResponse, AuthTokens } from '@yemek-takip/validators';

export interface TokenStorage {
  getAccessToken(): Promise<string | null> | string | null;
  getRefreshToken(): Promise<string | null> | string | null;
  setTokens(tokens: AuthTokens): Promise<void> | void;
  clearTokens(): Promise<void> | void;
}

export interface ApiClientOptions {
  baseUrl: string;
  storage?: TokenStorage;
  /** true → fetch'e `credentials: 'include'` ekler (web cookie senaryosu) */
  useCookies?: boolean;
  /** Hata olduğunda çağrılır (örn: 401 sonrası logout için) */
  onAuthFailure?: () => void;
}

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;
  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class ApiClient {
  private opts: ApiClientOptions;
  private refreshing: Promise<string | null> | null = null;

  constructor(opts: ApiClientOptions) {
    this.opts = opts;
  }

  async request<T>(
    path: string,
    init: RequestInit & { json?: unknown; auth?: boolean } = {},
  ): Promise<T> {
    const { json, auth = true, headers, ...rest } = init;
    const finalHeaders: Record<string, string> = {
      Accept: 'application/json',
      ...(headers as Record<string, string> | undefined),
    };
    if (json !== undefined) {
      finalHeaders['Content-Type'] = 'application/json';
    }

    if (auth && this.opts.storage && !this.opts.useCookies) {
      const token = await this.opts.storage.getAccessToken();
      if (token) finalHeaders.Authorization = `Bearer ${token}`;
    }

    const doFetch = () =>
      fetch(`${this.opts.baseUrl}${path}`, {
        ...rest,
        headers: finalHeaders,
        credentials: this.opts.useCookies ? 'include' : 'same-origin',
        body: json !== undefined ? JSON.stringify(json) : (rest.body ?? undefined),
      });

    let res = await doFetch();
    if (res.status === 401 && auth) {
      const newToken = await this.attemptRefresh();
      if (newToken) {
        if (!this.opts.useCookies) finalHeaders.Authorization = `Bearer ${newToken}`;
        res = await doFetch();
      } else {
        this.opts.onAuthFailure?.();
      }
    }

    const body = (await res.json().catch(() => null)) as ApiResponse<T> | null;
    if (!body) {
      throw new ApiError('NETWORK', `Geçersiz yanıt (${res.status})`, res.status);
    }
    if (!body.ok) {
      throw new ApiError(body.error.code, body.error.message, res.status, body.error.details);
    }
    return body.data;
  }

  private async attemptRefresh(): Promise<string | null> {
    if (this.refreshing) return this.refreshing;
    this.refreshing = (async () => {
      try {
        const refreshToken = this.opts.storage
          ? await this.opts.storage.getRefreshToken()
          : null;
        const res = await fetch(`${this.opts.baseUrl}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: this.opts.useCookies ? 'include' : 'same-origin',
          body: this.opts.useCookies ? undefined : JSON.stringify({ refreshToken }),
        });
        if (!res.ok) return null;
        const json = (await res.json()) as ApiResponse<AuthTokens>;
        if (!json.ok) return null;
        if (this.opts.storage && !this.opts.useCookies) {
          await this.opts.storage.setTokens(json.data);
        }
        return json.data.accessToken;
      } catch {
        return null;
      } finally {
        this.refreshing = null;
      }
    })();
    return this.refreshing;
  }
}
