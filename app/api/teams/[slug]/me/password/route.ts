import { NextRequest, NextResponse } from 'next/server';
import { getTeamSession, verifyPassword } from '@/lib/auth';
import { setMemberPassword, getMemberForAuth } from '@/lib/data';
import { z } from 'zod';

const ChangePasswordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(1).max(100).nullable(),
});

type Params = { params: Promise<{ slug: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const session = await getTeamSession(slug);
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const body = await req.json();
  const parsed = ChangePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  // Verify current password if the member has one
  const member = await getMemberForAuth(slug, session.memberName);
  if (!member) return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 });

  if (member.passwordHash) {
    if (!parsed.data.currentPassword) {
      return NextResponse.json({ error: 'Mot de passe actuel requis' }, { status: 400 });
    }
    const valid = await verifyPassword(parsed.data.currentPassword, member.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Mot de passe actuel incorrect' }, { status: 401 });
    }
  }

  await setMemberPassword(member.id, parsed.data.newPassword);
  return NextResponse.json({ ok: true });
}
