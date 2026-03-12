import { NextRequest, NextResponse } from 'next/server';
import { getTeamSession } from '@/lib/auth';
import { getFolderTasks, createFolderTask } from '@/lib/data';

type Params = { params: Promise<{ slug: string; id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug, id } = await params;
  const session = await getTeamSession(slug);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const tasks = await getFolderTasks(id);
  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { slug, id } = await params;
  const session = await getTeamSession(slug);
  if (!session || session.role === 'viewer') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json();
  const { title, assigneeId, assigneeName, sortOrder } = body;
  if (!title?.trim()) {
    return NextResponse.json({ error: 'Le titre est requis' }, { status: 400 });
  }
  const task = await createFolderTask({
    folderId: id,
    title: title.trim(),
    assigneeId: assigneeId || undefined,
    assigneeName: assigneeName || undefined,
    sortOrder: sortOrder ?? 0,
  });
  return NextResponse.json({ task }, { status: 201 });
}
