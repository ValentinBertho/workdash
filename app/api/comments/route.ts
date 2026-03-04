import { NextRequest, NextResponse } from 'next/server';
import { getComments, saveComment, deleteComment } from '@/lib/data';
import { isAuthenticated } from '@/lib/auth';

export async function GET() {
  const comments = await getComments();
  return NextResponse.json(comments);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { text, projectId, author } = body;
  if (!text || !projectId || !author) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  const comment = {
    id: crypto.randomUUID(),
    projectId,
    author,
    text,
    createdAt: new Date().toISOString(),
  };
  await saveComment(comment);
  return NextResponse.json(comment);
}

export async function DELETE(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await req.json();
  await deleteComment(id);
  return NextResponse.json({ ok: true });
}
