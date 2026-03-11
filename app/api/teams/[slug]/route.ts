import { NextRequest, NextResponse } from 'next/server';
import { getTeam, updateTeam } from '@/lib/data';
import { getTeamSession } from '@/lib/auth';
import { UpdateTeamSchema } from '@/lib/validations';

type Params = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const team = await getTeam(slug);
  if (!team) return NextResponse.json({ error: 'Équipe introuvable' }, { status: 404 });
  return NextResponse.json({ team });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const session = await getTeamSession(slug);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json();
  const parsed = UpdateTeamSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  await updateTeam(slug, parsed.data);
  return NextResponse.json({ ok: true });
}
