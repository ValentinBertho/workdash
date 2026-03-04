import { NextRequest, NextResponse } from 'next/server';
import { signManagerToken, isManagerAuthenticated, MANAGER_COOKIE } from '@/lib/auth';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 30,
  path: '/',
};

export async function GET() {
  const authenticated = await isManagerAuthenticated();
  return NextResponse.json({ authenticated });
}

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const correct = process.env.MANAGER_PASSWORD ?? 'manager123';

  if (password !== correct) {
    return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 });
  }

  const token = await signManagerToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(MANAGER_COOKIE, token, COOKIE_OPTIONS);
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(MANAGER_COOKIE);
  return res;
}
