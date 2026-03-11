'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Folder, WorkflowStep, TeamMember, TeamSession } from '@/types';

type View = 'kanban' | 'list';

function relTime(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return 'auj.';
  if (d === 1) return 'hier';
  return `${d}j`;
}

function staleDays(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export default function TeamPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();

  const [folders, setFolders] = useState<Folder[]>([]);
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [session, setSession] = useState<TeamSession | null>(null);
  const [view, setView] = useState<View>('kanban');
  const [search, setSearch] = useState('');
  const [myOnly, setMyOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);

  useEffect(() => {
    // Get session info from cookie-validated API
    fetch(`/api/teams/${slug}/folders`)
      .then(r => {
        if (r.status === 401) { router.push(`/team/${slug}/join`); return null; }
        return r.json();
      })
      .then(data => {
        if (!data) return;
        setFolders(data.folders);
        setSteps(data.steps);
        setMembers(data.members);
      })
      .finally(() => setLoading(false));

    // Get session details
    fetch(`/api/teams/${slug}/members`).then(r => r.json()).then(({ members }) => {
      // Session info is baked into cookies; we get the current user from the server
    });
  }, [slug, router]);

  const filtered = folders.filter(f => {
    if (search && !f.title.toLowerCase().includes(search.toLowerCase()) && !f.ref.includes(search)) return false;
    return true;
  });

  const logout = async () => {
    await fetch(`/api/teams/${slug}/auth`, { method: 'DELETE' });
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>Chargement…</p>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* Header */}
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ borderTop: '3px solid var(--accent)' }} />
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', gap: 12, height: 52 }}>
          <Link href="/" className="font-bold text-base" style={{ color: 'var(--text)', textDecoration: 'none' }}>
            Work<span style={{ color: 'var(--accent)' }}>Dash</span>
          </Link>
          <span style={{ color: 'var(--border-2)' }}>/</span>
          <span className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>{slug}</span>

          <div style={{ flex: 1 }} />

          {/* Search */}
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--text-3)' }}>
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="pl-8 pr-3 py-1.5 text-sm rounded-lg border outline-none"
              style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--text)', width: 180 }}
            />
          </div>

          {/* View toggle */}
          <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
            {(['kanban', 'list'] as View[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  background: view === v ? 'var(--accent)' : 'var(--surface-2)',
                  color: view === v ? 'white' : 'var(--text-3)',
                }}
              >
                {v === 'kanban' ? '⬛ Kanban' : '☰ Liste'}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowNewForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold"
            style={{ background: 'var(--accent)' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14" /></svg>
            Nouveau dossier
          </button>

          <Link href={`/team/${slug}/admin`} className="text-xs px-3 py-1.5 rounded-lg border" style={{ borderColor: 'var(--border)', color: 'var(--text-3)', textDecoration: 'none' }}>
            Admin
          </Link>

          <button onClick={logout} className="text-xs" style={{ color: 'var(--text-3)' }}>
            Déco.
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '20px' }}>
        {view === 'kanban'
          ? <KanbanView folders={filtered} steps={steps} slug={slug} />
          : <ListView folders={filtered} steps={steps} members={members} slug={slug} />
        }
      </main>

      {showNewForm && (
        <NewFolderModal
          steps={steps}
          members={members}
          slug={slug}
          onClose={() => setShowNewForm(false)}
          onCreate={f => {
            setFolders(prev => [f, ...prev]);
            setShowNewForm(false);
          }}
        />
      )}
    </div>
  );
}

