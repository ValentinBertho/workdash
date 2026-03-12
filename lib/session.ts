/**
 * Verified session: JWT + DB token check for "logout all devices" support.
 * Use this in layouts/server components. API routes use getTeamSession (JWT only).
 */
import { getTeamSession } from './auth';
import { db } from './db';
import { teamMembers } from './db/schema';
import { eq } from 'drizzle-orm';
import { TeamSession } from '@/types';

export async function getVerifiedSession(slug: string): Promise<TeamSession | null> {
  const session = await getTeamSession(slug);
  if (!session) return null;

  // If the JWT carries a jti (member token), verify it still matches the DB
  if (session.jti) {
    const [row] = await db
      .select({ token: teamMembers.token, sv: teamMembers.sessionVersion })
      .from(teamMembers)
      .where(eq(teamMembers.id, session.memberId));
    if (!row) return null;
    if (row.token !== session.jti) return null;
    if (session.sv !== undefined && row.sv !== session.sv) return null;
  }

  return session;
}
