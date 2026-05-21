# Yemek Takip

Kişisel kalori takip uygulaması — web (Next.js) + mobil (Expo) monorepo.

## Tech Stack

- **Monorepo:** Turborepo + pnpm workspaces
- **Web:** Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui
- **Mobil:** Expo SDK 52 + React Native + TypeScript + NativeWind
- **Backend:** Next.js API Route Handlers (shared between web & mobile)
- **DB:** MongoDB Atlas + Mongoose
- **AI:** Google Gemini 1.5 Flash (vision + text)
- **Storage:** AWS S3 (presigned PUT)
- **Auth:** Custom JWT (httpOnly cookie web / Bearer mobile)

## Setup

```bash
# 1. Install
pnpm install

# 2. Copy env file and fill in credentials
cp .env.example apps/web/.env.local
# fill MONGODB_URI, JWT_SECRET_CURRENT, GEMINI_API_KEY, AWS_* values

# 3. Run
pnpm dev               # both web + mobile
pnpm dev:web           # only Next.js (port 3000)
pnpm dev:mobile        # only Expo
```

## Structure

```
apps/
  web/       Next.js 15 (web UI + API routes)
  mobile/    Expo (React Native + Expo Router)
packages/
  types/         Shared TS types
  validators/    Zod schemas (single source of truth for types + validation)
  api-client/    Platform-agnostic fetch wrapper + typed endpoints
  ai/            Gemini client + prompts
  utils/         date-fns helpers, BMR/TDEE, streak
  ui-tokens/     Shared color/spacing/type tokens
  config-tsconfig/  Shared TS configs
```

See [plan file](https://...) for full design.


Pressable function-style quirk, layout bozuk