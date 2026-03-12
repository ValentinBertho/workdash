import { NextRequest, NextResponse } from 'next/server';
import { getTeamSession } from '@/lib/auth';
import { updateFolderTask, deleteFolderTask } from '@/lib/data';

type Params = { params: Promise<{ slug: string; id: string; taskId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { slug, taskId } = await params;
  const session = await getTeamSession(slug);
  if (!session || session.role === 'viewer') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json();
  const updates: Parameters<typeof updateFolderTask>[1] = {};
  if (typeof body.done === 'boolean') updates.done = body.done;
  if (typeof body.title === 'string') updates.title = body.title.trim();
  if ('assigneeId' in body) updates.assigneeId = body.assigneeId ?? null;
  if ('assigneeName' in body) updates.assigneeName = body.assigneeName ?? null;
  if (typeof body.sortOrder === 'number') updates.sortOrder = body.sortOrder;
  await updateFolderTask(taskId, updates);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { slug, taskId } = await params;
  const session = await getTeamSession(slug);
  if (!session || session.role === 'viewer') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await deleteFolderTask(taskId);
  return NextResponse.json({ ok: true });
}
