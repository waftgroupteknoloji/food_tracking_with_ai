import type {
  ApiClient,
} from './client';
import type {
  AuthTokens,
  CreateActivityInput,
  CreateMealInput,
  CreateWaterInput,
  CreateWeightInput,
  DailyStats,
  LoginInput,
  Meal,
  PublicUser,
  RegisterInput,
  SignUploadInput,
  SignUploadOutput,
  StreakStats,
  UpdateMealInput,
  UpdateProfileInput,
  Activity,
  WeightEntry,
  WaterEntry,
  CoinBalance,
  CoinCatalog,
  CoinTransactionsResponse,
  CoinPackageId,
  SubscriptionPlanId,
  AdPlatform,
} from '@yemek-takip/validators';

export interface AuthSuccess {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

export function endpoints(client: ApiClient) {
  return {
    auth: {
      register: (input: RegisterInput) =>
        client.request<AuthSuccess>('/api/auth/register', {
          method: 'POST',
          json: input,
          auth: false,
        }),
      login: (input: LoginInput) =>
        client.request<AuthSuccess>('/api/auth/login', {
          method: 'POST',
          json: input,
          auth: false,
        }),
      logout: () =>
        client.request<{ ok: true }>('/api/auth/logout', { method: 'POST' }),
      me: () => client.request<PublicUser>('/api/auth/me', { method: 'GET' }),
      refresh: (refreshToken?: string) =>
        client.request<AuthTokens>('/api/auth/refresh', {
          method: 'POST',
          json: { refreshToken },
          auth: false,
        }),
    },
    profile: {
      update: (input: UpdateProfileInput) =>
        client.request<PublicUser>('/api/profile', { method: 'PATCH', json: input }),
    },
    uploads: {
      sign: (input: SignUploadInput) =>
        client.request<SignUploadOutput>('/api/uploads/sign', {
          method: 'POST',
          json: input,
        }),
    },
    meals: {
      create: (input: CreateMealInput) =>
        client.request<Meal>('/api/meals', { method: 'POST', json: input }),
      listByDate: (date: string) =>
        client.request<Meal[]>(`/api/meals?date=${encodeURIComponent(date)}`, {
          method: 'GET',
        }),
      listPage: (cursor?: string, limit = 30) => {
        const params = new URLSearchParams({ limit: String(limit) });
        if (cursor) params.set('cursor', cursor);
        return client.request<{ items: Meal[]; nextCursor: string | null }>(
          `/api/meals?${params.toString()}`,
          { method: 'GET' },
        );
      },
      get: (id: string) => client.request<Meal>(`/api/meals/${id}`, { method: 'GET' }),
      update: (id: string, input: UpdateMealInput) =>
        client.request<Meal>(`/api/meals/${id}`, { method: 'PATCH', json: input }),
      remove: (id: string) =>
        client.request<{ ok: true }>(`/api/meals/${id}`, { method: 'DELETE' }),
    },
    activities: {
      create: (input: CreateActivityInput) =>
        client.request<Activity>('/api/activities', { method: 'POST', json: input }),
      listByDate: (date: string) =>
        client.request<Activity[]>(`/api/activities?date=${encodeURIComponent(date)}`, {
          method: 'GET',
        }),
      get: (id: string) =>
        client.request<Activity>(`/api/activities/${id}`, { method: 'GET' }),
      update: (id: string, input: { items: Activity['items'] }) =>
        client.request<Activity>(`/api/activities/${id}`, {
          method: 'PATCH',
          json: input,
        }),
      remove: (id: string) =>
        client.request<{ ok: true }>(`/api/activities/${id}`, { method: 'DELETE' }),
    },
    weight: {
      upsert: (input: CreateWeightInput) =>
        client.request<WeightEntry>('/api/weight', { method: 'POST', json: input }),
      list: (period: 'week' | 'month' | 'year' | 'all' = 'month') =>
        client.request<WeightEntry[]>(`/api/weight?period=${period}`, { method: 'GET' }),
      photos: () =>
        client.request<WeightEntry[]>('/api/weight/photos', { method: 'GET' }),
      remove: (id: string) =>
        client.request<{ ok: true }>(`/api/weight/${id}`, { method: 'DELETE' }),
    },
    water: {
      add: (input: CreateWaterInput) =>
        client.request<WaterEntry>('/api/water', { method: 'POST', json: input }),
      listByDate: (date: string) =>
        client.request<{ totalMl: number; entries: WaterEntry[] }>(
          `/api/water?date=${encodeURIComponent(date)}`,
          { method: 'GET' },
        ),
      remove: (id: string) =>
        client.request<{ ok: true }>(`/api/water/${id}`, { method: 'DELETE' }),
    },
    stats: {
      daily: (date: string) =>
        client.request<DailyStats>(`/api/stats/daily?date=${encodeURIComponent(date)}`, {
          method: 'GET',
        }),
      streak: () => client.request<StreakStats>('/api/stats/streak', { method: 'GET' }),
    },
    coins: {
      balance: () =>
        client.request<CoinBalance>('/api/coins/balance', { method: 'GET' }),
      transactions: (limit = 50, before?: string) => {
        const params = new URLSearchParams({ limit: String(limit) });
        if (before) params.set('before', before);
        return client.request<CoinTransactionsResponse>(
          `/api/coins/transactions?${params.toString()}`,
          { method: 'GET' },
        );
      },
      catalog: () =>
        client.request<CoinCatalog>('/api/coins/catalog', { method: 'GET', auth: false }),
      purchase: (packageId: CoinPackageId) =>
        client.request<{
          orderId: string;
          coins: number;
          subscription: CoinBalance['subscription'];
          hasActiveSubscription: boolean;
        }>('/api/coins/purchase', { method: 'POST', json: { packageId } }),
      subscribe: (planId: SubscriptionPlanId) =>
        client.request<{
          orderId: string;
          coins: number;
          expiresAt: string;
          subscription: CoinBalance['subscription'];
          hasActiveSubscription: boolean;
        }>('/api/coins/subscribe', { method: 'POST', json: { planId } }),
      adReward: (adNonce: string, platform: AdPlatform) =>
        client.request<{
          awarded: number;
          coins: number;
          subscription: CoinBalance['subscription'];
          hasActiveSubscription: boolean;
        }>('/api/coins/ad-reward', { method: 'POST', json: { adNonce, platform } }),
    },
  };
}

export type Endpoints = ReturnType<typeof endpoints>;
