import { NextRequest, NextResponse } from 'next/server';
import { getTeamSteps, createStep } from '@/lib/data';
import { getTeamSession } from '@/lib/auth';
import { CreateStepSchema } from '@/lib/validations';

type Params = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const session = await getTeamSession(slug);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const steps = await getTeamSteps(slug);
  return NextResponse.json({ steps });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const session = await getTeamSession(slug);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json();
  const parsed = CreateStepSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const step = await createStep({ teamSlug: slug, ...parsed.data });
  return NextResponse.json({ step }, { status: 201 });
}
