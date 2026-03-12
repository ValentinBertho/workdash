import { NextRequest, NextResponse } from 'next/server';
import { getTeam, getTeamMembersWithPasswordFlag } from '@/lib/data';

type Params = { params: Promise<{ slug: string }> };

// Public endpoint — returns member names + hasPassword flag for the login screen
export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const team = await getTeam(slug);
  if (!team) return NextResponse.json({ error: 'Équipe introuvable' }, { status: 404 });

  const members = await getTeamMembersWithPasswordFlag(slug);
  return NextResponse.json({
    members: members.map(m => ({ id: m.id, name: m.name, hasPassword: m.hasPassword })),
    teamName: team.name,
    accentColor: team.accentColor,
    hasTeamPassword: team.hasPassword,
  });
}
