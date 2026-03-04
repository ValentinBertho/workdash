import { NextRequest, NextResponse } from 'next/server';
import { getManagerTasks, saveManagerTask, updateManagerTask, deleteManagerTask } from '@/lib/data';
import { isManagerAuthenticated } from '@/lib/auth';
import { ManagerTask } from '@/types';

export async function GET() {
  const authed = await isManagerAuthenticated();
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const tasks = await getManagerTasks();
  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const authed = await isManagerAuthenticated();
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { projectId, projectName, label, priority, dueDate, note } = body;
  if (!projectId || !label) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const task: ManagerTask = {
    id: crypto.randomUUID(),
    projectId, projectName: projectName ?? projectId,
    label, priority: priority ?? 'medium',
    dueDate: dueDate || undefined,
    done: false,
    createdAt: new Date().toISOString(),
    note: note || undefined,
  };
  await saveManagerTask(task);
  return NextResponse.json(task);
}

export async function PATCH(req: NextRequest) {
  const authed = await isManagerAuthenticated();
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, ...updates } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  await updateManagerTask(id, updates);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const authed = await isManagerAuthenticated();
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  await deleteManagerTask(id);
  return NextResponse.json({ ok: true });
}
