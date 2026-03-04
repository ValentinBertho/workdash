import { NextResponse } from 'next/server';
import { getChangelog } from '@/lib/data';
import { isManagerAuthenticated } from '@/lib/auth';

export async function GET() {
  const authed = await isManagerAuthenticated();
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const entries = await getChangelog();
  return NextResponse.json(entries);
}
