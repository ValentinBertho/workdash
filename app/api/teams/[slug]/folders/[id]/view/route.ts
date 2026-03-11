import { NextRequest, NextResponse } from 'next/server';
import { markFolderViewed } from '@/lib/data';
import { getTeamSession } from '@/lib/auth';

type Params = { params: Promise<{ slug: string; id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const { slug, id } = await params;
  const session = await getTeamSession(slug);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await markFolderViewed(session.memberId, id);
  return NextResponse.json({ ok: true });
}
