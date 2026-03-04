'use client';
import { useEffect, useState, useCallback } from 'react';
import { DashboardData, Comment, Project } from '@/types';

const PRIORITY_COLOR: Record<string, string> = {
  high: '#f7534f',
  med: '#f7d44f',
  low: '#4fc987',
};

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  'en-cours':   { bg: 'rgba(79,142,247,0.12)', color: '#4f8ef7', label: 'En cours' },
  'a-deployer': { bg: 'rgba(247,212,79,0.12)', color: '#f7d44f', label: 'À déployer' },
  'ok':         { bg: 'rgba(79,201,135,0.12)', color: '#4fc987', label: 'OK' },
  'bloque':     { bg: 'rgba(247,83,79,0.12)',  color: '#f7534f', label: 'À arbitrer' },
  'a-cadrer':   { bg: 'rgba(247,83,79,0.12)',  color: '#f7534f', label: 'À cadrer' },
};

function getWeekNum(d: Date) {
  const start = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [openProject, setOpenProject] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [author, setAuthor] = useState<'manager' | 'valentin'>('manager');
  const [sending, setSending] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const load = useCallback(async () => {
    const [d, c] = await Promise.all([
      fetch('/api/projects').then(r => r.json()),
      fetch('/api/comments').then(r => r.json()),
    ]);
    setData(d);
    setComments(c);
  }, []);

  useEffect(() => { load(); }, [load]);

  const sendComment = async () => {
    if (!commentText.trim() || !openProject) return;
    setSending(true);
    await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: commentText.trim(), projectId: openProject, author }),
    });
    setCommentText('');
    await load();
    setSending(false);
  };

  if (!data) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="mono text-sm" style={{ color: 'var(--muted)' }}>Chargement...</div>
    </div>
  );

  const done = data.weeklyTodos.filter(t => t.done).length;
  const total = data.weeklyTodos.length;
  const now = new Date();
  const projComments = (pid: string) => comments.filter(c => c.projectId === pid);

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', padding: '32px 28px',
      backgroundImage: 'radial-gradient(ellipse at 10% 0%, #1a2040 0%, transparent 60%), radial-gradient(ellipse at 90% 100%, #1a1530 0%, transparent 50%)' }}>

      {/* Header */}
      <header className="anim-down flex items-start justify-between mb-10 pb-7"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1,
            background: 'linear-gradient(135deg, #e8eaf0 40%, #4f8ef7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Charge de Travail
          </h1>
          <div className="mono mt-2" style={{ fontSize: '0.7rem', color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            // Valentin · MISMO · Vue Manager
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="mono" style={{ fontSize: '0.7rem', background: 'var(--surface2)', border: '1px solid var(--border)',
            padding: '6px 12px', borderRadius: 4, color: 'var(--muted)', letterSpacing: '0.06em' }}>
            Semaine {getWeekNum(now)} — {now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
          <button onClick={() => setPanelOpen(p => !p)}
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', padding: '6px 14px',
              borderRadius: 4, color: '#4f8ef7', cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'inherit', fontWeight: 600 }}>
            💬 Échanges ({comments.length})
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="anim-up grid gap-3 mb-10" style={{ gridTemplateColumns: 'repeat(4,1fr)', animationDelay: '0.05s' }}>
        {[
          { label: 'Projets actifs', val: data.projects.length, color: '#4f8ef7' },
          { label: 'Tâches semaine OK', val: done, color: '#4fc987' },
          { label: 'Tâches en attente', val: total - done, color: '#f7d44f' },
          { label: 'Échanges', val: comments.length, color: '#f7a24f' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 20,
            borderTop: `2px solid ${s.color}` }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val}</div>
            <div className="mono mt-1" style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>

        {/* Projects */}
        <div className="anim-up" style={{ animationDelay: '0.1s' }}>
          <SectionTitle>Projets 2026</SectionTitle>
          {data.projects.map(p => (
            <ProjectCard key={p.id} project={p} comments={projComments(p.id)}
              isOpen={openProject === p.id}
              onToggle={() => setOpenProject(o => o === p.id ? null : p.id)}
              commentText={commentText} setCommentText={setCommentText}
              author={author} setAuthor={setAuthor}
              onSend={sendComment} sending={sending} />
          ))}
        </div>

        {/* Right sidebar */}
        <div className="anim-up flex flex-col gap-4" style={{ animationDelay: '0.15s' }}>

          {/* Weekly */}
          <Panel title="To-do semaine">
            <div className="mono mb-3" style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>
              {done}/{total} complétées
            </div>
            <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, marginBottom: 14, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(done/total)*100}%`, background: '#4fc987', borderRadius: 2, transition: 'width 1s ease' }} />
            </div>
            {data.weeklyTodos.map(t => (
              <div key={t.id} className="flex items-start gap-2" style={{ padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: '0.8rem' }}>
                <div style={{ width: 14, height: 14, borderRadius: 2, flexShrink: 0, marginTop: 2,
                  background: t.done ? '#4fc987' : 'transparent', border: t.done ? 'none' : '1.5px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#000' }}>
                  {t.done && '✓'}
                </div>
                <span style={{ color: t.done ? 'var(--muted)' : 'var(--text)', textDecoration: t.done ? 'line-through' : 'none' }}>
                  {t.label}
                </span>
              </div>
            ))}
          </Panel>

          {/* General comments panel */}
          {panelOpen && (
            <Panel title="Échanges généraux">
              <div className="flex flex-col gap-2 mb-3" style={{ maxHeight: 240, overflowY: 'auto' }}>
                {comments.filter(c => c.projectId === 'general').length === 0 && (
                  <div className="mono" style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>Aucun échange pour l'instant.</div>
                )}
                {comments.filter(c => c.projectId === 'general').map(c => (
                  <CommentBubble key={c.id} comment={c} />
                ))}
              </div>
              <CommentInput projectId="general" author={author} setAuthor={setAuthor}
                text={commentText} setText={setCommentText} onSend={sendComment} sending={sending} />
            </Panel>
          )}

          {/* Legend */}
          <Panel title="Légende priorités">
            {[['high','Priorité haute'],['med','Priorité moyenne'],['low','Priorité basse']].map(([k,v]) => (
              <div key={k} className="flex items-center gap-2 mb-2" style={{ fontSize: '0.78rem' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: PRIORITY_COLOR[k],
                  boxShadow: `0 0 5px ${PRIORITY_COLOR[k]}` }} />
                <span style={{ color: 'var(--muted)' }}>{v}</span>
              </div>
            ))}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function ProjectCard({ project, comments, isOpen, onToggle, commentText, setCommentText, author, setAuthor, onSend, sending }:
  { project: Project; comments: Comment[]; isOpen: boolean; onToggle: () => void;
    commentText: string; setCommentText: (v:string)=>void; author: 'manager'|'valentin'; setAuthor: (v:'manager'|'valentin')=>void;
    onSend: ()=>void; sending: boolean }) {
  const st = STATUS_STYLE[project.status];
  const doneCount = project.tasks.filter(t => t.done).length;

  return (
    <div onClick={onToggle} style={{ background: 'var(--surface)', border: `1px solid ${isOpen ? '#4f8ef7' : 'var(--border)'}`,
      borderRadius: 8, padding: '16px 18px', marginBottom: 10, cursor: 'pointer',
      transition: 'border-color 0.2s, transform 0.15s', transform: isOpen ? 'translateX(3px)' : 'none' }}>

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 mb-3">
          <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 1,
            background: PRIORITY_COLOR[project.priority], boxShadow: `0 0 5px ${PRIORITY_COLOR[project.priority]}` }} />
          <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>{project.name}</span>
          {comments.length > 0 && (
            <span className="mono" style={{ fontSize: '0.6rem', background: 'rgba(79,142,247,0.15)',
              color: '#4f8ef7', padding: '1px 6px', borderRadius: 3 }}>💬 {comments.length}</span>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ width: 72, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden', marginBottom: 4, marginLeft: 'auto' }}>
            <div style={{ height: '100%', width: `${project.progress}%`, borderRadius: 2,
              background: project.progress >= 70 ? '#4fc987' : project.progress >= 40 ? '#f7d44f' : '#f7534f' }} />
          </div>
          <div className="mono" style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>{project.progress}%</div>
          <div className="mono mt-1" style={{ fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.05em',
            padding: '2px 6px', borderRadius: 3, background: st.bg, color: st.color, border: `1px solid ${st.color}44` }}>
            {st.label}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {project.tasks.map(t => (
          <span key={t.id} className="mono" style={{ fontSize: '0.62rem', padding: '2px 7px', borderRadius: 3,
            background: t.done ? 'rgba(79,201,135,0.07)' : 'rgba(247,162,79,0.07)',
            border: `1px solid ${t.done ? 'rgba(79,201,135,0.25)' : 'rgba(247,162,79,0.25)'}`,
            color: t.done ? '#4fc987' : '#f7a24f', textDecoration: t.done ? 'line-through' : 'none', opacity: t.done ? 0.7 : 1 }}>
            {t.done ? '✓' : '↻'} {t.label}
          </span>
        ))}
      </div>

      <div className="mono mt-2" style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>
        {doneCount}/{project.tasks.length} tâches · cliquez pour commenter
      </div>

      {isOpen && (
        <div onClick={e => e.stopPropagation()} style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          {comments.length > 0 && (
            <div className="flex flex-col gap-2 mb-3" style={{ maxHeight: 200, overflowY: 'auto' }}>
              {comments.map(c => <CommentBubble key={c.id} comment={c} />)}
            </div>
          )}
          <CommentInput projectId={project.id} author={author} setAuthor={setAuthor}
            text={commentText} setText={setCommentText} onSend={onSend} sending={sending} />
        </div>
      )}
    </div>
  );
}

function CommentBubble({ comment }: { comment: Comment }) {
  const isManager = comment.author === 'manager';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isManager ? 'flex-start' : 'flex-end' }}>
      <div style={{ maxWidth: '85%', padding: '7px 11px', borderRadius: 8,
        background: isManager ? 'rgba(79,142,247,0.12)' : 'rgba(79,201,135,0.10)',
        border: `1px solid ${isManager ? 'rgba(79,142,247,0.25)' : 'rgba(79,201,135,0.25)'}`,
        color: 'var(--text)', fontSize: '0.78rem', lineHeight: 1.4 }}>
        {comment.text}
      </div>
      <div className="mono mt-1" style={{ fontSize: '0.58rem', color: 'var(--muted)' }}>
        {isManager ? '👔 Manager' : '💻 Valentin'} · {new Date(comment.createdAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
      </div>
    </div>
  );
}

function CommentInput({ projectId, author, setAuthor, text, setText, onSend, sending }:
  { projectId: string; author: 'manager'|'valentin'; setAuthor: (v:'manager'|'valentin')=>void;
    text: string; setText: (v:string)=>void; onSend: ()=>void; sending: boolean }) {
  return (
    <div onClick={e => e.stopPropagation()}>
      <div className="flex gap-2 mb-2">
        {(['manager','valentin'] as const).map(a => (
          <button key={a} onClick={() => setAuthor(a)}
            style={{ fontFamily: 'inherit', fontSize: '0.7rem', padding: '3px 10px', borderRadius: 3, cursor: 'pointer',
              background: author === a ? (a==='manager'?'rgba(79,142,247,0.2)':'rgba(79,201,135,0.2)') : 'var(--surface2)',
              border: `1px solid ${author === a ? (a==='manager'?'#4f8ef7':'#4fc987') : 'var(--border)'}`,
              color: author === a ? (a==='manager'?'#4f8ef7':'#4fc987') : 'var(--muted)' }}>
            {a === 'manager' ? '👔 Manager' : '💻 Valentin'}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && onSend()}
          placeholder="Votre message... (Entrée pour envoyer)"
          style={{ flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 4,
            padding: '6px 10px', color: 'var(--text)', fontSize: '0.78rem', fontFamily: 'inherit', outline: 'none' }} />
        <button onClick={onSend} disabled={sending || !text.trim()}
          style={{ background: '#4f8ef7', border: 'none', borderRadius: 4, padding: '6px 14px', cursor: 'pointer',
            color: '#fff', fontSize: '0.78rem', fontFamily: 'inherit', fontWeight: 600, opacity: sending || !text.trim() ? 0.5 : 1 }}>
          {sending ? '...' : 'Envoyer'}
        </button>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mono flex items-center gap-2 mb-3"
      style={{ fontSize: '0.63rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>
      {children}
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 18 }}>
      <SectionTitle>{title}</SectionTitle>
      {children}
    </div>
  );
}
