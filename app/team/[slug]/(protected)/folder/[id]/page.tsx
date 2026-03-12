'use client';
import { useState, useEffect, use, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Folder, FolderComment, FolderHistoryEntry, FolderTask, WorkflowStep, TeamMember } from '@/types';
import { Sidebar } from '@/app/components/Sidebar';

function relTime(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'à l\'instant';
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function historyLabel(e: FolderHistoryEntry): { text: string; color: string } {
  const p = e.payload;
  switch (p.type) {
    case 'step_change':
      return { text: `${e.actorName} → étape "${p.toStep}"`, color: 'var(--accent)' };
    case 'comment':
      return { text: `${e.actorName} a commenté`, color: 'var(--text-3)' };
    case 'assignment':
      return { text: p.toMember ? `Assigné à ${p.toMember}` : 'Assignation retirée', color: '#d97706' };
    case 'priority_change':
      return { text: `Priorité modifiée (${p.from}→${p.to})`, color: 'var(--text-3)' };
    case 'due_date_change':
      return { text: p.to ? `Échéance fixée au ${new Date(p.to).toLocaleDateString('fr-FR')}` : 'Échéance supprimée', color: '#dc2626' };
    default:
      return { text: 'Modification', color: 'var(--text-3)' };
  }
}

export default function FolderPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = use(params);

  const [folder, setFolder] = useState<Folder | null>(null);
  const [comments, setComments] = useState<FolderComment[]>([]);
  const [history, setHistory] = useState<FolderHistoryEntry[]>([]);
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [tasks, setTasks] = useState<FolderTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [showHistory, setShowHistory] = useState(true);

  const [editTitle, setEditTitle] = useState('');
  const [editStep, setEditStep] = useState('');
  const [editAssignee, setEditAssignee] = useState('');
  const [editDue, setEditDue] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editTags, setEditTags] = useState('');

  const fetchComments = useCallback(async () => {
    const r = await fetch(`/api/teams/${slug}/folders/${id}/comments`);
    if (r.ok) {
      const data = await r.json();
      setComments(data.comments ?? []);
    }
  }, [slug, id]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/teams/${slug}/folders/${id}`).then(r => r.json()),
      fetch(`/api/teams/${slug}/steps`).then(r => r.json()),
      fetch(`/api/teams/${slug}/members`).then(r => r.json()),
      fetch(`/api/teams/${slug}/folders/${id}/tasks`).then(r => r.json()),
    ]).then(([folderData, stepsData, membersData, tasksData]) => {
      setFolder(folderData.folder);
      setComments(folderData.comments ?? []);
      setHistory(folderData.history ?? []);
      setSteps(stepsData.steps ?? []);
      setMembers(membersData.members ?? []);
      setTasks(tasksData.tasks ?? []);
      if (folderData.folder) {
        setEditTitle(folderData.folder.title);
        setEditStep(folderData.folder.stepId ?? '');
        setEditAssignee(folderData.folder.assigneeId ?? '');
        setEditDue(folderData.folder.dueDate ?? '');
        setEditDesc(folderData.folder.description ?? '');
        setEditTags((folderData.folder.tags ?? []).join(', '));
      }
    }).finally(() => setLoading(false));
    fetch(`/api/teams/${slug}/folders/${id}/view`, { method: 'POST' });
  }, [slug, id]);

  // Poll comments every 5s when page is focused
  useEffect(() => {
    const poll = () => { if (document.visibilityState === 'visible') fetchComments(); };
    const interval = setInterval(poll, 5000);
    document.addEventListener('visibilitychange', poll);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', poll); };
  }, [fetchComments]);

  const saveEdit = async () => {
    const tags = editTags.split(',').map(t => t.trim()).filter(Boolean);
    const res = await fetch(`/api/teams/${slug}/folders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editTitle, stepId: editStep || null, assigneeId: editAssignee || null, dueDate: editDue || null, description: editDesc || null, tags }),
    });
    const data = await res.json();
    if (res.ok) { setFolder(data.folder); setEditMode(false); }
  };

  const sendComment = async () => {
    if (!comment.trim()) return;
    setSending(true);
    const res = await fetch(`/api/teams/${slug}/folders/${id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: comment.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      setComments(prev => [...prev, data.comment]);
      setComment('');
    }
    setSending(false);
  };

  const archive = async () => {
    if (!confirm('Archiver ce dossier ?')) return;
    await fetch(`/api/teams/${slug}/folders/${id}`, { method: 'DELETE' });
    window.location.href = `/team/${slug}`;
  };

  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 10,
    border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)',
    fontSize: '0.85rem', outline: 'none', transition: 'border-color 0.15s',
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)' }}>
        <Sidebar slug={slug} active="folder" members={[]} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div className="spinner" />
            <p style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>Chargement…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!folder) {
    return (
      <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)' }}>
        <Sidebar slug={slug} active="folder" members={[]} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--text-3)' }}>Dossier introuvable.</p>
        </div>
      </div>
    );
  }

  const isOverdue = folder.dueDate && new Date(folder.dueDate) < new Date();

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      <Sidebar slug={slug} active="folder" members={members} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Top bar */}
        <header style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '0 20px', height: 52, flexShrink: 0,
          background: 'var(--surface)', borderBottom: '1px solid var(--border)', zIndex: 30,
        }}>
          <Link
            href={`/team/${slug}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: '0.78rem', color: 'var(--text-3)', textDecoration: 'none',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Dossiers
          </Link>
          <span style={{ color: 'var(--border-2)' }}>/</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 500 }}>
            {folder.ref}
          </span>
          {folder.stepName && (
            <span className="step-pill" style={{
              background: `color-mix(in srgb, ${folder.stepColor} 12%, var(--surface))`,
              color: folder.stepColor,
            }}>
              <span className="step-dot" style={{ background: folder.stepColor, width: 5, height: 5 }} />
              {folder.stepName}
            </span>
          )}

          <div style={{ flex: 1 }} />

          <button
            onClick={() => setShowHistory(h => !h)}
            className="btn-ghost"
            style={{ fontSize: '0.75rem', padding: '5px 11px' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
            </svg>
            Historique
          </button>
          <button
            onClick={() => setEditMode(!editMode)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 8, border: 'none',
              background: editMode ? 'var(--accent-light)' : 'var(--surface-2)',
              color: editMode ? 'var(--accent)' : 'var(--text-3)',
              fontSize: '0.78rem', fontWeight: editMode ? 600 : 400,
              transition: 'all 0.15s',
            }}
          >
            {editMode ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                Annuler
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Modifier
              </>
            )}
          </button>
          <button
            onClick={archive}
            className="btn-ghost"
            style={{ fontSize: '0.75rem', padding: '5px 11px', color: '#dc2626', borderColor: '#fca5a5' }}
          >
            Archiver
          </button>
        </header>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: showHistory ? '1fr 300px' : '1fr',
            gap: 16, maxWidth: 1100, margin: '0 auto', alignItems: 'start',
          }}>

            {/* Left column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Main card */}
              <div
                className="slide-up"
                style={{
                  background: 'var(--surface)', borderRadius: 16, padding: '22px',
                  border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
                  borderTop: folder.stepColor ? `3px solid ${folder.stepColor}` : '1px solid var(--border)',
                }}
              >
                {editMode ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <input
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      style={{ ...inputStyle, fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.02em' }}
                      onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                      onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <FieldGroup label="Étape">
                        <select value={editStep} onChange={e => setEditStep(e.target.value)} style={inputStyle}>
                          <option value="">Sans étape</option>
                          {steps.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </FieldGroup>
                      <FieldGroup label="Responsable">
                        <select value={editAssignee} onChange={e => setEditAssignee(e.target.value)} style={inputStyle}>
                          <option value="">Non assigné</option>
                          {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                      </FieldGroup>
                      <FieldGroup label="Échéance">
                        <input type="date" value={editDue} onChange={e => setEditDue(e.target.value)}
                          style={inputStyle}
                          onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                          onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                        />
                      </FieldGroup>
                      <FieldGroup label="Tags (virgule)">
                        <input value={editTags} onChange={e => setEditTags(e.target.value)}
                          placeholder="urgent, client…"
                          style={inputStyle}
                          onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                          onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                        />
                      </FieldGroup>
                    </div>
                    <FieldGroup label="Description">
                      <textarea
                        value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={4}
                        style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }}
                        onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                        onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                      />
                    </FieldGroup>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={saveEdit}
                        className="btn-primary"
                        style={{ padding: '8px 20px' }}
                      >
                        Enregistrer
                      </button>
                      <button
                        onClick={() => setEditMode(false)}
                        className="btn-ghost"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-4)', fontWeight: 500 }}>
                            {folder.ref}
                          </span>
                          {folder.hasUnread && <span className="unread-dot" />}
                        </div>
                        <h1 style={{
                          fontSize: '1.3rem', fontWeight: 800, color: 'var(--text)',
                          lineHeight: 1.25, letterSpacing: '-0.03em',
                        }}>
                          {folder.title}
                        </h1>
                      </div>
                    </div>

                    {/* Meta grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 14, marginBottom: 16 }}>
                      <MetaBlock label="Responsable">
                        {folder.assigneeName ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 4 }}>
                            <div className="avatar" style={{ width: 24, height: 24, fontSize: '0.65rem', borderRadius: 6 }}>
                              {folder.assigneeName.slice(0, 1).toUpperCase()}
                            </div>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{folder.assigneeName}</span>
                          </div>
                        ) : <span style={{ color: 'var(--text-4)', fontSize: '0.85rem' }}>—</span>}
                      </MetaBlock>

                      <MetaBlock label="Échéance">
                        {folder.dueDate ? (
                          <span style={{ fontSize: '0.88rem', fontWeight: 500, color: isOverdue ? '#dc2626' : 'var(--text)', marginTop: 4, display: 'block' }}>
                            {isOverdue && '⚠ '}
                            {new Date(folder.dueDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                          </span>
                        ) : <span style={{ color: 'var(--text-4)', fontSize: '0.85rem' }}>—</span>}
                      </MetaBlock>

                      <MetaBlock label="Priorité">
                        <PriorityDisplay priority={folder.priority} />
                      </MetaBlock>
                    </div>

                    {/* Tags */}
                    {folder.tags.length > 0 && (
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
                        {folder.tags.map(t => (
                          <span key={t} className="tag">{t}</span>
                        ))}
                      </div>
                    )}

                    {/* Description */}
                    {folder.description && (
                      <div style={{
                        padding: '14px 16px', borderRadius: 10,
                        background: 'var(--surface-2)', border: '1px solid var(--border)',
                      }}>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                          {folder.description}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Tasks */}
              <TasksSection
                slug={slug}
                folderId={id}
                tasks={tasks}
                members={members}
                onAdd={t => setTasks(prev => [...prev, t])}
                onToggle={(taskId, done) => setTasks(prev => prev.map(t => t.id === taskId ? { ...t, done } : t))}
                onDelete={taskId => setTasks(prev => prev.filter(t => t.id !== taskId))}
              />

              {/* Comments */}
              <div
                className="slide-up stagger-1"
                style={{
                  background: 'var(--surface)', borderRadius: 16, padding: '20px',
                  border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
                }}
              >
                <h2 style={{
                  fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)',
                  letterSpacing: '-0.01em', marginBottom: 16,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  Discussion
                  <span style={{
                    fontSize: '0.65rem', padding: '1px 7px', borderRadius: 'var(--r-full)',
                    background: 'var(--surface-2)', color: 'var(--text-3)', fontWeight: 600,
                  }}>
                    {comments.length}
                  </span>
                </h2>

                {/* Comment list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                  {comments.length === 0 && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-4)', textAlign: 'center', padding: '20px 0' }}>
                      Aucun commentaire pour l&apos;instant.
                    </p>
                  )}
                  {comments.map(c => (
                    <div key={c.id} style={{ display: 'flex', gap: 10 }}>
                      <div className="avatar" style={{ width: 30, height: 30, fontSize: '0.72rem', borderRadius: 8, flexShrink: 0 }}>
                        {c.authorName.slice(0, 1).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 5 }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)' }}>{c.authorName}</span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-4)' }}>{relTime(c.createdAt)}</span>
                        </div>
                        <div style={{
                          background: 'var(--surface-2)', borderRadius: '4px 12px 12px 12px',
                          padding: '9px 13px', border: '1px solid var(--border)',
                        }}>
                          <CommentText text={c.text} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Comment input with @mention */}
                <MentionInput
                  value={comment}
                  onChange={setComment}
                  members={members}
                  onSubmit={sendComment}
                  disabled={sending}
                />
              </div>
            </div>

            {/* Right — history */}
            {showHistory && (
              <div
                className="slide-up stagger-2"
                style={{
                  background: 'var(--surface)', borderRadius: 16, padding: '18px',
                  border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
                  position: 'sticky', top: 20,
                }}
              >
                <h2 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em', marginBottom: 16 }}>
                  Historique
                </h2>
                <div style={{ position: 'relative' }}>
                  {history.length === 0 && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-4)' }}>Aucune activité.</p>
                  )}
                  {history.map((e, i) => {
                    const { text, color } = historyLabel(e);
                    return (
                      <div
                        key={e.id}
                        style={{
                          display: 'flex', gap: 10,
                          paddingBottom: i < history.length - 1 ? 14 : 0,
                          position: 'relative',
                        }}
                      >
                        {/* Timeline line */}
                        {i < history.length - 1 && (
                          <div style={{
                            position: 'absolute', left: 6, top: 14, bottom: -2,
                            width: 1, background: 'var(--border)',
                          }} />
                        )}
                        {/* Dot */}
                        <div style={{
                          width: 13, height: 13, borderRadius: '50%',
                          background: 'var(--surface)', border: `2px solid ${color}`,
                          flexShrink: 0, marginTop: 2, zIndex: 1,
                        }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-2)', lineHeight: 1.45 }}>{text}</p>
                          <p style={{ fontSize: '0.65rem', color: 'var(--text-4)', marginTop: 2 }}>{relTime(e.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Tasks Section ──────────────────────────────────────────── */
function TasksSection({
  slug, folderId, tasks, members, onAdd, onToggle, onDelete,
}: {
  slug: string;
  folderId: string;
  tasks: FolderTask[];
  members: TeamMember[];
  onAdd: (t: FolderTask) => void;
  onToggle: (id: string, done: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const [newTitle, setNewTitle] = useState('');
  const [newAssigneeId, setNewAssigneeId] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const doneCount = tasks.filter(t => t.done).length;
  const pct = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

  const addTask = async () => {
    if (!newTitle.trim()) return;
    setAdding(true);
    const assignee = members.find(m => m.id === newAssigneeId);
    const res = await fetch(`/api/teams/${slug}/folders/${folderId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTitle.trim(),
        assigneeId: newAssigneeId || undefined,
        assigneeName: assignee?.name || undefined,
        dueDate: newDueDate || undefined,
        sortOrder: tasks.length,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      onAdd(data.task);
      setNewTitle('');
      setNewAssigneeId('');
      setNewDueDate('');
      setShowForm(false);
    }
    setAdding(false);
  };

  const toggleTask = async (taskId: string, done: boolean) => {
    onToggle(taskId, done);
    await fetch(`/api/teams/${slug}/folders/${folderId}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done }),
    });
  };

  const deleteTask = async (taskId: string) => {
    onDelete(taskId);
    await fetch(`/api/teams/${slug}/folders/${folderId}/tasks/${taskId}`, { method: 'DELETE' });
  };

  return (
    <div
      className="slide-up stagger-1"
      style={{
        background: 'var(--surface)', borderRadius: 16, padding: '20px',
        border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: tasks.length > 0 ? 14 : 0 }}>
        <h2 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em', flex: 1 }}>
          Tâches
        </h2>
        {tasks.length > 0 && (
          <span style={{ fontSize: '0.65rem', color: 'var(--text-3)', fontWeight: 500 }}>
            {doneCount}/{tasks.length}
          </span>
        )}
        <button
          onClick={() => setShowForm(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 7, border: 'none',
            background: showForm ? 'var(--accent-light)' : 'var(--surface-2)',
            color: showForm ? 'var(--accent)' : 'var(--text-3)',
            fontSize: '0.72rem', fontWeight: 600, transition: 'all 0.15s',
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Ajouter
        </button>
      </div>

      {/* Progress bar */}
      {tasks.length > 0 && (
        <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 'var(--r-full)', overflow: 'hidden', marginBottom: 14 }}>
          <div style={{
            height: '100%', width: `${pct}%`,
            background: pct === 100 ? '#16a34a' : 'var(--accent)',
            borderRadius: 'var(--r-full)',
            transition: 'width 0.5s var(--ease-spring)',
          }} />
        </div>
      )}

      {/* Task list */}
      {tasks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: showForm ? 12 : 0 }}>
          {tasks.map(t => (
            <div
              key={t.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 8px', borderRadius: 9,
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {/* Checkbox */}
              <button
                onClick={() => toggleTask(t.id, !t.done)}
                style={{
                  width: 18, height: 18, borderRadius: 5, border: 'none',
                  flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: t.done ? 'var(--accent)' : 'transparent',
                  outline: t.done ? 'none' : '2px solid var(--border-2)',
                  transition: 'all 0.15s',
                }}
              >
                {t.done && (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>

              {/* Title */}
              <span style={{
                flex: 1, fontSize: '0.83rem', color: t.done ? 'var(--text-4)' : 'var(--text)',
                textDecoration: t.done ? 'line-through' : 'none',
                fontWeight: t.done ? 400 : 500,
                transition: 'all 0.15s',
              }}>
                {t.title}
              </span>

              {/* Due date */}
              {t.dueDate && (
                <span style={{
                  fontSize: '0.65rem', fontWeight: 500,
                  color: new Date(t.dueDate) < new Date() && !t.done ? '#dc2626' : 'var(--text-4)',
                  flexShrink: 0,
                }}>
                  {new Date(t.dueDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                </span>
              )}

              {/* Assignee */}
              {t.assigneeName && (
                <div
                  className="avatar"
                  style={{ width: 20, height: 20, fontSize: '0.55rem', borderRadius: 5, flexShrink: 0, opacity: t.done ? 0.5 : 1 }}
                  title={t.assigneeName}
                >
                  {t.assigneeName.slice(0, 1).toUpperCase()}
                </div>
              )}

              {/* Delete */}
              <button
                onClick={() => deleteTask(t.id)}
                style={{
                  width: 20, height: 20, borderRadius: 5, border: 'none',
                  background: 'transparent', color: 'var(--text-4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.9rem', transition: 'all 0.15s', opacity: 0,
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#dc2626'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '0'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-4)'; }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {tasks.length === 0 && !showForm && (
        <p style={{ fontSize: '0.78rem', color: 'var(--text-4)', textAlign: 'center', padding: '14px 0 4px' }}>
          Aucune tâche — cliquez sur <strong>Ajouter</strong> pour démarrer.
        </p>
      )}

      {/* Add form */}
      {showForm && (
        <div className="slide-down" style={{
          display: 'flex', gap: 8, alignItems: 'flex-end',
          padding: '10px', borderRadius: 10,
          background: 'var(--surface-2)', border: '1px solid var(--border)',
        }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input
              autoFocus
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTask()}
              placeholder="Titre de la tâche…"
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
                fontSize: '0.83rem', outline: 'none', transition: 'border-color 0.15s',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              {members.length > 0 && (
                <select
                  value={newAssigneeId}
                  onChange={e => setNewAssigneeId(e.target.value)}
                  style={{
                    flex: 1, padding: '6px 10px', borderRadius: 8,
                    border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
                    fontSize: '0.78rem', outline: 'none',
                  }}
                >
                  <option value="">Non assignée</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              )}
              <input
                type="date"
                value={newDueDate}
                onChange={e => setNewDueDate(e.target.value)}
                title="Échéance"
                style={{
                  padding: '6px 8px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
                  fontSize: '0.78rem', outline: 'none',
                }}
              />
            </div>
          </div>
          <button
            onClick={addTask}
            disabled={adding || !newTitle.trim()}
            className="btn-primary"
            style={{ padding: '8px 14px', fontSize: '0.78rem', flexShrink: 0 }}
          >
            {adding ? '…' : 'Ajouter'}
          </button>
        </div>
      )}
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-3)',
        textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5,
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function MetaBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
      <p style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {label}
      </p>
      <div style={{ marginTop: 3 }}>{children}</div>
    </div>
  );
}

function PriorityDisplay({ priority }: { priority: number }) {
  const color = priority >= 70 ? '#dc2626' : priority >= 40 ? '#d97706' : '#16a34a';
  const label = priority >= 70 ? 'Haute' : priority >= 40 ? 'Moyenne' : 'Faible';
  const pct = Math.max(5, priority);
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block' }} />
        <span style={{ fontSize: '0.83rem', fontWeight: 500, color }}>{label}</span>
      </div>
      <div style={{ height: 3, background: 'var(--border)', borderRadius: 'var(--r-full)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 'var(--r-full)', transition: 'width 0.6s var(--ease-spring)' }} />
      </div>
    </div>
  );
}

/* ─── Comment text with @mention highlight ───────────────────── */
function CommentText({ text }: { text: string }) {
  const parts = text.split(/(@\w[\w\s]*?\b)/g);
  return (
    <p style={{ fontSize: '0.83rem', color: 'var(--text-2)', lineHeight: 1.55 }}>
      {parts.map((part, i) =>
        part.startsWith('@') ? (
          <span key={i} style={{
            color: 'var(--accent)', fontWeight: 600,
            background: 'var(--accent-light)', borderRadius: 4, padding: '0 3px',
          }}>
            {part}
          </span>
        ) : part
      )}
    </p>
  );
}

/* ─── Mention input ──────────────────────────────────────────── */
function MentionInput({
  value, onChange, members, onSubmit, disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  members: TeamMember[];
  onSubmit: () => void;
  disabled?: boolean;
}) {
  const [mentionQuery, setMentionQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [mentionStart, setMentionStart] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    const cursor = e.target.selectionStart ?? v.length;
    onChange(v);

    // Detect @mention: find the last @ before cursor
    const before = v.slice(0, cursor);
    const match = before.match(/@(\w*)$/);
    if (match) {
      setMentionStart(cursor - match[0].length);
      setMentionQuery(match[1]);
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  };

  const insertMention = (name: string) => {
    const before = value.slice(0, mentionStart);
    const after = value.slice(mentionStart + 1 + mentionQuery.length);
    const newVal = `${before}@${name} ${after}`;
    onChange(newVal);
    setShowDropdown(false);
    setTimeout(() => {
      const el = inputRef.current;
      if (el) {
        const pos = before.length + name.length + 2;
        el.setSelectionRange(pos, pos);
        el.focus();
      }
    }, 0);
  };

  const filtered = members.filter(m =>
    m.name.toLowerCase().startsWith(mentionQuery.toLowerCase())
  );

  return (
    <div style={{ position: 'relative', display: 'flex', gap: 8 }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <input
          ref={inputRef}
          value={value}
          onChange={handleChange}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey && !showDropdown) { e.preventDefault(); onSubmit(); }
            if (e.key === 'Escape') setShowDropdown(false);
          }}
          placeholder="Ajouter un commentaire… (@mention, Entrée pour envoyer)"
          style={{
            width: '100%', padding: '9px 13px', borderRadius: 10,
            border: '1px solid var(--border)', background: 'var(--surface-2)',
            color: 'var(--text)', fontSize: '0.83rem', outline: 'none',
            transition: 'border-color 0.15s', boxSizing: 'border-box',
          }}
          onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
          onBlur={e => { e.target.style.borderColor = 'var(--border)'; setTimeout(() => setShowDropdown(false), 150); }}
        />
        {showDropdown && filtered.length > 0 && (
          <div style={{
            position: 'absolute', bottom: '110%', left: 0,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, boxShadow: 'var(--shadow-md)',
            zIndex: 100, minWidth: 160, overflow: 'hidden',
          }}>
            {filtered.map(m => (
              <button
                key={m.id}
                onMouseDown={e => { e.preventDefault(); insertMention(m.name); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '7px 12px', border: 'none',
                  background: 'none', cursor: 'pointer', textAlign: 'left',
                  fontSize: '0.82rem', color: 'var(--text)',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <div className="avatar" style={{ width: 22, height: 22, fontSize: '0.6rem', borderRadius: 5, flexShrink: 0 }}>
                  {m.name.slice(0, 1).toUpperCase()}
                </div>
                {m.name}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={onSubmit}
        disabled={disabled || !value.trim()}
        className="btn-primary"
        style={{ padding: '9px 16px', flexShrink: 0 }}
      >
        {disabled ? '…' : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M22 2 11 13M22 2 15 22 11 13 2 9 22 2z" />
          </svg>
        )}
      </button>
    </div>
  );
}
