import { NextRequest, NextResponse } from 'next/server';
import { createTeam, getTeamForAuth } from '@/lib/data';
import { CreateTeamSchema } from '@/lib/validations';
import { createTeamToken, cookieName } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CreateTeamSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { slug } = parsed.data;
  const existing = await getTeamForAuth(slug);
  if (existing) {
    return NextResponse.json({ error: 'Ce slug est déjà pris' }, { status: 409 });
  }

  const { token } = await createTeam(parsed.data);

  const session = {
    memberId: '',
    memberName: parsed.data.adminName,
    role: 'admin' as const,
    canComment: true,
    teamSlug: slug,
    token,
  };

  // Get the actual member id from the token
  const { getMemberByToken } = await import('@/lib/data');
  const member = await getMemberByToken(token);
  if (!member) return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });

  const jwt = await createTeamToken({
    memberId: member.id,
    memberName: member.name,
    role: 'admin',
    canComment: true,
    teamSlug: slug,
  });

  const res = NextResponse.json({ slug });
  res.cookies.set(cookieName(slug), jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
