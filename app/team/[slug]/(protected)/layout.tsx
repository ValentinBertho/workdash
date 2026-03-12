import { redirect } from 'next/navigation';
import { getTeamSession } from '@/lib/auth';
import { getTeam } from '@/lib/data';

type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export default async function ProtectedTeamLayout({ children, params }: Props) {
  const { slug } = await params;
  const session = await getTeamSession(slug);
  if (!session) redirect(`/team/${slug}/join`);

  const team = await getTeam(slug);
  if (!team) redirect('/');

  return (
    <div
      style={{ '--accent': team.accentColor, '--accent-light': team.accentColor + '22', '--accent-border': team.accentColor + '66', background: 'var(--bg)' } as React.CSSProperties}
      className="min-h-screen"
    >
      {children}
    </div>
  );
}
