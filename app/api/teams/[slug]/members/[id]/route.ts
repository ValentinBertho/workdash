import { NextRequest, NextResponse } from 'next/server';
import { updateMember, deleteMember, setMemberPassword } from '@/lib/data';
import { getTeamSession } from '@/lib/auth';
import { UpdateMemberSchema, SetMemberPasswordSchema } from '@/lib/validations';

type Params = { params: Promise<{ slug: string; id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { slug, id } = await params;
  const session = await getTeamSession(slug);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json();
  const parsed = UpdateMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  await updateMember(id, parsed.data);
  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { slug, id } = await params;
  const session = await getTeamSession(slug);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json();
  const parsed = SetMemberPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  await setMemberPassword(id, parsed.data.password);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { slug, id } = await params;
  const session = await getTeamSession(slug);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.memberId === id) {
    return NextResponse.json({ error: 'Vous ne pouvez pas vous supprimer vous-même' }, { status: 400 });
  }
  await deleteMember(id);
  return NextResponse.json({ ok: true });
}
