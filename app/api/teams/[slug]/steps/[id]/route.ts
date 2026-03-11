import { NextRequest, NextResponse } from 'next/server';
import { updateStep, deleteStep } from '@/lib/data';
import { getTeamSession } from '@/lib/auth';
import { UpdateStepSchema } from '@/lib/validations';

type Params = { params: Promise<{ slug: string; id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { slug, id } = await params;
  const session = await getTeamSession(slug);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json();
  const parsed = UpdateStepSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  await updateStep(id, parsed.data);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { slug, id } = await params;
  const session = await getTeamSession(slug);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await deleteStep(id);
  return NextResponse.json({ ok: true });
}
