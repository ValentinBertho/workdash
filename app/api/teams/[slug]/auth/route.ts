import { NextRequest, NextResponse } from 'next/server';
import { getTeamForAuth, getMemberForAuth, getMemberToken, createMemberWithPassword } from '@/lib/data';
import { createTeamToken, verifyPassword, cookieName } from '@/lib/auth';
import { TeamAuthSchema } from '@/lib/validations';

type Params = { params: Promise<{ slug: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const team = await getTeamForAuth(slug);
  if (!team) return NextResponse.json({ error: 'Équipe introuvable' }, { status: 404 });

  const body = await req.json();
  const parsed = TeamAuthSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { password, memberName, memberPassword } = parsed.data;

  // Check team password
  if (team.passwordHash) {
    if (!password || !(await verifyPassword(password, team.passwordHash))) {
      return NextResponse.json({ error: 'Mot de passe équipe incorrect' }, { status: 401 });
    }
  }

  let member = await getMemberForAuth(slug, memberName);
  let token: string;

  if (member) {
    // Check member personal password if set
    if (member.passwordHash) {
      if (!memberPassword || !(await verifyPassword(memberPassword, member.passwordHash))) {
        return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 });
      }
    }
    token = (await getMemberToken(member.id))!;
  } else {
    // Create new member (open-access teams without pre-created accounts)
    const result = await createMemberWithPassword({ teamSlug: slug, name: memberName, role: 'operator' });
    member = result.member;
    token = result.token;
  }

  const jwt = await createTeamToken({
    memberId: member.id,
    memberName: member.name,
    role: member.role,
    canComment: member.canComment,
    teamSlug: slug,
  });

  const res = NextResponse.json({ member });
  res.cookies.set(cookieName(slug), jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(cookieName(slug));
  return res;
}
