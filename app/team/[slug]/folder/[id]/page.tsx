'use client';
import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Folder, FolderComment, FolderHistoryEntry, WorkflowStep, TeamMember } from '@/types';

function relTime(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'à l\'instant';
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function historyLabel(e: FolderHistoryEntry): string {
  const p = e.payload;
  switch (p.type) {
    case 'step_change': return `${e.actorName} a changé l'étape${p.fromStep ? ` de "${p.fromStep}"` : ''} → "${p.toStep}"`;
    case 'comment': return `${e.actorName} a commenté`;
    case 'assignment': return p.toMember ? `${e.actorName} a assigné à ${p.toMember}` : `${e.actorName} a retiré l'assignation`;
    case 'priority_change': return `${e.actorName} a modifié la priorité (${p.from} → ${p.to})`;
    case 'due_date_change': return p.to ? `${e.actorName} a fixé l'échéance au ${new Date(p.to).toLocaleDateString('fr-FR')}` : `${e.actorName} a supprimé l'échéance`;
    default: return 'Modification';
  }
}

export default function FolderPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = use(params);

  const [folder, setFolder] = useState<Folder | null>(null);
  const [comments, setComments] = useState<FolderComment[]>([]);
  const [history, setHistory] = useState<FolderHistoryEntry[]>([]);
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);

  // Edit state
  const [editTitle, setEditTitle] = useState('');
  const [editStep, setEditStep] = useState('');
  const [editAssignee, setEditAssignee] = useState('');
  const [editDue, setEditDue] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editTags, setEditTags] = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`/api/teams/${slug}/folders/${id}`).then(r => r.json()),
      fetch(`/api/teams/${slug}/steps`).then(r => r.json()),
      fetch(`/api/teams/${slug}/members`).then(r => r.json()),
    ]).then(([folderData, stepsData, membersData]) => {
      setFolder(folderData.folder);
      setComments(folderData.comments ?? []);
      setHistory(folderData.history ?? []);
      setSteps(stepsData.steps ?? []);
      setMembers(membersData.members ?? []);
      if (folderData.folder) {
        setEditTitle(folderData.folder.title);
        setEditStep(folderData.folder.stepId ?? '');
        setEditAssignee(folderData.folder.assigneeId ?? '');
        setEditDue(folderData.folder.dueDate ?? '');
        setEditDesc(folderData.folder.description ?? '');
        setEditTags((folderData.folder.tags ?? []).join(', '));
      }
    }).finally(() => setLoading(false));

    // Mark as viewed
    fetch(`/api/teams/${slug}/folders/${id}/view`, { method: 'POST' });
  }, [slug, id]);

  const saveEdit = async () => {
    const tags = editTags.split(',').map(t => t.trim()).filter(Boolean);
    const res = await fetch(`/api/teams/${slug}/folders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editTitle,
        stepId: editStep || null,
        assigneeId: editAssignee || null,
        dueDate: editDue || null,
        description: editDesc || null,
        tags,
      }),
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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-sm" style={{ color: 'var(--text-3)' }}>Chargement…</p></div>;
  }
  if (!folder) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-sm" style={{ color: 'var(--text-3)' }}>Dossier introuvable.</p></div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ borderTop: '3px solid var(--accent)' }} />
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', gap: 8, height: 52 }}>
          <Link href="/" className="font-bold text-sm" style={{ color: 'var(--text)', textDecoration: 'none' }}>
            Work<span style={{ color: 'var(--accent)' }}>Dash</span>
          </Link>
          <span style={{ color: 'var(--text-3)' }}>/</span>
          <Link href={`/team/${slug}`} className="text-sm" style={{ color: 'var(--text-3)', textDecoration: 'none' }}>{slug}</Link>
          <span style={{ color: 'var(--text-3)' }}>/</span>
          <span className="text-sm font-mono" style={{ color: 'var(--text-3)' }}>{folder.ref}</span>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => setEditMode(!editMode)}
            className="text-xs px-3 py-1.5 rounded-lg border"
            style={{ borderColor: editMode ? 'var(--accent)' : 'var(--border)', color: editMode ? 'var(--accent)' : 'var(--text-3)', background: 'none' }}
          >
            {editMode ? '✕ Annuler' : '✎ Modifier'}
          </button>
          <button onClick={archive} className="text-xs px-3 py-1.5 rounded-lg border" style={{ borderColor: 'var(--border)', color: 'var(--text-3)' }}>
            Archiver
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px', display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>

        {/* Left — main */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Metadata card */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px' }}>
            {editMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm border outline-none font-semibold"
                  style={{ borderColor: 'var(--accent)', background: 'var(--surface-2)', color: 'var(--text)', fontSize: '1.1rem' }} />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-3)' }}>Étape</label>
                    <select value={editStep} onChange={e => setEditStep(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                      style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }}>
                      <option value="">Sans étape</option>
                      {steps.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-3)' }}>Responsable</label>
                    <select value={editAssignee} onChange={e => setEditAssignee(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                      style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }}>
                      <option value="">Non assigné</option>
                      {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-3)' }}>Échéance</label>
                    <input type="date" value={editDue} onChange={e => setEditDue(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                      style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-3)' }}>Tags (séparés par virgule)</label>
                    <input value={editTags} onChange={e => setEditTags(e.target.value)}
                      placeholder="urgent, client, contrat…"
                      className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                      style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-3)' }}>Description</label>
                  <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={4}
                    className="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-none"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }} />
                </div>
                <button onClick={saveEdit}
                  className="px-4 py-2 rounded-xl font-semibold text-white text-sm"
                  style={{ background: 'var(--accent)', alignSelf: 'flex-start' }}>
                  Enregistrer
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-3 mb-4">
                  <div style={{ flex: 1 }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs" style={{ color: 'var(--text-3)' }}>{folder.ref}</span>
                      {folder.stepName && (
                        <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: folder.stepColor + '22', color: folder.stepColor }}>
                          <span className="step-dot" style={{ background: folder.stepColor, width: 6, height: 6 }} />
                          {folder.stepName}
                        </span>
                      )}
                    </div>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>{folder.title}</h1>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <Meta label="Responsable">{folder.assigneeName ?? '—'}</Meta>
                  <Meta label="Échéance">
                    {folder.dueDate
                      ? <span style={{ color: new Date(folder.dueDate) < new Date() ? '#ef4444' : 'var(--text)' }}>
                          {new Date(folder.dueDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </span>
                      : '—'}
                  </Meta>
                </div>
                {folder.tags.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap mb-4">
                    {folder.tags.map(t => (
                      <span key={t} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>{t}</span>
                    ))}
                  </div>
                )}
                {folder.description && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{folder.description}</p>
                )}
              </>
            )}
          </div>

          {/* Comments */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px' }}>
            <h2 className="font-semibold text-sm mb-4" style={{ color: 'var(--text)' }}>
              Discussion ({comments.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {comments.length === 0 && (
                <p className="text-xs text-center py-6" style={{ color: 'var(--text-3)' }}>Aucun commentaire pour l&apos;instant.</p>
              )}
              {comments.map(c => (
                <div key={c.id} style={{ display: 'flex', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent)' }}>
                    {c.authorName.slice(0, 1).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)' }}>{c.authorName}</span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>{relTime(c.createdAt)}</span>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-2)', lineHeight: 1.5, background: 'var(--surface-2)', borderRadius: '4px 12px 12px 12px', padding: '8px 12px' }}>{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={comment}
                onChange={e => setComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendComment()}
                placeholder="Ajouter un commentaire…"
                className="flex-1 px-3 py-2 rounded-lg text-sm border outline-none"
                style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }}
              />
              <button
                onClick={sendComment}
                disabled={sending || !comment.trim()}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: 'var(--accent)' }}
              >
                {sending ? '…' : '→'}
              </button>
            </div>
          </div>
        </div>

        {/* Right — history */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px', position: 'sticky', top: 72 }}>
          <h2 className="font-semibold text-sm mb-4" style={{ color: 'var(--text)' }}>Historique</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {history.length === 0 && (
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>Aucune activité.</p>
            )}
            {history.map((e, i) => (
              <div key={e.id} style={{ display: 'flex', gap: 8, paddingBottom: i < history.length - 1 ? 12 : 0, borderLeft: i < history.length - 1 ? '1px solid var(--border)' : 'none', marginLeft: 7, paddingLeft: 14, position: 'relative' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--border-2)', position: 'absolute', left: -3.5, top: 6 }} />
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-2)', lineHeight: 1.4 }}>{historyLabel(e)}</p>
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: 2 }}>{relTime(e.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>{label}</p>
      <p style={{ color: 'var(--text)' }}>{children}</p>
    </div>
  );
}
