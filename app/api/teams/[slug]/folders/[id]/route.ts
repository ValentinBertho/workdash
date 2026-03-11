import { NextRequest, NextResponse } from 'next/server';
import { getFolder, updateFolder, getFolderComments, getFolderHistory, addHistoryEntry } from '@/lib/data';
import { getTeamSession } from '@/lib/auth';
import { UpdateFolderSchema } from '@/lib/validations';

type Params = { params: Promise<{ slug: string; id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug, id } = await params;
  const session = await getTeamSession(slug);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [folder, comments, history] = await Promise.all([
    getFolder(id, session.memberId),
    getFolderComments(id),
    getFolderHistory(id),
  ]);

  if (!folder || folder.teamSlug !== slug) {
    return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });
  }

  return NextResponse.json({ folder, comments, history });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { slug, id } = await params;
  const session = await getTeamSession(slug);
  if (!session || session.role === 'viewer') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = UpdateFolderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const before = await getFolder(id, session.memberId);
  if (!before || before.teamSlug !== slug) {
    return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });
  }

  await updateFolder(id, parsed.data);

  // Record history for significant changes
  if (parsed.data.stepId !== undefined && parsed.data.stepId !== before.stepId) {
    await addHistoryEntry({
      folderId: id,
      actorName: session.memberName,
      type: 'step_change',
      payload: {
        type: 'step_change',
        fromStep: before.stepName,
        toStep: parsed.data.stepId ?? 'Sans étape',
      },
    });
  }
  if (parsed.data.assigneeId !== undefined && parsed.data.assigneeId !== before.assigneeId) {
    await addHistoryEntry({
      folderId: id,
      actorName: session.memberName,
      type: 'assignment',
      payload: {
        type: 'assignment',
        fromMember: before.assigneeName,
        toMember: parsed.data.assigneeId ?? undefined,
      },
    });
  }
  if (parsed.data.priority !== undefined && parsed.data.priority !== before.priority) {
    await addHistoryEntry({
      folderId: id,
      actorName: session.memberName,
      type: 'priority_change',
      payload: { type: 'priority_change', from: before.priority, to: parsed.data.priority },
    });
  }
  if (parsed.data.dueDate !== undefined && parsed.data.dueDate !== before.dueDate) {
    await addHistoryEntry({
      folderId: id,
      actorName: session.memberName,
      type: 'due_date_change',
      payload: {
        type: 'due_date_change',
        from: before.dueDate,
        to: parsed.data.dueDate ?? undefined,
      },
    });
  }

  const updated = await getFolder(id, session.memberId);
  return NextResponse.json({ folder: updated });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { slug, id } = await params;
  const session = await getTeamSession(slug);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const folder = await getFolder(id, session.memberId);
  if (!folder || folder.teamSlug !== slug) {
    return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });
  }

  await updateFolder(id, { archived: true });
  return NextResponse.json({ ok: true });
}
