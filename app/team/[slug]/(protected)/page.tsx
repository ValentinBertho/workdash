'use client';
import { useState, useEffect, use, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Folder, WorkflowStep, TeamMember, TeamSession } from '@/types';
import { Sidebar } from '@/app/components/Sidebar';

type View = 'kanban' | 'list' | 'calendar';

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
  const [session, setSession] = useState<Pick<TeamSession, 'memberId' | 'memberName' | 'role'> | null>(null);
  const [view, setView] = useState<View>('kanban');
  const [search, setSearch] = useState('');
  const [myOnly, setMyOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Advanced filters
  const [filterStep, setFilterStep] = useState('');
  const [filterMember, setFilterMember] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);

  const activeFilters = [filterStep, filterMember, filterPriority, filterTag].filter(Boolean).length;

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
        setSession(data.session ?? null);
      })
      .finally(() => setLoading(false));
  }, [slug, router]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key) {
        case 'n': e.preventDefault(); setShowNewForm(true); break;
        case 'k': e.preventDefault(); setView('kanban'); break;
        case 'l': e.preventDefault(); setView('list'); break;
        case 'c': e.preventDefault(); setView('calendar'); break;
        case 'f': e.preventDefault(); searchRef.current?.focus(); break;
        case '?': e.preventDefault(); setShowShortcuts(v => !v); break;
        case 'Escape': setShowShortcuts(false); setShowFilters(false); break;
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleMove = useCallback(async (folderId: string, newStepId: string | null) => {
    setFolders(prev => prev.map(f => {
      if (f.id !== folderId) return f;
      const step = steps.find(s => s.id === newStepId);
      return { ...f, stepId: newStepId ?? undefined, stepName: step?.name, stepColor: step?.color };
    }));
    await fetch(`/api/teams/${slug}/folders/${folderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stepId: newStepId ?? null }),
    });
  }, [slug, steps]);

  const allTags = Array.from(new Set(folders.flatMap(f => f.tags))).sort();

  const filtered = folders.filter(f => {
    if (myOnly && session && f.assigneeId !== session.memberId) return false;
    if (filterStep) {
      if (filterStep === '__none' && f.stepId) return false;
      if (filterStep !== '__none' && f.stepId !== filterStep) return false;
    }
    if (filterMember) {
      if (filterMember === '__none' && f.assigneeId) return false;
      if (filterMember !== '__none' && f.assigneeId !== filterMember) return false;
    }
    if (filterPriority) {
      if (filterPriority === 'high' && f.priority < 70) return false;
      if (filterPriority === 'medium' && (f.priority < 40 || f.priority >= 70)) return false;
      if (filterPriority === 'low' && f.priority >= 40) return false;
    }
    if (filterTag && !f.tags.includes(filterTag)) return false;
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

  const selectStyle: React.CSSProperties = {
    padding: '6px 10px', borderRadius: 8, fontSize: '0.78rem',
    border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)',
    outline: 'none',
  };

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

          {/* Advanced filter toggle */}
          <button
            onClick={() => setShowFilters(v => !v)}
            title="Filtres avancés"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 11px', borderRadius: 9, fontSize: '0.78rem',
              border: `1px solid ${activeFilters > 0 ? 'var(--accent)' : 'var(--border)'}`,
              background: activeFilters > 0 ? 'var(--accent-light)' : 'var(--surface-2)',
              color: activeFilters > 0 ? 'var(--accent)' : 'var(--text-3)',
              fontWeight: activeFilters > 0 ? 600 : 400, transition: 'all 0.15s',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            Filtres
            {activeFilters > 0 && (
              <span style={{
                background: 'var(--accent)', color: '#fff',
                borderRadius: 'var(--r-full)', fontSize: '0.6rem', fontWeight: 700,
                padding: '1px 5px', lineHeight: 1.4,
              }}>{activeFilters}</span>
            )}
          </button>

          {/* My folders filter */}
          {session && (
            <button
              onClick={() => setMyOnly(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 9, fontSize: '0.78rem',
                border: `1px solid ${myOnly ? 'var(--accent)' : 'var(--border)'}`,
                background: myOnly ? 'var(--accent-light)' : 'var(--surface-2)',
                color: myOnly ? 'var(--accent)' : 'var(--text-3)',
                fontWeight: myOnly ? 600 : 400, transition: 'all 0.15s',
              }}
            >
              <div className="avatar" style={{ width: 16, height: 16, fontSize: '0.5rem', borderRadius: 4 }}>
                {session.memberName.slice(0, 1).toUpperCase()}
              </div>
              Mes dossiers
            </button>
          )}

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <svg
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }}
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              ref={searchRef}
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
              { key: 'calendar' as View, label: 'Calendrier', icon: <CalendarIcon /> },
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

          {/* Keyboard shortcuts hint */}
          <button
            onClick={() => setShowShortcuts(v => !v)}
            title="Raccourcis clavier (?)"
            style={{
              width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--surface-2)', color: 'var(--text-3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0,
            }}
          >
            ?
          </button>

          {/* Change password */}
          {session && (
            <button
              onClick={() => setShowPasswordModal(true)}
              title="Changer mon mot de passe"
              style={{
                width: 32, height: 32, borderRadius: 9, border: '1px solid var(--border)',
                background: 'var(--surface-2)', color: 'var(--text-3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-3)'; }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </button>
          )}

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

        {/* Filter panel */}
        {showFilters && (
          <div style={{
            padding: '10px 20px', background: 'var(--surface)',
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 4 }}>
              Filtres :
            </span>
            <select value={filterStep} onChange={e => setFilterStep(e.target.value)} style={selectStyle}>
              <option value="">Toutes les étapes</option>
              <option value="__none">Sans étape</option>
              {steps.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={filterMember} onChange={e => setFilterMember(e.target.value)} style={selectStyle}>
              <option value="">Tous les membres</option>
              <option value="__none">Non assigné</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={selectStyle}>
              <option value="">Toutes priorités</option>
              <option value="high">Haute</option>
              <option value="medium">Moyenne</option>
              <option value="low">Faible</option>
            </select>
            {allTags.length > 0 && (
              <select value={filterTag} onChange={e => setFilterTag(e.target.value)} style={selectStyle}>
                <option value="">Tous les tags</option>
                {allTags.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
            {activeFilters > 0 && (
              <button
                onClick={() => { setFilterStep(''); setFilterMember(''); setFilterPriority(''); setFilterTag(''); }}
                style={{
                  padding: '5px 10px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600,
                  border: '1px solid var(--border)', background: 'none', color: 'var(--text-3)',
                  cursor: 'pointer',
                }}
              >
                Réinitialiser
              </button>
            )}
            <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-3)' }}>
              {filtered.length} / {folders.length} dossier{folders.length > 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Content area */}
        <main style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {filtered.length === 0 && !search && !activeFilters ? (
            <EmptyState onNew={() => setShowNewForm(true)} />
          ) : view === 'kanban' ? (
            <KanbanView folders={filtered} steps={steps} slug={slug} onMove={handleMove} />
          ) : view === 'calendar' ? (
            <CalendarView folders={filtered} slug={slug} />
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

      {showPasswordModal && session && (
        <ChangePasswordModal
          slug={slug}
          onClose={() => setShowPasswordModal(false)}
        />
      )}

      {showShortcuts && (
        <ShortcutsOverlay onClose={() => setShowShortcuts(false)} />
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
function KanbanView({
  folders, steps, slug, onMove,
}: {
  folders: Folder[];
  steps: WorkflowStep[];
  slug: string;
  onMove: (folderId: string, newStepId: string | null) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  const noStep = folders.filter(f => !f.stepId);
  const allCols = [
    ...steps.map(s => ({ id: s.id, name: s.name, color: s.color, items: folders.filter(f => f.stepId === s.id) })),
    ...(noStep.length > 0 ? [{ id: null as string | null, name: 'Sans étape', color: 'var(--border-2)', items: noStep }] : []),
  ];

  const handleDrop = (colId: string | null) => {
    if (dragId) onMove(dragId, colId);
    setDragId(null);
    setOverCol(null);
  };

  return (
    <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 16, alignItems: 'flex-start', minHeight: 400 }}>
      {allCols.map((col, colIdx) => (
        <div
          key={col.id ?? '__none'}
          className={`slide-up stagger-${Math.min(colIdx + 1, 5)}`}
          style={{ minWidth: 268, maxWidth: 300, flexShrink: 0 }}
          onDragOver={e => { e.preventDefault(); setOverCol(col.id ?? '__none'); }}
          onDragLeave={() => setOverCol(null)}
          onDrop={() => handleDrop(col.id)}
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

          {/* Drop zone */}
          <div
            style={{
              display: 'flex', flexDirection: 'column', gap: 8,
              minHeight: 60, borderRadius: 12, padding: 4, margin: -4,
              transition: 'background 0.15s',
              background: overCol === (col.id ?? '__none') && dragId ? 'color-mix(in srgb, var(--accent) 6%, transparent)' : 'transparent',
              border: overCol === (col.id ?? '__none') && dragId ? '1.5px dashed var(--accent)' : '1.5px dashed transparent',
            }}
          >
            {col.items.map(f => (
              <FolderCard
                key={f.id} folder={f} slug={slug} stepColor={col.color}
                onDragStart={() => setDragId(f.id)}
                onDragEnd={() => { setDragId(null); setOverCol(null); }}
                isDragging={dragId === f.id}
              />
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
function FolderCard({
  folder: f, slug, stepColor, onDragStart, onDragEnd, isDragging,
}: {
  folder: Folder;
  slug: string;
  stepColor: string;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
}) {
  const stale = staleDays(f.lastActivityAt);
  const isOverdue = f.dueDate && new Date(f.dueDate) < new Date();
  const priorityColor = f.priority >= 70 ? '#dc2626' : f.priority >= 40 ? '#d97706' : '#16a34a';
  const priorityLabel = f.priority >= 70 ? 'Haute' : f.priority >= 40 ? 'Moyenne' : 'Faible';

  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart?.(); }}
      onDragEnd={onDragEnd}
      style={{ opacity: isDragging ? 0.4 : 1, transition: 'opacity 0.15s' }}
    >
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
          cursor: 'grab',
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
        onClick={e => { if (isDragging) e.preventDefault(); }}
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
              <div className="avatar" style={{ width: 18, height: 18, fontSize: '0.55rem', borderRadius: 4 }}>
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
    </div>
  );
}

/* ─── Calendar view ──────────────────────────────────────────── */
function CalendarView({ folders, slug }: { folders: Folder[]; slug: string }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // Mon=0
  const daysInMonth = lastDay.getDate();

  const foldersByDay: Record<number, Folder[]> = {};
  folders.forEach(f => {
    if (!f.dueDate) return;
    const d = new Date(f.dueDate);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!foldersByDay[day]) foldersByDay[day] = [];
      foldersByDay[day].push(f);
    }
  });

  const monthName = firstDay.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  return (
    <div className="slide-up" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
      {/* Month nav */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '14px 18px',
        borderBottom: '1px solid var(--border)', gap: 12,
      }}>
        <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '4px 8px', borderRadius: 8, fontSize: '1rem' }}>‹</button>
        <span style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)', textTransform: 'capitalize', letterSpacing: '-0.01em' }}>
          {monthName}
        </span>
        <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '4px 8px', borderRadius: 8, fontSize: '1rem' }}>›</button>
        <button
          onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }}
          style={{
            padding: '4px 10px', borderRadius: 7, border: '1px solid var(--border)',
            background: 'var(--surface-2)', color: 'var(--text-3)', fontSize: '0.72rem', cursor: 'pointer',
          }}
        >
          Aujourd'hui
        </button>
      </div>

      {/* Week day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
        {weekDays.map(d => (
          <div key={d} style={{
            padding: '8px 0', textAlign: 'center',
            fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-3)',
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {cells.map((day, i) => {
          const isToday = day !== null && day === today.getDate() && year === today.getFullYear() && month === today.getMonth();
          const dayFolders = day ? (foldersByDay[day] ?? []) : [];
          return (
            <div
              key={i}
              style={{
                minHeight: 90, padding: '6px 8px',
                borderRight: (i + 1) % 7 !== 0 ? '1px solid var(--border)' : 'none',
                borderBottom: i < cells.length - 7 ? '1px solid var(--border)' : 'none',
                background: day === null ? 'var(--surface-2)' : 'var(--surface)',
                opacity: day === null ? 0.5 : 1,
              }}
            >
              {day !== null && (
                <>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 22, height: 22, borderRadius: '50%', fontSize: '0.72rem', fontWeight: isToday ? 700 : 400,
                    color: isToday ? '#fff' : 'var(--text-2)',
                    background: isToday ? 'var(--accent)' : 'transparent',
                    marginBottom: 4,
                  }}>
                    {day}
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {dayFolders.slice(0, 3).map(f => (
                      <Link
                        key={f.id}
                        href={`/team/${slug}/folder/${f.id}`}
                        style={{
                          textDecoration: 'none', display: 'block',
                          fontSize: '0.62rem', fontWeight: 500,
                          padding: '2px 5px', borderRadius: 4,
                          background: f.stepColor
                            ? `color-mix(in srgb, ${f.stepColor} 15%, var(--surface))`
                            : 'var(--surface-2)',
                          color: f.stepColor ?? 'var(--text-3)',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}
                        title={f.title}
                      >
                        {f.title}
                      </Link>
                    ))}
                    {dayFolders.length > 3 && (
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-4)', paddingLeft: 5 }}>
                        +{dayFolders.length - 3}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
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

/* ─── Keyboard shortcuts overlay ────────────────────────────── */
function ShortcutsOverlay({ onClose }: { onClose: () => void }) {
  const shortcuts = [
    { key: 'n', desc: 'Nouveau dossier' },
    { key: 'k', desc: 'Vue Kanban' },
    { key: 'l', desc: 'Vue Liste' },
    { key: 'c', desc: 'Vue Calendrier' },
    { key: 'f', desc: 'Focus recherche' },
    { key: '?', desc: 'Afficher/masquer les raccourcis' },
    { key: 'Esc', desc: 'Fermer les panneaux' },
  ];
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
      onClick={onClose}
    >
      <div
        className="scale-in"
        style={{
          background: 'var(--surface)', borderRadius: 18, padding: 28,
          width: '100%', maxWidth: 380,
          border: '1px solid var(--border)', boxShadow: 'var(--shadow-xl)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            Raccourcis clavier
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {shortcuts.map(s => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}>{s.desc}</span>
              <kbd style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 600,
                padding: '3px 9px', borderRadius: 6,
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                color: 'var(--text-2)', boxShadow: '0 1px 0 var(--border)',
              }}>
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
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
function CalendarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
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

/* ─── Change Password Modal ──────────────────────────────────── */
function ChangePasswordModal({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 13px', borderRadius: 10,
    border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)',
    fontSize: '0.875rem', outline: 'none', transition: 'border-color 0.15s', boxSizing: 'border-box',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirm) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const res = await fetch(`/api/teams/${slug}/me/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Erreur'); return; }
      setSuccess(true);
      setTimeout(onClose, 1400);
    } catch {
      setError('Erreur réseau');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="scale-in" style={{
        background: 'var(--surface)', borderRadius: 18, padding: 28, width: '100%', maxWidth: 360,
        border: '1px solid var(--border)', boxShadow: 'var(--shadow-xl)',
        borderTop: '3px solid var(--accent)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            Changer mon mot de passe
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {success ? (
          <div style={{
            padding: '14px', borderRadius: 10, textAlign: 'center',
            background: '#f0fdf4', border: '1px solid #86efac', color: '#16a34a', fontSize: '0.875rem', fontWeight: 600,
          }}>
            Mot de passe mis à jour !
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>
                Mot de passe actuel
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Laisser vide si aucun"
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>
                Nouveau mot de passe
              </label>
              <input
                required
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="••••••••"
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>
                Confirmer
              </label>
              <input
                required
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>

            {error && (
              <div style={{
                padding: '8px 12px', borderRadius: 8,
                background: '#fef2f2', border: '1px solid #fca5a5',
                fontSize: '0.78rem', color: '#dc2626', fontWeight: 500,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
              style={{ width: '100%', padding: '11px 0', fontSize: '0.875rem', justifyContent: 'center', borderRadius: 11, marginTop: 2 }}
            >
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
