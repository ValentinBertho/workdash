'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Folder, WorkflowStep, TeamMember } from '@/types';
import { Sidebar } from '@/app/components/Sidebar';

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
  const [view, setView] = useState<View>('kanban');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);

  useEffect(() => {
    fetch(`/api/teams/${slug}/folders`)
      .then(r => {
        if (r.status === 401) { router.push(`/team/${slug}/join`); return null; }
        return r.json();
      })
      .then(data => {
        if (!data) return;
        setFolders(data.folders ?? []);
        setSteps(data.steps ?? []);
        setMembers(data.members ?? []);
      })
      .finally(() => setLoading(false));
  }, [slug, router]);

  const filtered = folders.filter(f => {
    if (!search) return true;
    const q = search.toLowerCase();
    return f.title.toLowerCase().includes(q) || f.ref.includes(q);
  });

  const unreadCount = folders.filter(f => f.hasUnread).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div className="spinner" />
          <p style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>Chargement…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      <Sidebar slug={slug} active="folders" members={members} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Top bar */}
        <header style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '0 20px', height: 52, flexShrink: 0,
          background: 'var(--surface)', borderBottom: '1px solid var(--border)', zIndex: 30,
        }}>
          {/* Breadcrumb + counts */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
              Dossiers
            </span>
            <span style={{
              fontSize: '0.63rem', fontWeight: 600, padding: '2px 7px', borderRadius: 'var(--r-full)',
              background: 'var(--surface-2)', color: 'var(--text-3)',
            }}>
              {folders.length}
            </span>
            {unreadCount > 0 && (
              <span style={{
                fontSize: '0.63rem', fontWeight: 600, padding: '2px 7px', borderRadius: 'var(--r-full)',
                background: 'var(--accent-light)', color: 'var(--accent)',
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
                <span className="unread-dot" style={{ width: 5, height: 5 }} />
                {unreadCount} non lu{unreadCount > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div style={{ flex: 1 }} />

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <svg
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }}
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher…"
              style={{
                paddingLeft: 30, paddingRight: 12, paddingTop: 6, paddingBottom: 6,
                fontSize: '0.8rem', borderRadius: 9, width: 190,
                border: '1px solid var(--border)',
                background: 'var(--surface-2)', color: 'var(--text)',
                outline: 'none', transition: 'border-color 0.15s',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          {/* View toggle */}
          <div style={{
            display: 'flex', background: 'var(--surface-2)',
            borderRadius: 9, padding: 3, border: '1px solid var(--border)',
          }}>
            {([
              { key: 'kanban' as View, label: 'Kanban', icon: <KanbanIcon /> },
              { key: 'list' as View, label: 'Liste', icon: <ListIcon /> },
            ] as const).map(v => (
              <button
                key={v.key}
                onClick={() => setView(v.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '4px 10px', borderRadius: 6, border: 'none',
                  background: view === v.key ? 'var(--surface)' : 'transparent',
                  color: view === v.key ? 'var(--text)' : 'var(--text-3)',
                  fontSize: '0.75rem', fontWeight: view === v.key ? 600 : 400,
                  boxShadow: view === v.key ? 'var(--shadow-xs)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {v.icon}
                {v.label}
              </button>
            ))}
          </div>

          {/* New folder */}
          <button
            onClick={() => setShowNewForm(true)}
            className="btn-primary"
            style={{ padding: '6px 14px', fontSize: '0.8rem' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nouveau
          </button>
        </header>

        {/* Content area */}
        <main style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {filtered.length === 0 && !search ? (
            <EmptyState onNew={() => setShowNewForm(true)} />
          ) : view === 'kanban' ? (
            <KanbanView folders={filtered} steps={steps} slug={slug} />
          ) : (
            <ListView folders={filtered} steps={steps} members={members} slug={slug} />
          )}
        </main>
      </div>

      {showNewForm && (
        <NewFolderModal
          steps={steps} members={members} slug={slug}
          onClose={() => setShowNewForm(false)}
          onCreate={f => { setFolders(prev => [f, ...prev]); setShowNewForm(false); }}
        />
      )}
    </div>
  );
}

/* ─── Empty state ────────────────────────────────────────────── */
function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="scale-in" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '60vh', gap: 16, textAlign: 'center',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 18,
        background: 'var(--surface)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7V5a2 2 0 0 1 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
        </svg>
      </div>
      <div>
        <p style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Aucun dossier</p>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>Créez votre premier dossier pour commencer.</p>
      </div>
      <button className="btn-primary" onClick={onNew} style={{ padding: '8px 18px' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Nouveau dossier
      </button>
    </div>
  );
}

/* ─── Kanban view ────────────────────────────────────────────── */
function KanbanView({ folders, steps, slug }: { folders: Folder[]; steps: WorkflowStep[]; slug: string }) {
  const noStep = folders.filter(f => !f.stepId);
  const allCols = [
    ...steps.map(s => ({ id: s.id, name: s.name, color: s.color, items: folders.filter(f => f.stepId === s.id) })),
    ...(noStep.length > 0 ? [{ id: null, name: 'Sans étape', color: 'var(--border-2)', items: noStep }] : []),
  ];

  return (
    <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 16, alignItems: 'flex-start', minHeight: 400 }}>
      {allCols.map((col, colIdx) => (
        <div
          key={col.id ?? '__none'}
          className={`slide-up stagger-${Math.min(colIdx + 1, 5)}`}
          style={{ minWidth: 268, maxWidth: 300, flexShrink: 0 }}
        >
          {/* Column header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
            padding: '6px 10px 6px 0',
          }}>
            <span className="step-dot" style={{ background: col.color }} />
            <span style={{
              fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.06em', color: 'var(--text-2)',
            }}>
              {col.name}
            </span>
            <span style={{
              fontSize: '0.65rem', fontWeight: 600, marginLeft: 'auto',
              padding: '1px 7px', borderRadius: 'var(--r-full)',
              background: col.items.length > 0 ? 'color-mix(in srgb, ' + col.color + ' 14%, var(--surface))' : 'var(--surface-2)',
              color: col.items.length > 0 ? col.color : 'var(--text-4)',
              border: '1px solid color-mix(in srgb, ' + col.color + ' 18%, var(--border))',
            }}>
              {col.items.length}
            </span>
          </div>

          {/* Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {col.items.map(f => (
              <FolderCard key={f.id} folder={f} slug={slug} stepColor={col.color} />
            ))}
            {col.items.length === 0 && (
              <div style={{
                border: '1.5px dashed var(--border)',
                borderRadius: 12, padding: '24px 0', textAlign: 'center',
              }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-4)' }}>Aucun dossier</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Folder card (kanban) ───────────────────────────────────── */
function FolderCard({ folder: f, slug, stepColor }: { folder: Folder; slug: string; stepColor: string }) {
  const stale = staleDays(f.lastActivityAt);
  const isOverdue = f.dueDate && new Date(f.dueDate) < new Date();
  const priorityColor = f.priority >= 70 ? '#dc2626' : f.priority >= 40 ? '#d97706' : '#16a34a';
  const priorityLabel = f.priority >= 70 ? 'Haute' : f.priority >= 40 ? 'Moyenne' : 'Faible';

  return (
    <Link
      href={`/team/${slug}/folder/${f.id}`}
      style={{
        textDecoration: 'none', display: 'block',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${stepColor}`,
        borderRadius: 12, padding: '13px 13px 11px',
        boxShadow: 'var(--shadow-sm)',
        transition: 'box-shadow 0.2s, transform 0.15s',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.boxShadow = 'var(--shadow-md)';
        el.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.boxShadow = 'var(--shadow-sm)';
        el.style.transform = 'translateY(0)';
      }}
    >
      {/* Ref + unread */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-4)', letterSpacing: '0.02em' }}>
          {f.ref}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {stale > 7 && <span className="stale-red" style={{ fontSize: '0.62rem' }}>{stale}j</span>}
          {stale > 3 && stale <= 7 && <span className="stale-orange" style={{ fontSize: '0.62rem' }}>{stale}j</span>}
          {f.hasUnread && <span className="unread-dot" />}
        </div>
      </div>

      {/* Title */}
      <p style={{
        fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)',
        lineHeight: 1.4, marginBottom: 10,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {f.title}
      </p>

      {/* Meta row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {f.assigneeName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div
              className="avatar"
              style={{ width: 18, height: 18, fontSize: '0.55rem', borderRadius: 4 }}
            >
              {f.assigneeName.slice(0, 1).toUpperCase()}
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontWeight: 500 }}>
              {f.assigneeName.split(' ')[0]}
            </span>
          </div>
        )}

        {f.dueDate && (
          <span style={{
            fontSize: '0.7rem', fontWeight: 500,
            color: isOverdue ? '#dc2626' : 'var(--text-3)',
          }}>
            {isOverdue && '⚠ '}
            {new Date(f.dueDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
          </span>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginLeft: 'auto' }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: priorityColor, display: 'inline-block', flexShrink: 0,
          }} />
          <span style={{ fontSize: '0.65rem', color: priorityColor, fontWeight: 500 }}>{priorityLabel}</span>
        </div>
      </div>

      {/* Tags */}
      {f.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
          {f.tags.slice(0, 3).map(t => (
            <span key={t} className="tag">{t}</span>
          ))}
          {f.tags.length > 3 && (
            <span style={{ fontSize: '0.6rem', color: 'var(--text-4)', alignSelf: 'center' }}>
              +{f.tags.length - 3}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}

/* ─── List view ──────────────────────────────────────────────── */
function ListView({ folders, steps, members, slug }: { folders: Folder[]; steps: WorkflowStep[]; members: TeamMember[]; slug: string }) {
  const stepMap = Object.fromEntries(steps.map(s => [s.id, s]));

  return (
    <div className="slide-up" style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 16, overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
            {['Réf.', 'Dossier', 'Étape', 'Responsable', 'Priorité', 'Échéance', 'Activité'].map(h => (
              <th key={h} style={{
                padding: '9px 14px', textAlign: 'left',
                fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-3)',
                textTransform: 'uppercase', letterSpacing: '0.07em',
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {folders.map((f, i) => {
            const stale = staleDays(f.lastActivityAt);
            const isOverdue = f.dueDate && new Date(f.dueDate) < new Date();
            const step = f.stepId ? stepMap[f.stepId] : null;

            return (
              <tr
                key={f.id}
                onClick={() => window.location.href = `/team/${slug}/folder/${f.id}`}
                style={{
                  borderBottom: i < folders.length - 1 ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer', transition: 'background 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-4)' }}>
                  {f.ref}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    {f.hasUnread && <span className="unread-dot" />}
                    <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text)' }}>
                      {f.title}
                    </span>
                    {f.tags.slice(0, 2).map(t => (
                      <span key={t} className="tag">{t}</span>
                    ))}
                  </div>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  {step ? (
                    <span className="step-pill" style={{
                      background: `color-mix(in srgb, ${step.color} 12%, var(--surface))`,
                      color: step.color,
                    }}>
                      <span className="step-dot" style={{ background: step.color, width: 5, height: 5 }} />
                      {step.name}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-4)', fontSize: '0.75rem' }}>—</span>
                  )}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  {f.assigneeName ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div className="avatar" style={{ width: 20, height: 20, fontSize: '0.58rem', borderRadius: 5 }}>
                        {f.assigneeName.slice(0, 1).toUpperCase()}
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>{f.assigneeName}</span>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-4)', fontSize: '0.75rem' }}>—</span>
                  )}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <PriorityBadge priority={f.priority} />
                </td>
                <td style={{ padding: '10px 14px', fontSize: '0.78rem', color: isOverdue ? '#dc2626' : 'var(--text-3)' }}>
                  {f.dueDate
                    ? new Date(f.dueDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
                    : '—'}
                </td>
                <td style={{
                  padding: '10px 14px', fontSize: '0.75rem',
                  color: stale > 7 ? '#dc2626' : stale > 3 ? '#d97706' : 'var(--text-3)',
                }}>
                  {relTime(f.lastActivityAt)}
                </td>
              </tr>
            );
          })}
          {folders.length === 0 && (
            <tr>
              <td colSpan={7} style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.82rem' }}>
                Aucun dossier trouvé.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Priority badge ─────────────────────────────────────────── */
function PriorityBadge({ priority }: { priority: number }) {
  const color = priority >= 70 ? '#dc2626' : priority >= 40 ? '#d97706' : '#16a34a';
  const label = priority >= 70 ? 'Haute' : priority >= 40 ? 'Moyenne' : 'Faible';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block' }} />
      {label}
    </span>
  );
}

/* ─── Icons ──────────────────────────────────────────────────── */
function KanbanIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="3" width="5" height="18" rx="1" /><rect x="10" y="3" width="5" height="13" rx="1" /><rect x="17" y="3" width="4" height="9" rx="1" />
    </svg>
  );
}
function ListIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

/* ─── New folder modal ───────────────────────────────────────── */
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
      body: JSON.stringify({
        title,
        stepId: stepId || undefined,
        assigneeId: assigneeId || undefined,
        dueDate: dueDate || undefined,
      }),
    });
    const data = await res.json();
    if (res.ok) onCreate(data.folder);
    setLoading(false);
  };

  const selectStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 10,
    border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)',
    fontSize: '0.85rem', outline: 'none',
  };

  return (
    <div
      className="fade-in"
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        className="scale-in"
        style={{
          width: '100%', maxWidth: 440,
          background: 'var(--surface)', borderRadius: 20,
          padding: 24, boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--border)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
              Nouveau dossier
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 2 }}>
              Il sera ajouté en tête de liste.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 8, border: 'none',
              background: 'var(--surface-2)', color: 'var(--text-3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1rem', transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-2)')}
          >
            ×
          </button>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            required autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Titre du dossier…"
            className="field-input"
            style={{ fontSize: '0.9rem', fontWeight: 500 }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
                Étape
              </label>
              <select value={stepId} onChange={e => setStepId(e.target.value)} style={selectStyle}>
                <option value="">Sans étape</option>
                {steps.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
                Responsable
              </label>
              <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)} style={selectStyle}>
                <option value="">Non assigné</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
              Échéance
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="field-input"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="btn-primary"
            style={{ width: '100%', padding: '11px 0', fontSize: '0.875rem', marginTop: 4, justifyContent: 'center' }}
          >
            {loading ? 'Création…' : 'Créer le dossier'}
          </button>
        </form>
      </div>
    </div>
  );
}
