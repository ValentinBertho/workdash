import { NextRequest, NextResponse } from 'next/server';
import { getFolder, addComment, addHistoryEntry } from '@/lib/data';
import { getTeamSession } from '@/lib/auth';
import { AddCommentSchema } from '@/lib/validations';

type Params = { params: Promise<{ slug: string; id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { slug, id } = await params;
  const session = await getTeamSession(slug);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!session.canComment) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const folder = await getFolder(id, session.memberId);
  if (!folder || folder.teamSlug !== slug) {
    return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });
  }

  const body = await req.json();
  const parsed = AddCommentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const comment = await addComment({
    folderId: id,
    authorId: session.memberId,
    authorName: session.memberName,
    text: parsed.data.text,
  });

  await addHistoryEntry({
    folderId: id,
    actorName: session.memberName,
    type: 'comment',
    payload: { type: 'comment', text: parsed.data.text.substring(0, 100) },
  });

  return NextResponse.json({ comment }, { status: 201 });
}
