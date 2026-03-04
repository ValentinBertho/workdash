import { NextRequest, NextResponse } from 'next/server';
import { getDecisions, saveDecision, updateDecision, deleteDecision } from '@/lib/data';
import { isManagerAuthenticated } from '@/lib/auth';
import { DecisionPoint } from '@/types';

export async function GET() {
  const authed = await isManagerAuthenticated();
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(await getDecisions());
}

export async function POST(req: NextRequest) {
  const authed = await isManagerAuthenticated();
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { text } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: 'Missing text' }, { status: 400 });
  const decision: DecisionPoint = {
    id: crypto.randomUUID(), text: text.trim(), status: 'open', createdAt: new Date().toISOString(),
  };
  await saveDecision(decision);
  return NextResponse.json(decision);
}

export async function PATCH(req: NextRequest) {
  const authed = await isManagerAuthenticated();
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, ...updates } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  await updateDecision(id, updates);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const authed = await isManagerAuthenticated();
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  await deleteDecision(id);
  return NextResponse.json({ ok: true });
}
