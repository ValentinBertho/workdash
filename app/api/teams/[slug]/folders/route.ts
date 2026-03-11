import { NextRequest, NextResponse } from 'next/server';
import { getTeamFolders, getTeamSteps, getTeamMembers, createFolder, addHistoryEntry } from '@/lib/data';
import { getTeamSession } from '@/lib/auth';
import { CreateFolderSchema } from '@/lib/validations';

type Params = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const session = await getTeamSession(slug);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const includeArchived = req.nextUrl.searchParams.get('archived') === '1';
  const [folderList, steps, members] = await Promise.all([
    getTeamFolders(slug, session.memberId, includeArchived),
    getTeamSteps(slug),
    getTeamMembers(slug),
  ]);

  return NextResponse.json({ folders: folderList, steps, members });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const session = await getTeamSession(slug);
  if (!session || session.role === 'viewer') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = CreateFolderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const folder = await createFolder({ teamSlug: slug, ...parsed.data });
  await addHistoryEntry({
    folderId: folder.id,
    actorName: session.memberName,
    type: 'step_change',
    payload: { type: 'step_change', toStep: folder.stepName ?? 'Sans étape' },
  });

  return NextResponse.json({ folder }, { status: 201 });
}