/* ─── Kanban view ─────────────────────────────────────────────── */
function KanbanView({ folders, steps, slug }: { folders: Folder[]; steps: WorkflowStep[]; slug: string }) {
  const noStep = folders.filter(f => !f.stepId);
  return (
    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12, alignItems: 'flex-start' }}>
      {steps.map(step => {
        const cols = folders.filter(f => f.stepId === step.id);
        return (
          <div key={step.id} style={{ minWidth: 260, maxWidth: 300, flexShrink: 0 }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="step-dot" style={{ background: step.color }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-2)' }}>{step.name}</span>
              <span className="text-xs ml-auto" style={{ color: 'var(--text-3)' }}>{cols.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cols.map(f => <FolderCard key={f.id} folder={f} slug={slug} />)}
              {cols.length === 0 && (
                <div style={{ border: '1px dashed var(--border)', borderRadius: 12, padding: '20px 0', textAlign: 'center' }}>
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>Vide</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
      {noStep.length > 0 && (
        <div style={{ minWidth: 260, flexShrink: 0 }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="step-dot" style={{ background: 'var(--border-2)' }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Sans étape</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {noStep.map(f => <FolderCard key={f.id} folder={f} slug={slug} />)}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── List view ───────────────────────────────────────────────── */
function ListView({ folders, steps, members, slug }: { folders: Folder[]; steps: WorkflowStep[]; members: TeamMember[]; slug: string }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
            {['Réf.', 'Dossier', 'Étape', 'Responsable', 'Priorité', 'Échéance', 'Activité'].map(h => (
              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {folders.map(f => {
            const stale = staleDays(f.lastActivityAt);
            return (
              <tr
                key={f.id}
                onClick={() => window.location.href = `/team/${slug}/folder/${f.id}`}
                style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-3)' }}>{f.ref}</td>
                <td style={{ padding: '10px 14px' }}>
                  <div className="flex items-center gap-2">
                    {f.hasUnread && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--accent)' }} />}
                    <span style={{ fontSize: '0.83rem', fontWeight: 500, color: 'var(--text)' }}>{f.title}</span>
                  </div>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  {f.stepName ? (
                    <span className="flex items-center gap-1.5 text-xs font-medium">
                      <span className="step-dot" style={{ background: f.stepColor }} />
                      {f.stepName}
                    </span>
                  ) : <span style={{ color: 'var(--text-3)', fontSize: '0.75rem' }}>—</span>}
                </td>
                <td style={{ padding: '10px 14px', fontSize: '0.8rem', color: 'var(--text-2)' }}>{f.assigneeName ?? '—'}</td>
                <td style={{ padding: '10px 14px' }}>
                  <PriorityDot priority={f.priority} />
                </td>
                <td style={{ padding: '10px 14px', fontSize: '0.78rem', color: f.dueDate && new Date(f.dueDate) < new Date() ? '#ef4444' : 'var(--text-3)' }}>
                  {f.dueDate ? new Date(f.dueDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '—'}
                </td>
                <td style={{ padding: '10px 14px', fontSize: '0.75rem', color: stale > 7 ? '#ef4444' : stale > 3 ? '#f59e0b' : 'var(--text-3)' }}>
                  {relTime(f.lastActivityAt)}
                </td>
              </tr>
            );
          })}
          {folders.length === 0 && (
            <tr>
              <td colSpan={7} style={{ padding: '40px', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-3)' }}>
                Aucun dossier
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Folder card (Kanban) ────────────────────────────────────── */
function FolderCard({ folder: f, slug }: { folder: Folder; slug: string }) {
  const stale = staleDays(f.lastActivityAt);
  return (
    <Link
      href={`/team/${slug}/folder/${f.id}`}
      style={{ textDecoration: 'none', display: 'block', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px', boxShadow: 'var(--shadow-sm)', transition: 'box-shadow 0.15s' }}
      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)')}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)')}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-3)' }}>{f.ref}</span>
        {f.hasUnread && <span className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5" style={{ background: 'var(--accent)' }} />}
      </div>
      <p style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1.35, marginBottom: 8 }}>{f.title}</p>
      <div className="flex items-center gap-2 flex-wrap">
        {f.assigneeName && (
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>
            {f.assigneeName}
          </span>
        )}
        {f.dueDate && (
          <span className="text-xs" style={{ color: new Date(f.dueDate) < new Date() ? '#ef4444' : 'var(--text-3)' }}>
            {new Date(f.dueDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
          </span>
        )}
        <span
          className="text-xs ml-auto"
          style={{ color: stale > 7 ? '#ef4444' : stale > 3 ? '#f59e0b' : 'var(--text-3)' }}
          title={`Dernière activité il y a ${stale} jours`}
        >
          {stale > 0 ? `${stale}j` : 'auj.'}
        </span>
      </div>
      {f.tags.length > 0 && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {f.tags.slice(0, 3).map(t => (
            <span key={t} className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--accent-light)', color: 'var(--accent)', fontSize: '0.6rem' }}>
              {t}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}

/* ─── Priority dot ────────────────────────────────────────────── */
function PriorityDot({ priority }: { priority: number }) {
  const color = priority >= 70 ? '#ef4444' : priority >= 40 ? '#f59e0b' : '#10b981';
  const label = priority >= 70 ? 'Haute' : priority >= 40 ? 'Moyenne' : 'Faible';
  return (
    <span className="flex items-center gap-1.5 text-xs" style={{ color }}>
      <span className="step-dot" style={{ background: color }} />
      {label}
    </span>
  );
}

/* ─── New folder modal ────────────────────────────────────────── */
function NewFolderModal({ steps, members, slug, onClose, onCreate }: {
  steps: WorkflowStep[];
  members: TeamMember[];
  slug: string;
  onClose: () => void;
  onCreate: (f: Folder) => void;
}) {
  const [title, setTitle] = useState('');
  const [stepId, setStepId] = useState(steps[0]?.id ?? '');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch(`/api/teams/${slug}/folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, stepId: stepId || undefined, assigneeId: assigneeId || undefined, dueDate: dueDate || undefined }),
    });
    const data = await res.json();
    if (res.ok) onCreate(data.folder);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold" style={{ color: 'var(--text)' }}>Nouveau dossier</h2>
          <button onClick={onClose} style={{ color: 'var(--text-3)', background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input
            required autoFocus
            value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Titre du dossier…"
            className="w-full px-3 py-2.5 rounded-lg text-sm border outline-none"
            style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }}
          />
          <div className="grid grid-cols-2 gap-3">
            <select value={stepId} onChange={e => setStepId(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }}>
              <option value="">Sans étape</option>
              {steps.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }}>
              <option value="">Non assigné</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
            style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }}
          />
          <button type="submit" disabled={loading || !title.trim()}
            className="w-full py-2.5 rounded-xl font-semibold text-white text-sm disabled:opacity-50"
            style={{ background: 'var(--accent)' }}>
            {loading ? 'Création…' : 'Créer le dossier'}
          </button>
        </form>
      </div>
    </div>
  );
}
