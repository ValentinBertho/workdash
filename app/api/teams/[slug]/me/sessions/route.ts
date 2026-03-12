import { NextRequest, NextResponse } from 'next/server';
import { getTeamSession, createTeamToken, cookieName } from '@/lib/auth';
import { db } from '@/lib/db';
import { teamMembers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

type Params = { params: Promise<{ slug: string }> };

/** Revoke all sessions: regenerates member token so existing JWTs with old jti fail verification. */
export async function DELETE(req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const session = await getTeamSession(slug);
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const newToken = crypto.randomUUID();
  await db.update(teamMembers).set({ token: newToken }).where(eq(teamMembers.id, session.memberId));

  // Re-issue a fresh JWT for the current device
  const newJwt = await createTeamToken({
    memberId: session.memberId,
    memberName: session.memberName,
    role: session.role,
    canComment: session.canComment,
    teamSlug: slug,
    jti: newToken,
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookieName(slug), newJwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
