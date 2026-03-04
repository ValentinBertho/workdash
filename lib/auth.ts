import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? 'dev-secret-change-me-in-prod'
);

/* ─── Admin (Valentin) ───────────────────────────────────────── */
const COOKIE_NAME = 'workdash-admin';

export async function signToken(): Promise<string> {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET);
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload.role === 'admin';
  } catch { return false; }
}

export { COOKIE_NAME };

/* ─── Manager ────────────────────────────────────────────────── */
const MANAGER_COOKIE = 'workdash-manager';

export async function signManagerToken(): Promise<string> {
  return new SignJWT({ role: 'manager' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(SECRET);
}

export async function isManagerAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(MANAGER_COOKIE)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload.role === 'manager';
  } catch { return false; }
}

export { MANAGER_COOKIE };
