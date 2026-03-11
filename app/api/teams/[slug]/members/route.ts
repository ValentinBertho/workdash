import { NextRequest, NextResponse } from 'next/server';
import { getTeamMembers, createMember } from '@/lib/data';
import { getTeamSession } from '@/lib/auth';
import { CreateMemberSchema } from '@/lib/validations';

type Params = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const session = await getTeamSession(slug);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const members = await getTeamMembers(slug);
  return NextResponse.json({ members });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const session = await getTeamSession(slug);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json();
  const parsed = CreateMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { member } = await createMember({ teamSlug: slug, ...parsed.data });
  return NextResponse.json({ member }, { status: 201 });
}
