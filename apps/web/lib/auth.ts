import { randomBytes, createHash } from 'node:crypto';

const REFRESH_TTL = 60 * 60 * 24 * 30; // 30 gün (seconds)

// JWT sign/verify Edge-uyumlu modülde — middleware buradan import edemez (node:crypto var)
export { signAccessToken, verifyAccessToken, ACCESS_TOKEN_TTL } from './jwt-edge';
export type { AccessTokenPayload } from './jwt-edge';
import { ACCESS_TOKEN_TTL as ACCESS_TTL } from './jwt-edge';

/**
 * Refresh token opaque random — verify edilmez, DB'de hash'i tutulur.
 */
export function generateRefreshToken(): { raw: string; hash: string; expiresAt: Date } {
  const raw = randomBytes(48).toString('base64url');
  const hash = createHash('sha256').update(raw).digest('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TTL * 1000);
  return { raw, hash, expiresAt };
}

export function hashRefreshToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export const TOKEN_TTL = { ACCESS_TTL, REFRESH_TTL };
