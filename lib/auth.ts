import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { TeamSession } from '@/types';

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? 'dev-secret-change-in-prod'
);

export function cookieName(slug: string) {
  return `workdash-${slug}`;
}

export async function createTeamToken(session: TeamSession): Promise<string> {
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(secret);
}

export async function getTeamSession(slug: string): Promise<TeamSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(cookieName(slug))?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret);
    const session = payload as unknown as TeamSession;
    if (session.teamSlug !== slug) return null;
    return session;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const encoded = new TextEncoder().encode(password);
  const buf = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return (await hashPassword(password)) === hash;
}
