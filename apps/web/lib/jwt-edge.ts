import { SignJWT, jwtVerify, errors as joseErrors } from 'jose';

const ACCESS_TTL = 15 * 60;

export interface AccessTokenPayload {
  userId: string;
  email: string;
}

function getCurrentSecret(): Uint8Array {
  const s = process.env.JWT_SECRET_CURRENT;
  if (!s) throw new Error('JWT_SECRET_CURRENT tanımlı değil');
  return new TextEncoder().encode(s);
}

function getPreviousSecret(): Uint8Array | null {
  const s = process.env.JWT_SECRET_PREVIOUS;
  if (!s) return null;
  return new TextEncoder().encode(s);
}

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL}s`)
    .sign(getCurrentSecret());
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getCurrentSecret());
    return { userId: String(payload.userId), email: String(payload.email) };
  } catch (err) {
    if (err instanceof joseErrors.JWSSignatureVerificationFailed) {
      const prev = getPreviousSecret();
      if (prev) {
        try {
          const { payload } = await jwtVerify(token, prev);
          return { userId: String(payload.userId), email: String(payload.email) };
        } catch {
          return null;
        }
      }
    }
    return null;
  }
}

export const ACCESS_TOKEN_TTL = ACCESS_TTL;
