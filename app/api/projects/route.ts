import { NextRequest, NextResponse } from 'next/server';
import { getData, saveData } from '@/lib/data';
import { isAuthenticated } from '@/lib/auth';

export async function GET() {
  const data = await getData();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  await saveData(body);
  return NextResponse.json({ ok: true });
}
