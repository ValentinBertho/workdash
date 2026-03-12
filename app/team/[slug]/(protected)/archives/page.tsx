'use client';
import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Folder, WorkflowStep, TeamMember } from '@/types';
import { Sidebar } from '@/app/components/Sidebar';

export default function ArchivesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/teams/${slug}/folders?archived=only`).then(r => {
        if (r.status === 401) { router.push(`/team/${slug}/join`); return null; }
        return r.json();
      }),
      fetch(`/api/teams/${slug}/steps`).then(r => r.json()),
      fetch(`/api/teams/${slug}/members`).then(r => r.json()),
    ]).then(([fData, sData, mData]) => {
      if (!fData) return;
      setFolders(fData.folders ?? []);
      setSteps(sData.steps ?? []);
      setMembers(mData.members ?? []);
    }).finally(() => setLoading(false));
  }, [slug, router]);

  const restore = async (folderId: string) => {
    setRestoring(folderId);
    await fetch(`/api/teams/${slug}/folders/${folderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: false }),
    });
    setFolders(prev => prev.filter(f => f.id !== folderId));
    setRestoring(null);
  };

  const filtered = folders.filter(f =>
    !search || f.title.toLowerCase().includes(search.toLowerCase()) || f.ref.includes(search)
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)' }}>
        <Sidebar slug={slug} active="folders" members={[]} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      <Sidebar slug={slug} active="folders" members={members} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Header */}
        <header style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '0 20px', height: 52, flexShrink: 0,
          background: 'var(--surface)', borderBottom: '1px solid var(--border)', zIndex: 30,
        }}>
          <Link href={`/team/${slug}`} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: '0.78rem', color: 'var(--text-3)', textDecoration: 'none',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Dossiers
          </Link>
          <span style={{ color: 'var(--border-2)' }}>/</span>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)' }}>Archives</span>
          <span style={{
            fontSize: '0.63rem', fontWeight: 600, padding: '2px 7px', borderRadius: 'var(--r-full)',
            background: 'var(--surface-2)', color: 'var(--text-3)',
          }}>{folders.length}</span>
          <div style={{ flex: 1 }} />
          <div style={{ position: 'relative' }}>
            <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }}
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
              style={{
                paddingLeft: 30, paddingRight: 12, paddingTop: 6, paddingBottom: 6,
                fontSize: '0.8rem', borderRadius: 9, width: 190,
                border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', outline: 'none',
              }}
            />
          </div>
        </header>

        <main style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {filtered.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              height: '50vh', gap: 12, textAlign: 'center',
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: 'var(--surface)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.5" strokeLinecap="round">
                  <path d="m2 8 20-5-5 20-4-9-11-6Z" /><path d="m22 3-9.5 9.5" />
                </svg>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>
                {search ? 'Aucun résultat.' : 'Aucun dossier archivé.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 860, margin: '0 auto' }}>
              {filtered.map(f => {
                const step = f.stepId ? steps.find(s => s.id === f.stepId) : null;
                const assignee = f.assigneeId ? members.find(m => m.id === f.assigneeId) : null;
                return (
                  <div
                    key={f.id}
                    className="slide-up"
                    style={{
                      background: 'var(--surface)', borderRadius: 12, padding: '14px 16px',
                      border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)',
                      display: 'flex', alignItems: 'center', gap: 12, opacity: 0.85,
                    }}
                  >
                    {step && (
                      <div style={{
                        width: 4, height: 32, borderRadius: 2, flexShrink: 0,
                        background: step.color ?? 'var(--border)',
                      }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-4)' }}>{f.ref}</span>
                        {step && (
                          <span className="step-pill" style={{
                            background: `color-mix(in srgb, ${step.color} 12%, var(--surface))`,
                            color: step.color, fontSize: '0.65rem',
                          }}>
                            {step.name}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.title}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {assignee && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', color: 'var(--text-3)' }}>
                            <div className="avatar" style={{ width: 16, height: 16, fontSize: '0.5rem', borderRadius: 4 }}>
                              {assignee.name[0].toUpperCase()}
                            </div>
                            {assignee.name}
                          </span>
                        )}
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-4)' }}>
                          Archivé · {new Date(f.updatedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <Link
                        href={`/team/${slug}/folder/${f.id}`}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '5px 11px', borderRadius: 8, fontSize: '0.75rem',
                          border: '1px solid var(--border)', background: 'var(--surface-2)',
                          color: 'var(--text-3)', textDecoration: 'none', transition: 'all 0.15s',
                        }}
                      >
                        Voir
                      </Link>
                      <button
                        onClick={() => restore(f.id)}
                        disabled={restoring === f.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '5px 11px', borderRadius: 8, fontSize: '0.75rem',
                          border: '1px solid var(--accent)', background: 'var(--accent-light)',
                          color: 'var(--accent)', cursor: 'pointer', transition: 'all 0.15s',
                          opacity: restoring === f.id ? 0.5 : 1,
                        }}
                      >
                        {restoring === f.id ? '…' : 'Restaurer'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
