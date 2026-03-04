'use client';
import { useEffect, useState, useCallback } from 'react';
import { DashboardData, Comment, Project, Status } from '@/types';

/* ─── Status config ─────────────────────────────────────────── */
const STATUS: Record<Status, { label: string; color: string; bg: string }> = {
  'en-cours':   { label: 'En cours',   color: '#1A5CFF', bg: '#EEF2FF' },
  'a-deployer': { label: 'À déployer', color: '#B07D10', bg: '#FEF8E7' },
  'ok':         { label: 'OK ✓',       color: '#0F8B5A', bg: '#E8F5EF' },
  'bloque':     { label: 'Bloqué',     color: '#C0392B', bg: '#FDECEA' },
  'a-cadrer':   { label: 'À cadrer',   color: '#8A8178', bg: '#F2EFE9' },
};

function getWeek(d: Date) {
  const s = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - s.getTime()) / 86400000 + s.getDay() + 1) / 7);
}

export default function Page() {
  const [data, setData]       = useState<DashboardData | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [openId, setOpenId]   = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [author, setAuthor]   = useState<'manager' | 'valentin'>('manager');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const [d, c] = await Promise.all([
      fetch('/api/projects').then(r => r.json()),
      fetch('/api/comments').then(r => r.json()),
    ]);
    setData(d); setComments(c);
  }, []);

  useEffect(() => { load(); }, [load]);

  const sendComment = async () => {
    if (!commentText.trim() || !openId) return;
    setSending(true);
    await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: commentText.trim(), projectId: openId, author }),
    });
    setCommentText(''); await load(); setSending(false);
  };

  if (!data) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--muted)' }}>Chargement…</span>
    </div>
  );

  const now    = new Date();
  const doneTodos = data.weeklyTodos.filter(t => t.done).length;
  const sorted = [...data.projects].sort((a, b) => a.priority - b.priority);
  const inProgress  = sorted.filter(p => p.status === 'en-cours');
  const readyDeploy = sorted.filter(p => p.status === 'a-deployer');
  const done_ok     = sorted.filter(p => p.status === 'ok');
  const blocked     = sorted.filter(p => p.status === 'bloque' || p.status === 'a-cadrer');

  const commentProps = { commentText, setCommentText, author, setAuthor, onSend: sendComment, sending };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Top bar */}
      <header style={{ background: 'var(--white)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.02em' }}>
              Charge de travail
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--muted)' }}>Valentin · MISMO</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--muted)' }}>
              Semaine {getWeek(now)} · {now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
            <a href="/admin" style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', fontWeight: 500,
              color: 'var(--accent)', textDecoration: 'none', padding: '5px 12px', borderRadius: 6,
              background: 'var(--accent-light)', border: '1px solid #C7D7FF' }}>Admin →</a>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 40px' }}>

        {/* KPI strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 36 }}>
          {[
            { label: 'Projets actifs',      val: data.projects.length, color: 'var(--text)' },
            { label: 'En cours',             val: inProgress.length,    color: '#1A5CFF' },
            { label: 'Prêts à déployer',     val: readyDeploy.length,   color: '#B07D10' },
            { label: 'Tâches semaine',        val: `${doneTodos}/${data.weeklyTodos.length}`, color: '#0F8B5A' },
            { label: 'Échanges',             val: comments.length,      color: 'var(--muted)' },
          ].map(k => (
            <div key={k.label} style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.9rem', fontWeight: 300, color: k.color, lineHeight: 1 }}>{k.val}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.63rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 5 }}>{k.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 272px', gap: 24, alignItems: 'start' }}>

          {/* Projects */}
          <div>
            {[
              { title: 'En cours',            accent: '#1A5CFF', items: inProgress },
              { title: 'Prêt à déployer',     accent: '#F59E0B', items: readyDeploy },
              { title: 'Terminé / OK',         accent: '#0F8B5A', items: done_ok },
              { title: 'À arbitrer / cadrer',  accent: '#C0392B', items: blocked },
            ].filter(s => s.items.length > 0).map(section => (
              <div key={section.title} style={{ marginBottom: 30 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 3, height: 16, background: section.accent, borderRadius: 2 }} />
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 600, letterSpacing: '-0.01em' }}>
                    {section.title}
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--muted)' }}>
                    {section.items.length} projet{section.items.length > 1 ? 's' : ''}
                  </span>
                </div>
                {section.items.map((p, i) => (
                  <ProjectRow key={p.id} project={p} animDelay={i * 0.04}
                    comments={comments.filter(c => c.projectId === p.id)}
                    isOpen={openId === p.id}
                    onToggle={() => setOpenId(o => o === p.id ? null : p.id)}
                    {...commentProps} />
                ))}
              </div>
            ))}
          </div>

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Weekly todos */}
            <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 600, marginBottom: 12, letterSpacing: '-0.01em' }}>
                Semaine en cours
              </div>
              {/* Progress bar */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{doneTodos} sur {data.weeklyTodos.length}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#0F8B5A', fontWeight: 500 }}>
                    {Math.round(doneTodos / data.weeklyTodos.length * 100)}%
                  </span>
                </div>
                <div style={{ height: 4, background: 'var(--bg2)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${doneTodos / data.weeklyTodos.length * 100}%`,
                    background: 'linear-gradient(90deg,#0F8B5A,#34D399)', borderRadius: 99 }} />
                </div>
              </div>
              {data.weeklyTodos.map(t => (
                <div key={t.id} style={{ display: 'flex', gap: 9, padding: '5px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' }}>
                  <div style={{ width: 15, height: 15, borderRadius: 3, flexShrink: 0, marginTop: 2,
                    background: t.done ? '#0F8B5A' : 'transparent',
                    border: t.done ? 'none' : '1.5px solid var(--border2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.55rem', color: '#fff', fontWeight: 700 }}>
                    {t.done ? '✓' : ''}
                  </div>
                  <span style={{ fontSize: '0.76rem', lineHeight: 1.4,
                    color: t.done ? 'var(--muted)' : 'var(--text)',
                    textDecoration: t.done ? 'line-through' : 'none' }}>{t.label}</span>
                </div>
              ))}
            </div>

            {/* Decision points */}
            <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 600, marginBottom: 12, letterSpacing: '-0.01em' }}>
                Points à décider
              </div>
              {[
                'Créer brouillon mail depuis API GRAPH → Todo YN',
                "NDF : Ajout analytique + suppression d'un frais",
                "Outil d'Audit : CRON, réconciliation auto, paramétrage dynamique",
              ].map((q, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '7px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none', alignItems: 'flex-start' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: '#D4520A',
                    background: '#FEF0E7', borderRadius: 3, padding: '1px 5px', flexShrink: 0, marginTop: 2 }}>?</span>
                  <span style={{ fontSize: '0.76rem', lineHeight: 1.4 }}>{q}</span>
                </div>
              ))}
            </div>

            {/* Last updated */}
            <div style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--muted)' }}>
              Mis à jour · {new Date(data.updatedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ─── Project row ───────────────────────────────────────────── */
function ProjectRow({ project, animDelay, comments, isOpen, onToggle, commentText, setCommentText, author, setAuthor, onSend, sending }:
  { project: Project; animDelay: number; comments: Comment[]; isOpen: boolean; onToggle: () => void;
    commentText: string; setCommentText: (v: string) => void; author: 'manager' | 'valentin';
    setAuthor: (v: 'manager' | 'valentin') => void; onSend: () => void; sending: boolean }) {

  const st = STATUS[project.status];
  const doneTasks = project.tasks.filter(t => t.done).length;

  return (
    <div style={{ animationDelay: `${animDelay}s`,
      background: 'var(--white)', border: `1px solid ${isOpen ? '#A0B8FF' : 'var(--border)'}`,
      borderRadius: 10, marginBottom: 8, overflow: 'hidden',
      boxShadow: isOpen ? '0 0 0 3px #EEF2FF' : '0 1px 2px rgba(0,0,0,0.03)',
      transition: 'border-color 0.15s, box-shadow 0.15s' }}>

      {/* Clickable row */}
      <div onClick={onToggle}
        style={{ display: 'grid', gridTemplateColumns: '40px 1fr 90px', gap: 16, padding: '13px 18px',
          alignItems: 'center', cursor: 'pointer' }}>

        {/* Priority badge */}
        <div style={{ width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 600,
          background: project.priority <= 3 ? 'var(--accent-light)' : 'var(--bg)',
          border: `1px solid ${project.priority <= 3 ? '#C7D7FF' : 'var(--border)'}`,
          color: project.priority <= 3 ? 'var(--accent)' : 'var(--muted)' }}>
          {project.priority}
        </div>

        {/* Main info */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 7, marginBottom: 4 }}>
            <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{project.name}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', padding: '2px 6px', borderRadius: 4,
              background: st.bg, color: st.color, fontWeight: 500 }}>{st.label}</span>
            {comments.length > 0 && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', padding: '1px 5px', borderRadius: 4,
                background: 'var(--accent-light)', color: 'var(--accent)' }}>💬 {comments.length}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--muted)',
              textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>En ce moment ·</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text)' }}>{project.currentAction}</span>
          </div>
        </div>

        {/* Progress */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 300, lineHeight: 1,
            color: project.progress >= 70 ? '#0F8B5A' : project.progress >= 40 ? '#B07D10' : 'var(--muted)' }}>
            {project.progress}<span style={{ fontSize: '0.7rem' }}>%</span>
          </div>
          <div style={{ height: 3, background: 'var(--bg2)', borderRadius: 99, overflow: 'hidden', marginTop: 4 }}>
            <div style={{ height: '100%', width: `${project.progress}%`, borderRadius: 99,
              background: project.progress >= 70 ? '#0F8B5A' : project.progress >= 40 ? '#F59E0B' : '#C0392B' }} />
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--muted)', marginTop: 3 }}>
            {doneTasks}/{project.tasks.length} tâches
          </div>
        </div>
      </div>

      {/* Expanded */}
      {isOpen && (
        <div onClick={e => e.stopPropagation()}
          style={{ borderTop: '1px solid var(--border)', padding: '16px 18px',
            background: 'var(--bg)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          <div>
            <ELabel>Prochaine étape</ELabel>
            <div style={{ fontSize: '0.8rem', lineHeight: 1.5, color: 'var(--text)',
              background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 6, padding: '8px 12px', marginBottom: 14 }}>
              → {project.nextStep}
            </div>
            <ELabel>Tâches · {doneTasks}/{project.tasks.length} complétées</ELabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {project.tasks.map(t => (
                <div key={t.id} style={{ display: 'flex', gap: 8, fontSize: '0.77rem', alignItems: 'flex-start' }}>
                  <div style={{ width: 14, height: 14, borderRadius: 3, flexShrink: 0, marginTop: 2,
                    background: t.done ? '#0F8B5A' : 'transparent',
                    border: t.done ? 'none' : '1.5px solid var(--border2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.52rem', color: '#fff', fontWeight: 700 }}>
                    {t.done && '✓'}
                  </div>
                  <span style={{ color: t.done ? 'var(--muted)' : 'var(--text)',
                    textDecoration: t.done ? 'line-through' : 'none', lineHeight: 1.4 }}>{t.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <ELabel>Échanges sur ce projet</ELabel>
            <div style={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 10 }}>
              {comments.length === 0
                ? <span style={{ fontSize: '0.73rem', color: 'var(--muted)', fontStyle: 'italic' }}>Aucun échange pour l'instant.</span>
                : comments.map(c => <Bubble key={c.id} comment={c} />)}
            </div>
            <div style={{ display: 'flex', gap: 5, marginBottom: 7 }}>
              {(['manager', 'valentin'] as const).map(a => (
                <button key={a} onClick={() => setAuthor(a)}
                  style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', fontWeight: 500, padding: '4px 10px', borderRadius: 5, cursor: 'pointer', border: '1px solid',
                    background: author === a ? (a === 'manager' ? 'var(--accent-light)' : 'var(--green-light)') : 'var(--white)',
                    borderColor: author === a ? (a === 'manager' ? '#A0B8FF' : '#6EE7B7') : 'var(--border)',
                    color: author === a ? (a === 'manager' ? 'var(--accent)' : 'var(--green)') : 'var(--muted)' }}>
                  {a === 'manager' ? '👔 Manager' : '💻 Valentin'}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={commentText} onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && onSend()}
                placeholder="Votre message… (Entrée)"
                style={{ flex: 1, fontFamily: 'var(--font-body)', fontSize: '0.76rem',
                  background: 'var(--white)', border: '1px solid var(--border2)',
                  borderRadius: 6, padding: '6px 10px', color: 'var(--text)', outline: 'none' }} />
              <button onClick={onSend} disabled={sending || !commentText.trim()}
                style={{ fontFamily: 'var(--font-body)', fontSize: '0.73rem', fontWeight: 600,
                  background: 'var(--accent)', border: 'none', borderRadius: 6, padding: '6px 12px',
                  color: '#fff', cursor: 'pointer', opacity: (sending || !commentText.trim()) ? 0.4 : 1 }}>
                {sending ? '…' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Bubble({ comment }: { comment: Comment }) {
  const isM = comment.author === 'manager';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isM ? 'flex-start' : 'flex-end' }}>
      <div style={{ maxWidth: '90%', padding: '6px 10px', borderRadius: 7, fontSize: '0.76rem', lineHeight: 1.4,
        background: isM ? 'var(--accent-light)' : 'var(--green-light)',
        border: `1px solid ${isM ? '#C7D7FF' : '#A7F3D0'}`, color: 'var(--text)' }}>
        {comment.text}
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.56rem', color: 'var(--muted)', marginTop: 2 }}>
        {isM ? '👔' : '💻'} {new Date(comment.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
}

function ELabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.59rem', textTransform: 'uppercase',
    letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 7 }}>{children}</div>;
}
