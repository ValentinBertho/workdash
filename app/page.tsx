'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { DashboardData, Comment, Project, Status, ChangelogEntry, ManagerTask } from '@/types';

/* ─── Status config ─────────────────────────────────────── */
const STATUS: Record<Status, { label: string; icon: string; color: string; bg: string }> = {
  'en-cours':   { label: 'En cours',   icon: '⚡', color: '#7C3AED', bg: '#EDE9FE' },
  'a-deployer': { label: 'À déployer', icon: '🚀', color: '#EA580C', bg: '#FFEDD5' },
  'ok':         { label: 'Terminé',    icon: '✅', color: '#059669', bg: '#D1FAE5' },
  'bloque':     { label: 'Bloqué',     icon: '🔴', color: '#DC2626', bg: '#FEE2E2' },
  'a-cadrer':   { label: 'À cadrer',   icon: '📋', color: '#64748B', bg: '#F1F5F9' },
};

const PRIORITY_META = {
  high:   { label: 'Urgent',  color: '#DC2626', bg: '#FEE2E2', icon: '🔴' },
  medium: { label: 'Normal',  color: '#D97706', bg: '#FEF3C7', icon: '🟡' },
  low:    { label: 'Faible',  color: '#059669', bg: '#D1FAE5', icon: '🟢' },
} as const;

/* ─── Helpers ───────────────────────────────────────────── */
function getWeek(d: Date) {
  const s = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - s.getTime()) / 86400000 + s.getDay() + 1) / 7);
}

function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const diff = new Date(iso).setHours(0,0,0,0) - new Date().setHours(0,0,0,0);
  return Math.ceil(diff / 86400000);
}

function calcXP(data: DashboardData, comments: Comment[]) {
  return (
    data.projects.flatMap(p => p.tasks).filter(t => t.done).length * 10 +
    data.weeklyTodos.filter(t => t.done).length * 15 +
    data.projects.filter(p => p.progress >= 70).length * 25 +
    comments.length * 5
  );
}

function getLevel(xp: number) { return Math.floor(xp / 150) + 1; }
function getXPPct(xp: number) { return ((xp % 150) / 150) * 100; }

function getAchievements(data: DashboardData, comments: Comment[]) {
  const results: { icon: string; label: string; desc: string }[] = [];
  const tasks = data.projects.flatMap(p => p.tasks);
  if (data.projects.length >= 5)                                               results.push({ icon: '🚀', label: 'Multi-tasker',  desc: '5+ projets actifs' });
  if (data.projects.filter(p => p.progress >= 70).length >= 3)                results.push({ icon: '🔥', label: 'En Feu !',       desc: '3 projets à +70%' });
  if (data.weeklyTodos.every(t => t.done) && data.weeklyTodos.length > 0)     results.push({ icon: '⚡', label: 'Sprint Master', desc: 'Toutes les quêtes OK !' });
  if (comments.length >= 5)                                                    results.push({ icon: '💬', label: 'Communicant',   desc: '5+ échanges' });
  if (tasks.length > 0 && tasks.filter(t => t.done).length / tasks.length >= 0.5) results.push({ icon: '🎯', label: 'Sharp Shooter', desc: '+50% tâches' });
  if (data.projects.some(p => p.status === 'a-deployer'))                     results.push({ icon: '🛸', label: 'Go Live !',      desc: 'Prêt à déployer' });
  if (data.projects.some(p => p.status === 'ok'))                             results.push({ icon: '🏅', label: 'Livreur',        desc: 'Projet livré' });
  return results;
}

function getWeeklySummary(changelog: ChangelogEntry[]) {
  const mon = new Date(); mon.setHours(0,0,0,0);
  mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
  const week = changelog.filter(e => new Date(e.createdAt) >= mon);
  return {
    tasks:    week.filter(e => e.type === 'task_completed').length,
    progress: week.filter(e => e.type === 'progress_changed').length,
    deployed: week.filter(e => e.type === 'status_changed' && (e.to === 'a-deployer' || e.to === 'ok')).length,
    todos:    week.filter(e => e.type === 'todo_completed').length,
    total:    week.length,
  };
}

function fmtTimer(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/* ─── Page ──────────────────────────────────────────────── */
export default function Page() {
  const [checking, setChecking]         = useState(true);
  const [isManager, setIsManager]       = useState(false);
  const [loginPwd, setLoginPwd]         = useState('');
  const [loginErr, setLoginErr]         = useState('');
  const [data, setData]                 = useState<DashboardData | null>(null);
  const [comments, setComments]         = useState<Comment[]>([]);
  const [changelog, setChangelog]       = useState<ChangelogEntry[]>([]);
  const [managerTasks, setManagerTasks] = useState<ManagerTask[]>([]);
  const [openId, setOpenId]             = useState<string | null>(null);
  const [commentText, setCommentText]   = useState('');
  const [author, setAuthor]             = useState<'manager' | 'valentin'>('manager');
  const [sending, setSending]           = useState(false);
  // Meeting mode
  const [meeting, setMeeting]           = useState(false);
  const [meetIdx, setMeetIdx]           = useState(0);
  const [meetTimer, setMeetTimer]       = useState(0);
  const timerRef                        = useRef<ReturnType<typeof setInterval> | null>(null);
  // Manager task form (per project)
  const [mtForm, setMtForm]             = useState<Record<string, { label: string; priority: 'high'|'medium'|'low'; dueDate: string }>>({});

  const load = useCallback(async () => {
    const [d, c, cl, mt] = await Promise.all([
      fetch('/api/projects').then(r => r.json()),
      fetch('/api/comments').then(r => r.json()),
      fetch('/api/changelog').then(r => r.ok ? r.json() : []),
      fetch('/api/manager-tasks').then(r => r.ok ? r.json() : []),
    ]);
    setData(d); setComments(c); setChangelog(cl); setManagerTasks(mt);
  }, []);

  useEffect(() => {
    fetch('/api/auth/manager').then(r => r.json()).then(({ authenticated }) => {
      setIsManager(authenticated);
      setChecking(false);
      if (authenticated) load();
    });
  }, [load]);

  // Meeting mode keyboard + timer
  useEffect(() => {
    if (!meeting) { if (timerRef.current) clearInterval(timerRef.current); return; }
    setMeetTimer(0);
    timerRef.current = setInterval(() => setMeetTimer(t => t + 1), 1000);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMeeting(false);
      if (e.key === 'ArrowRight') setMeetIdx(i => Math.min(i + 1, (data?.projects.length ?? 1) - 1));
      if (e.key === 'ArrowLeft')  setMeetIdx(i => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); if (timerRef.current) clearInterval(timerRef.current); };
  }, [meeting, data]);

  const login = async () => {
    setLoginErr('');
    const res = await fetch('/api/auth/manager', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: loginPwd }) });
    if (res.ok) { setIsManager(true); load(); } else setLoginErr('Mot de passe incorrect');
  };

  const logout = async () => { await fetch('/api/auth/manager', { method: 'DELETE' }); setIsManager(false); setData(null); };

  const sendComment = async () => {
    if (!commentText.trim() || !openId) return;
    setSending(true);
    await fetch('/api/comments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: commentText.trim(), projectId: openId, author }) });
    setCommentText(''); await load(); setSending(false);
  };

  const assignTask = async (projectId: string, projectName: string) => {
    const f = mtForm[projectId];
    if (!f?.label.trim()) return;
    await fetch('/api/manager-tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, projectName, label: f.label.trim(), priority: f.priority || 'medium', dueDate: f.dueDate || undefined }) });
    setMtForm(prev => ({ ...prev, [projectId]: { label: '', priority: 'medium', dueDate: '' } }));
    await load();
  };

  const toggleManagerTask = async (id: string, done: boolean) => {
    await fetch('/api/manager-tasks', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, done }) });
    setManagerTasks(prev => prev.map(t => t.id === id ? { ...t, done } : t));
  };

  const deleteManagerTask = async (id: string) => {
    await fetch('/api/manager-tasks', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setManagerTasks(prev => prev.filter(t => t.id !== id));
  };

  /* ── Loading ── */
  if (checking) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="float" style={{ fontSize: '3rem', marginBottom: 12 }}>⚡</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: 'var(--purple)', fontSize: '1rem' }}>Chargement…</div>
      </div>
    </div>
  );

  /* ── Manager login ── */
  if (!isManager) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #F0EEFF 0%, #EDE9FE 50%, #DBEAFE 100%)' }}>
      <div style={{ background: 'white', border: '2.5px solid #1E1B4B', borderRadius: 22, padding: '48px 44px', width: 400, textAlign: 'center', boxShadow: '6px 6px 0 #1E1B4B' }}>
        <div className="float" style={{ fontSize: '3.5rem', marginBottom: 14 }}>👔</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.9rem', fontWeight: 900, color: '#1E1B4B', marginBottom: 4 }}>Espace Manager</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 28 }}>
          WorkDash · Tableau de bord Valentin
        </div>
        <input type="password" value={loginPwd} onChange={e => setLoginPwd(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()}
          placeholder="Mot de passe manager"
          style={{ width: '100%', fontFamily: 'var(--font-body)', fontSize: '0.95rem', background: '#F9F9FF',
            border: `2.5px solid ${loginErr ? '#DC2626' : '#C4B5FD'}`, borderRadius: 12, padding: '12px 16px',
            color: '#1E1B4B', outline: 'none', marginBottom: 12, boxShadow: `2px 2px 0 ${loginErr ? '#DC2626' : '#C4B5FD'}` }} />
        {loginErr && <div style={{ color: '#DC2626', fontSize: '0.8rem', marginBottom: 12, fontWeight: 600 }}>❌ {loginErr}</div>}
        <button onClick={login} style={{ width: '100%', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '0.98rem',
          background: '#7C3AED', border: '2.5px solid #5B21B6', borderRadius: 12, padding: '12px',
          color: 'white', cursor: 'pointer', boxShadow: '3px 3px 0 #5B21B6' }}>
          ⚡ Accéder au Dashboard
        </button>
        <div style={{ marginTop: 20, fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: '#C4B5FD' }}>
          Accès réservé au manager · MISMO
        </div>
      </div>
    </div>
  );

  if (!data) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: 'var(--purple)', fontSize: '1rem' }}>Chargement des données…</div>
    </div>
  );

  /* ── Computed values ── */
  const now         = new Date();
  const xp          = calcXP(data, comments);
  const level       = getLevel(xp);
  const xpPct       = getXPPct(xp);
  const achievements = getAchievements(data, comments);
  const doneTodos   = data.weeklyTodos.filter(t => t.done).length;
  const sorted      = [...data.projects].sort((a, b) => a.priority - b.priority);
  const avgProgress = Math.round(data.projects.reduce((s, p) => s + p.progress, 0) / Math.max(data.projects.length, 1));
  const overdue     = data.projects.filter(p => p.dueDate && daysUntil(p.dueDate)! < 0).length;
  const activeCount = data.projects.filter(p => p.status === 'en-cours').length;
  const IDEAL_CAP   = 5;
  const capPct      = Math.min((activeCount / IDEAL_CAP) * 100, 100);
  const capColor    = activeCount <= IDEAL_CAP ? '#059669' : activeCount <= IDEAL_CAP + 2 ? '#D97706' : '#DC2626';
  const summary     = getWeeklySummary(changelog);
  const recentLog   = [...changelog].reverse().slice(0, 12);

  const sections = [
    { title: 'En cours',        icon: '⚡', accent: '#7C3AED', bg: '#EDE9FE', items: sorted.filter(p => p.status === 'en-cours') },
    { title: 'Prêt à déployer', icon: '🚀', accent: '#EA580C', bg: '#FFEDD5', items: sorted.filter(p => p.status === 'a-deployer') },
    { title: 'Terminé / OK',    icon: '✅', accent: '#059669', bg: '#D1FAE5', items: sorted.filter(p => p.status === 'ok') },
    { title: 'À arbitrer',      icon: '🔴', accent: '#DC2626', bg: '#FEE2E2', items: sorted.filter(p => p.status === 'bloque' || p.status === 'a-cadrer') },
  ].filter(s => s.items.length > 0);

  const commentProps = { commentText, setCommentText, author, setAuthor, onSend: sendComment, sending };

  /* ── Meeting mode overlay ── */
  if (meeting && data) {
    const mp = sorted[meetIdx];
    if (!mp) { setMeeting(false); }
    else {
      const ms = STATUS[mp.status];
      return (
        <div style={{ position: 'fixed', inset: 0, background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 40 }}>
          {/* Timer + nav */}
          <div style={{ position: 'absolute', top: 28, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', color: '#A78BFA', letterSpacing: '0.1em' }}>
              ⏱ {fmtTimer(meetTimer)}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: 'white', fontSize: '0.85rem' }}>
              🎤 Mode Réunion · {meetIdx + 1} / {sorted.length}
            </div>
            <button onClick={() => setMeeting(false)} style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '0.82rem',
              background: '#DC2626', border: '2px solid #991B1B', borderRadius: 10, padding: '7px 16px', color: 'white', cursor: 'pointer', boxShadow: '2px 2px 0 #991B1B' }}>
              ✕ Quitter (ESC)
            </button>
          </div>

          {/* Project card */}
          <div style={{ background: 'white', border: `3px solid ${ms.color}`, borderRadius: 24, padding: '40px 48px',
            boxShadow: `6px 6px 0 ${ms.color}`, maxWidth: 820, width: '100%', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 900, color: '#1E1B4B', marginBottom: 12 }}>{mp.name}</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: ms.bg,
              border: `2px solid ${ms.color}`, borderRadius: 12, padding: '6px 18px', marginBottom: 28 }}>
              <span style={{ fontSize: '1.1rem' }}>{ms.icon}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '0.9rem', color: ms.color }}>{ms.label}</span>
            </div>
            {/* Progress */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: '#6B7280', fontSize: '0.82rem' }}>Avancement</span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: ms.color, fontSize: '1.5rem' }}>{mp.progress}%</span>
              </div>
              <div style={{ height: 16, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden', border: '2px solid #E5E7EB' }}>
                <div style={{ height: '100%', width: `${mp.progress}%`, borderRadius: 99,
                  background: mp.progress >= 70 ? 'linear-gradient(90deg,#059669,#34D399)' : mp.progress >= 40 ? 'linear-gradient(90deg,#D97706,#FBBF24)' : 'linear-gradient(90deg,#DC2626,#F87171)',
                  transition: 'width 0.6s' }} />
              </div>
            </div>
            {/* Action */}
            <div style={{ background: '#F9F9FF', border: '2px solid #E5E7EB', borderRadius: 12, padding: '14px 20px', marginBottom: 20, textAlign: 'left' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>En ce moment</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#374151' }}>{mp.currentAction}</div>
            </div>
            <div style={{ background: ms.bg, border: `2px solid ${ms.color}`, borderRadius: 12, padding: '14px 20px', textAlign: 'left' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: ms.color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>Prochaine étape</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#374151' }}>→ {mp.nextStep}</div>
            </div>
          </div>

          {/* Nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 32 }}>
            <button onClick={() => setMeetIdx(i => Math.max(i - 1, 0))} disabled={meetIdx === 0}
              style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1rem',
                background: meetIdx === 0 ? 'rgba(255,255,255,0.1)' : 'white',
                border: '2.5px solid rgba(255,255,255,0.3)', borderRadius: 12, padding: '10px 24px',
                color: meetIdx === 0 ? 'rgba(255,255,255,0.3)' : '#1E1B4B', cursor: meetIdx === 0 ? 'not-allowed' : 'pointer',
                boxShadow: meetIdx === 0 ? 'none' : '3px 3px 0 rgba(255,255,255,0.2)' }}>
              ← Précédent
            </button>
            <div style={{ display: 'flex', gap: 6 }}>
              {sorted.map((_, i) => (
                <div key={i} onClick={() => setMeetIdx(i)} style={{ width: i === meetIdx ? 24 : 8, height: 8, borderRadius: 99,
                  background: i === meetIdx ? '#A78BFA' : 'rgba(255,255,255,0.25)', cursor: 'pointer', transition: 'all 0.2s' }} />
              ))}
            </div>
            <button onClick={() => setMeetIdx(i => Math.min(i + 1, sorted.length - 1))} disabled={meetIdx === sorted.length - 1}
              style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1rem',
                background: meetIdx === sorted.length - 1 ? 'rgba(255,255,255,0.1)' : 'white',
                border: '2.5px solid rgba(255,255,255,0.3)', borderRadius: 12, padding: '10px 24px',
                color: meetIdx === sorted.length - 1 ? 'rgba(255,255,255,0.3)' : '#1E1B4B',
                cursor: meetIdx === sorted.length - 1 ? 'not-allowed' : 'pointer',
                boxShadow: meetIdx === sorted.length - 1 ? 'none' : '3px 3px 0 rgba(255,255,255,0.2)' }}>
              Suivant →
            </button>
          </div>
          <div style={{ marginTop: 16, fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)' }}>
            ← → pour naviguer · ESC pour quitter
          </div>
        </div>
      );
    }
  }

  /* ── Dashboard ── */
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }} id="print-root">

      {/* HEADER */}
      <header style={{ background: 'linear-gradient(135deg,#5B21B6 0%,#7C3AED 60%,#6D28D9 100%)',
        borderBottom: '3px solid #1E1B4B', boxShadow: '0 4px 0 #1E1B4B' }} className="no-print-hide">
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 76 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, background: 'white', borderRadius: 14, border: '2.5px solid #1E1B4B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', boxShadow: '3px 3px 0 #1E1B4B' }}>⚡</div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 900, color: 'white', letterSpacing: '-0.02em', lineHeight: 1.1 }}>WorkDash</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'rgba(255,255,255,0.6)' }}>Manager · MISMO</div>
            </div>
          </div>
          {/* Player card */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: '10px 18px', border: '2px solid rgba(255,255,255,0.25)' }}>
            <div style={{ width: 40, height: 40, background: '#F59E0B', borderRadius: 12, border: '2.5px solid rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', boxShadow: '2px 2px 0 #92400E' }}>💻</div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: 'white', fontSize: '0.95rem' }}>Valentin</span>
                <span style={{ background: '#F59E0B', color: '#78350F', fontSize: '0.65rem', fontWeight: 900, padding: '2px 9px', borderRadius: 99, border: '2px solid #92400E', fontFamily: 'var(--font-display)' }}>Lv.{level}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 130, height: 7, background: 'rgba(255,255,255,0.2)', borderRadius: 99, overflow: 'hidden', border: '1.5px solid rgba(255,255,255,0.3)' }}>
                  <div className="xp-bar" style={{ height: '100%', width: `${xpPct}%`, borderRadius: 99 }} />
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'rgba(255,255,255,0.75)' }}>{xp} XP</span>
              </div>
            </div>
          </div>
          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ textAlign: 'right', marginRight: 4 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: 'white', fontSize: '0.88rem' }}>Semaine {getWeek(now)}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'rgba(255,255,255,0.6)' }}>{now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
            </div>
            <button onClick={() => { setMeetIdx(0); setMeeting(true); }} style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '0.78rem', background: '#F59E0B', border: '2.5px solid #92400E', borderRadius: 10, padding: '7px 14px', color: '#78350F', cursor: 'pointer', boxShadow: '2px 2px 0 #92400E' }}>🎤 Réunion</button>
            <button onClick={() => window.print()} style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '0.78rem', background: '#EDE9FE', border: '2.5px solid #7C3AED', borderRadius: 10, padding: '7px 14px', color: '#7C3AED', cursor: 'pointer', boxShadow: '2px 2px 0 #7C3AED' }}>📄 PDF</button>
            <a href="/admin" style={{ fontFamily: 'var(--font-display)', fontSize: '0.78rem', fontWeight: 900, color: '#7C3AED', textDecoration: 'none', padding: '7px 14px', borderRadius: 10, background: 'white', border: '2.5px solid #1E1B4B', boxShadow: '2px 2px 0 #1E1B4B' }}>Admin</a>
            <button onClick={logout} style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.2)', borderRadius: 10, padding: '7px 12px', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>🔓 Déco</button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 28px' }}>

        {/* WEEKLY SUMMARY BANNER */}
        {summary.total > 0 && (
          <div style={{ background: 'linear-gradient(135deg,#EDE9FE,#DBEAFE)', border: '2.5px solid #7C3AED', borderRadius: 16, padding: '14px 22px', marginBottom: 20, boxShadow: '4px 4px 0 #7C3AED', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '0.88rem', color: '#5B21B6', marginRight: 4 }}>📊 Cette semaine :</div>
            {[
              summary.tasks    > 0 && `✅ ${summary.tasks} tâche${summary.tasks > 1 ? 's' : ''} complétée${summary.tasks > 1 ? 's' : ''}`,
              summary.progress > 0 && `📈 ${summary.progress} avancement${summary.progress > 1 ? 's' : ''}`,
              summary.deployed > 0 && `🚀 ${summary.deployed} déployé${summary.deployed > 1 ? 's' : ''}`,
              summary.todos    > 0 && `🎯 ${summary.todos} quête${summary.todos > 1 ? 's' : ''} OK`,
            ].filter(Boolean).map((s, i) => (
              <span key={i} style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 800, padding: '4px 12px', background: 'white', border: '2px solid #7C3AED', borderRadius: 99, color: '#5B21B6', boxShadow: '2px 2px 0 #7C3AED' }}>{s as string}</span>
            ))}
          </div>
        )}

        {/* CAPACITY GAUGE */}
        <div style={{ background: 'white', border: `2.5px solid ${capColor}`, borderRadius: 14, padding: '12px 20px', marginBottom: 20, boxShadow: `3px 3px 0 ${capColor}`, display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: '1.2rem' }}>⚙️</span>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '0.82rem', color: capColor }}>Charge de travail : {activeCount} projet{activeCount > 1 ? 's' : ''} en cours / {IDEAL_CAP} idéal</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: capColor, fontWeight: 700 }}>
                {activeCount <= IDEAL_CAP ? '✅ Capacité OK' : activeCount <= IDEAL_CAP + 2 ? '⚠️ Charge élevée' : '🔴 Surcharge !'}
              </span>
            </div>
            <div style={{ height: 10, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden', border: `2px solid ${capColor}` }}>
              <div style={{ height: '100%', width: `${capPct}%`, borderRadius: 99,
                background: activeCount <= IDEAL_CAP ? 'linear-gradient(90deg,#059669,#34D399)' : activeCount <= IDEAL_CAP + 2 ? 'linear-gradient(90deg,#D97706,#FBBF24)' : 'linear-gradient(90deg,#DC2626,#F87171)',
                transition: 'width 0.5s' }} />
            </div>
          </div>
        </div>

        {/* KPI STRIP */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 28 }}>
          {([
            { label: 'Projets',      val: data.projects.length,                                       icon: '📁', color: '#7C3AED', bg: '#EDE9FE', border: '#7C3AED' },
            { label: 'En cours',     val: activeCount,                                                 icon: '⚡', color: '#5B21B6', bg: '#DDD6FE', border: '#5B21B6' },
            { label: 'À déployer',   val: sorted.filter(p => p.status === 'a-deployer').length,        icon: '🚀', color: '#EA580C', bg: '#FFEDD5', border: '#EA580C' },
            { label: 'Avancement',   val: `${avgProgress}%`,                                          icon: '📊', color: '#2563EB', bg: '#DBEAFE', border: '#2563EB' },
            { label: 'Quêtes sem.',  val: `${doneTodos}/${data.weeklyTodos.length}`,                  icon: '🎯', color: '#DB2777', bg: '#FCE7F3', border: '#DB2777' },
            { label: 'En retard',    val: overdue,                                                     icon: '⏰', color: overdue > 0 ? '#DC2626' : '#059669', bg: overdue > 0 ? '#FEE2E2' : '#D1FAE5', border: overdue > 0 ? '#DC2626' : '#059669' },
          ] as const).map((k, i) => (
            <div key={k.label} className="slide-up" style={{ animationDelay: `${i * 0.05}s`, background: k.bg, border: `2.5px solid ${k.border}`, borderRadius: 14, padding: '14px 16px', boxShadow: `3px 3px 0 ${k.border}` }}>
              <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{k.icon}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.9rem', fontWeight: 900, color: k.color, lineHeight: 1 }}>{k.val}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: k.color, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 4 }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* MAIN GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 296px', gap: 24, alignItems: 'start' }}>

          {/* PROJECTS */}
          <div>
            {sections.map((section, si) => (
              <div key={section.title} className="slide-up" style={{ marginBottom: 28, animationDelay: `${si * 0.08}s` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: section.bg, border: `2.5px solid ${section.accent}`, borderRadius: 12, padding: '5px 14px', boxShadow: `3px 3px 0 ${section.accent}` }}>
                    <span>{section.icon}</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.88rem', fontWeight: 900, color: section.accent }}>{section.title}</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', fontWeight: 900, background: section.accent, color: 'white', borderRadius: 99, padding: '2px 8px' }}>{section.items.length}</span>
                  </div>
                  <div style={{ flex: 1, height: 2, background: section.bg, border: `1px solid ${section.accent}33`, borderRadius: 99 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {section.items.map((p, i) => (
                    <ProjectCard key={p.id} project={p} animDelay={i * 0.05}
                      comments={comments.filter(c => c.projectId === p.id)}
                      managerTasks={managerTasks.filter(t => t.projectId === p.id)}
                      isOpen={openId === p.id} onToggle={() => setOpenId(o => o === p.id ? null : p.id)}
                      mtForm={mtForm[p.id] ?? { label: '', priority: 'medium', dueDate: '' }}
                      onMtFormChange={f => setMtForm(prev => ({ ...prev, [p.id]: f }))}
                      onAssignTask={() => assignTask(p.id, p.name)}
                      onToggleManagerTask={toggleManagerTask}
                      onDeleteManagerTask={deleteManagerTask}
                      {...commentProps} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* SIDEBAR */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Weekly quests */}
            <div style={{ background: 'white', border: '2.5px solid #1E1B4B', borderRadius: 18, padding: '18px', boxShadow: '4px 4px 0 #1E1B4B' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: '1.1rem' }}>🗓</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 900 }}>Quêtes de la semaine</span>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--muted)' }}>{doneTodos}/{data.weeklyTodos.length}</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.78rem', fontWeight: 900, color: doneTodos === data.weeklyTodos.length ? '#059669' : '#7C3AED' }}>
                    {Math.round(doneTodos / Math.max(data.weeklyTodos.length, 1) * 100)}%
                  </span>
                </div>
                <div style={{ height: 10, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden', border: '2px solid #1E1B4B' }}>
                  <div style={{ height: '100%', borderRadius: 99, transition: 'width 0.6s', width: `${doneTodos / Math.max(data.weeklyTodos.length, 1) * 100}%`,
                    background: doneTodos === data.weeklyTodos.length ? 'linear-gradient(90deg,#059669,#34D399)' : 'linear-gradient(90deg,#7C3AED,#A78BFA)' }} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {data.weeklyTodos.map(t => (
                  <div key={t.id} style={{ display: 'flex', gap: 8, padding: '4px 0', borderBottom: '1px dashed #E9D5FF', alignItems: 'flex-start' }}>
                    <div style={{ width: 17, height: 17, borderRadius: 5, flexShrink: 0, marginTop: 1, background: t.done ? '#059669' : 'white', border: `2px solid ${t.done ? '#059669' : '#D1D5DB'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', color: 'white', fontWeight: 900 }}>{t.done ? '✓' : ''}</div>
                    <span style={{ fontSize: '0.74rem', lineHeight: 1.4, color: t.done ? '#9CA3AF' : 'var(--text)', textDecoration: t.done ? 'line-through' : 'none', fontWeight: t.done ? 400 : 500 }}>{t.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Changelog feed */}
            {recentLog.length > 0 && (
              <div style={{ background: 'white', border: '2.5px solid #1E1B4B', borderRadius: 18, padding: '18px', boxShadow: '4px 4px 0 #1E1B4B' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: '1.1rem' }}>📜</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 900 }}>Historique</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {recentLog.map((e, i) => {
                    const typeIcon: Record<string, string> = { progress_changed: '📈', status_changed: '🔄', task_completed: '✅', todo_completed: '🎯', project_added: '✨', task_added: '➕' };
                    return (
                      <div key={e.id} style={{ display: 'flex', gap: 8, padding: '7px 0', borderBottom: i < recentLog.length - 1 ? '1px dashed #E9D5FF' : 'none', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '0.8rem', flexShrink: 0, marginTop: 1 }}>{typeIcon[e.type] ?? '•'}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.74rem', color: '#374151', lineHeight: 1.35, fontWeight: 500, wordBreak: 'break-word' }}>{e.description}</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.56rem', color: '#9CA3AF', marginTop: 2 }}>
                            {new Date(e.createdAt).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Achievements */}
            {achievements.length > 0 && (
              <div style={{ background: 'linear-gradient(135deg,#FEF3C7,#FFFBEB)', border: '2.5px solid #D97706', borderRadius: 18, padding: '18px', boxShadow: '4px 4px 0 #D97706' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: '1.1rem' }}>🏆</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 900, color: '#92400E' }}>Achievements</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {achievements.map((a, i) => (
                    <div key={i} title={a.desc} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'white', border: '2px solid #D97706', borderRadius: 9, padding: '4px 9px', boxShadow: '2px 2px 0 #D97706' }}>
                      <span style={{ fontSize: '0.85rem' }}>{a.icon}</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', fontWeight: 900, color: '#92400E' }}>{a.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Decision points */}
            <div style={{ background: 'white', border: '2.5px solid #DC2626', borderRadius: 18, padding: '18px', boxShadow: '4px 4px 0 #DC2626' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: '1.1rem' }}>❓</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 900, color: '#DC2626' }}>Points à décider</span>
              </div>
              {['Créer brouillon mail depuis API GRAPH → Todo YN', "NDF : Ajout analytique + suppression d'un frais", "Outil d'Audit : CRON, réconciliation auto, paramétrage dynamique"].map((q, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: i < 2 ? '1px dashed #FECACA' : 'none', alignItems: 'flex-start' }}>
                  <div style={{ width: 17, height: 17, background: '#FEE2E2', border: '2px solid #DC2626', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 900, color: '#DC2626', flexShrink: 0, marginTop: 1 }}>!</div>
                  <span style={{ fontSize: '0.74rem', lineHeight: 1.4, color: '#7F1D1D', fontWeight: 500 }}>{q}</span>
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--muted)' }}>
              Mis à jour · {new Date(data.updatedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ─── Project Card ──────────────────────────────────────── */
function ProjectCard({ project, animDelay, comments, managerTasks, isOpen, onToggle,
  commentText, setCommentText, author, setAuthor, onSend, sending,
  mtForm, onMtFormChange, onAssignTask, onToggleManagerTask, onDeleteManagerTask,
}: {
  project: Project; animDelay: number; comments: Comment[];
  managerTasks: ManagerTask[]; isOpen: boolean; onToggle: () => void;
  commentText: string; setCommentText: (v: string) => void;
  author: 'manager' | 'valentin'; setAuthor: (v: 'manager' | 'valentin') => void;
  onSend: () => void; sending: boolean;
  mtForm: { label: string; priority: 'high'|'medium'|'low'; dueDate: string };
  onMtFormChange: (f: { label: string; priority: 'high'|'medium'|'low'; dueDate: string }) => void;
  onAssignTask: () => void;
  onToggleManagerTask: (id: string, done: boolean) => void;
  onDeleteManagerTask: (id: string) => void;
}) {
  const st = STATUS[project.status];
  const doneTasks = project.tasks.filter(t => t.done).length;
  const days = daysUntil(project.dueDate);
  const isOverdue = days !== null && days < 0;
  const isDueSoon = days !== null && days >= 0 && days <= 3;
  const progressGrad = project.progress >= 70 ? 'linear-gradient(90deg,#059669,#34D399)' : project.progress >= 40 ? 'linear-gradient(90deg,#D97706,#FBBF24)' : 'linear-gradient(90deg,#DC2626,#F87171)';
  const progressColor = project.progress >= 70 ? '#059669' : project.progress >= 40 ? '#D97706' : '#DC2626';

  return (
    <div className="slide-up" style={{ animationDelay: `${animDelay}s`, background: 'white', border: `2.5px solid ${isOpen ? st.color : '#1E1B4B'}`, borderRadius: 16, overflow: 'hidden', boxShadow: isOpen ? `4px 4px 0 ${st.color}` : '3px 3px 0 #1E1B4B', transition: 'border-color 0.2s, box-shadow 0.2s' }}>

      {/* Collapsed row */}
      <div onClick={onToggle} style={{ display: 'grid', gridTemplateColumns: '46px 1fr 108px', gap: 14, padding: '13px 18px', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 900, background: project.priority <= 3 ? '#EDE9FE' : '#F3F4F6', border: `2.5px solid ${project.priority <= 3 ? '#7C3AED' : '#9CA3AF'}`, color: project.priority <= 3 ? '#7C3AED' : '#6B7280', boxShadow: project.priority <= 3 ? '2px 2px 0 #7C3AED' : '2px 2px 0 #9CA3AF' }}>#{project.priority}</div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '0.9rem' }}>{project.name}</span>
            <span style={{ fontSize: '0.63rem', padding: '3px 8px', borderRadius: 8, fontWeight: 900, background: st.bg, color: st.color, border: `2px solid ${st.color}`, fontFamily: 'var(--font-display)' }}>{st.icon} {st.label}</span>
            {comments.length > 0 && <span style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: 7, fontWeight: 900, background: '#EDE9FE', color: '#7C3AED', border: '2px solid #7C3AED' }}>💬 {comments.length}</span>}
            {managerTasks.filter(t => !t.done).length > 0 && <span style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: 7, fontWeight: 900, background: '#FEF3C7', color: '#D97706', border: '2px solid #D97706' }}>📌 {managerTasks.filter(t => !t.done).length}</span>}
            {isOverdue && <span style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: 7, fontWeight: 900, background: '#FEE2E2', color: '#DC2626', border: '2px solid #DC2626' }}>⏰ En retard {Math.abs(days!)}j</span>}
            {isDueSoon && <span style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: 7, fontWeight: 900, background: '#FEF3C7', color: '#D97706', border: '2px solid #D97706' }}>⚠️ Échéance J-{days}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: '#A78BFA', flexShrink: 0 }}>▶</span>
            <span style={{ fontSize: '0.76rem', color: '#4B5563', fontWeight: 500, lineHeight: 1.3 }}>{project.currentAction}</span>
          </div>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.9rem', fontWeight: 900, lineHeight: 1, color: progressColor, textAlign: 'right', marginBottom: 4 }}>{project.progress}<span style={{ fontSize: '0.78rem' }}>%</span></div>
          <div style={{ height: 10, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden', border: '2px solid #E5E7EB', marginBottom: 3 }}>
            <div style={{ height: '100%', width: `${project.progress}%`, borderRadius: 99, background: progressGrad, transition: 'width 0.5s' }} />
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.56rem', color: '#9CA3AF', textAlign: 'right' }}>{doneTasks}/{project.tasks.length} tâches</div>
        </div>
      </div>

      {/* Expanded */}
      {isOpen && (
        <div onClick={e => e.stopPropagation()} style={{ borderTop: `2.5px solid ${st.color}`, padding: '18px 20px', background: st.bg + '44', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* LEFT: next step + tasks + manager tasks */}
          <div>
            <PanelLabel icon="🎯" text="Prochaine étape" color={st.color} />
            <div style={{ fontSize: '0.8rem', lineHeight: 1.55, color: '#374151', background: 'white', border: `2px solid ${st.color}`, borderRadius: 12, padding: '10px 13px', marginBottom: 14, boxShadow: `2px 2px 0 ${st.color}` }}>→ {project.nextStep}</div>

            {/* Manager tasks */}
            {managerTasks.length > 0 && (
              <>
                <PanelLabel icon="📌" text={`Demandes manager · ${managerTasks.filter(t => t.done).length}/${managerTasks.length}`} color="#D97706" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
                  {managerTasks.map(t => {
                    const pm = PRIORITY_META[t.priority];
                    const td = daysUntil(t.dueDate);
                    return (
                      <div key={t.id} style={{ display: 'flex', gap: 8, background: 'white', border: `2px solid ${t.done ? '#9CA3AF' : '#D97706'}`, borderRadius: 10, padding: '7px 10px', boxShadow: t.done ? 'none' : '2px 2px 0 #D97706', alignItems: 'flex-start' }}>
                        <input type="checkbox" checked={t.done} onChange={() => onToggleManagerTask(t.id, !t.done)} style={{ accentColor: '#D97706', width: 15, height: 15, marginTop: 1, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.76rem', fontWeight: t.done ? 400 : 600, textDecoration: t.done ? 'line-through' : 'none', color: t.done ? '#9CA3AF' : '#374151', lineHeight: 1.35 }}>{t.label}</div>
                          <div style={{ display: 'flex', gap: 5, marginTop: 3, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.58rem', padding: '1px 6px', background: pm.bg, color: pm.color, border: `1.5px solid ${pm.color}`, borderRadius: 6, fontWeight: 700 }}>{pm.icon} {pm.label}</span>
                            {t.dueDate && <span style={{ fontSize: '0.58rem', padding: '1px 6px', background: td !== null && td < 0 ? '#FEE2E2' : '#F3F4F6', color: td !== null && td < 0 ? '#DC2626' : '#6B7280', borderRadius: 6, fontWeight: 700 }}>
                              {td !== null && td < 0 ? `⏰ Retard ${Math.abs(td)}j` : `📅 ${new Date(t.dueDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`}
                            </span>}
                          </div>
                        </div>
                        <button onClick={() => onDeleteManagerTask(t.id)} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 900, opacity: 0.6, padding: '0 4px', flexShrink: 0 }}>✕</button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Assign task */}
            <PanelLabel icon="➕" text="Assigner une tâche à Valentin" color="#7C3AED" />
            <div style={{ background: 'white', border: '2px solid #C4B5FD', borderRadius: 12, padding: '10px 12px', boxShadow: '2px 2px 0 #C4B5FD' }}>
              <input value={mtForm.label} onChange={e => onMtFormChange({ ...mtForm, label: e.target.value })} onKeyDown={e => e.key === 'Enter' && onAssignTask()}
                placeholder="Description de la tâche…"
                style={{ width: '100%', fontFamily: 'var(--font-body)', fontSize: '0.78rem', border: 'none', outline: 'none', color: '#374151', marginBottom: 8, background: 'transparent' }} />
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <select value={mtForm.priority} onChange={e => onMtFormChange({ ...mtForm, priority: e.target.value as 'high'|'medium'|'low' })}
                  style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', fontWeight: 900, border: '2px solid #E5E7EB', borderRadius: 7, padding: '4px 8px', color: '#374151', background: 'white', cursor: 'pointer' }}>
                  <option value="high">🔴 Urgent</option>
                  <option value="medium">🟡 Normal</option>
                  <option value="low">🟢 Faible</option>
                </select>
                <input type="date" value={mtForm.dueDate} onChange={e => onMtFormChange({ ...mtForm, dueDate: e.target.value })}
                  style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', border: '2px solid #E5E7EB', borderRadius: 7, padding: '4px 8px', color: '#374151', background: 'white', flex: 1 }} />
                <button onClick={onAssignTask} disabled={!mtForm.label.trim()}
                  style={{ fontFamily: 'var(--font-display)', fontSize: '0.72rem', fontWeight: 900, background: mtForm.label.trim() ? '#7C3AED' : '#E5E7EB', border: `2px solid ${mtForm.label.trim() ? '#5B21B6' : '#D1D5DB'}`, borderRadius: 8, padding: '5px 12px', color: mtForm.label.trim() ? 'white' : '#9CA3AF', cursor: mtForm.label.trim() ? 'pointer' : 'not-allowed', boxShadow: mtForm.label.trim() ? '2px 2px 0 #5B21B6' : 'none' }}>
                  📌 Assigner
                </button>
              </div>
            </div>

            {/* Project tasks */}
            <div style={{ marginTop: 14 }}>
              <PanelLabel icon="✔️" text={`Tâches Valentin · ${doneTasks}/${project.tasks.length}`} color={st.color} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {project.tasks.map(t => (
                  <div key={t.id} style={{ display: 'flex', gap: 8, background: 'white', border: `2px solid ${t.done ? '#059669' : '#E5E7EB'}`, borderRadius: 9, padding: '6px 10px', boxShadow: t.done ? '2px 2px 0 #059669' : '1px 1px 0 #E5E7EB' }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 1, background: t.done ? '#059669' : 'white', border: `2px solid ${t.done ? '#059669' : '#D1D5DB'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', color: 'white', fontWeight: 900 }}>{t.done && '✓'}</div>
                    <span style={{ fontSize: '0.76rem', color: t.done ? '#9CA3AF' : '#374151', textDecoration: t.done ? 'line-through' : 'none', lineHeight: 1.35, fontWeight: t.done ? 400 : 500 }}>{t.label}</span>
                  </div>
                ))}
                {project.tasks.length === 0 && <div style={{ fontSize: '0.73rem', color: '#9CA3AF', fontStyle: 'italic' }}>Aucune tâche renseignée.</div>}
              </div>
            </div>
          </div>

          {/* RIGHT: chat */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <PanelLabel icon="💬" text="Discussion" color={st.color} />
            <div style={{ flex: 1, maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10, padding: '2px 0' }}>
              {comments.length === 0
                ? <div style={{ textAlign: 'center', padding: '20px 0' }}><div style={{ fontSize: '1.6rem', marginBottom: 6 }}>💬</div><div style={{ fontSize: '0.72rem', color: '#9CA3AF', fontStyle: 'italic' }}>Pas encore d&apos;échanges sur ce projet.</div></div>
                : comments.map(c => <ChatBubble key={c.id} comment={c} />)
              }
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {(['manager', 'valentin'] as const).map(a => (
                <button key={a} onClick={() => setAuthor(a)} style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: '0.72rem', fontWeight: 900, padding: '6px 8px', borderRadius: 9, cursor: 'pointer', background: author === a ? (a === 'manager' ? '#2563EB' : '#059669') : 'white', border: `2.5px solid ${author === a ? (a === 'manager' ? '#1D4ED8' : '#047857') : '#E5E7EB'}`, color: author === a ? 'white' : '#6B7280', boxShadow: author === a ? `2px 2px 0 ${a === 'manager' ? '#1D4ED8' : '#047857'}` : '1px 1px 0 #E5E7EB', transition: 'all 0.15s' }}>
                  {a === 'manager' ? '👔 Manager' : '💻 Valentin'}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 7 }}>
              <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && onSend()}
                placeholder={`Message en tant que ${author === 'manager' ? 'Manager' : 'Valentin'}…`}
                style={{ flex: 1, fontFamily: 'var(--font-body)', fontSize: '0.78rem', background: 'white', border: '2.5px solid #1E1B4B', borderRadius: 10, padding: '8px 12px', color: 'var(--text)', outline: 'none', boxShadow: '2px 2px 0 #1E1B4B' }} />
              <button onClick={onSend} disabled={sending || !commentText.trim()} style={{ fontFamily: 'var(--font-display)', fontSize: '0.76rem', fontWeight: 900, background: sending || !commentText.trim() ? '#E5E7EB' : '#7C3AED', border: `2.5px solid ${sending || !commentText.trim() ? '#D1D5DB' : '#5B21B6'}`, borderRadius: 10, padding: '8px 14px', color: sending || !commentText.trim() ? '#9CA3AF' : 'white', cursor: sending || !commentText.trim() ? 'not-allowed' : 'pointer', boxShadow: sending || !commentText.trim() ? 'none' : '2px 2px 0 #5B21B6', transition: 'all 0.15s' }}>
                {sending ? '…' : 'Envoyer →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Chat bubble ───────────────────────────────────────── */
function ChatBubble({ comment }: { comment: Comment }) {
  const isM = comment.author === 'manager';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isM ? 'flex-start' : 'flex-end' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, flexDirection: isM ? 'row' : 'row-reverse' }}>
        <div style={{ width: 27, height: 27, borderRadius: 9, flexShrink: 0, background: isM ? '#DBEAFE' : '#D1FAE5', border: `2px solid ${isM ? '#2563EB' : '#059669'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.82rem' }}>{isM ? '👔' : '💻'}</div>
        <div style={{ maxWidth: '78%', padding: '8px 12px', borderRadius: isM ? '4px 13px 13px 13px' : '13px 4px 13px 13px', fontSize: '0.77rem', lineHeight: 1.5, background: isM ? '#DBEAFE' : '#D1FAE5', border: `2px solid ${isM ? '#2563EB' : '#059669'}`, color: '#1F2937', boxShadow: `2px 2px 0 ${isM ? '#1D4ED8' : '#047857'}` }}>{comment.text}</div>
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.54rem', color: '#9CA3AF', marginTop: 2, paddingLeft: isM ? 33 : 0, paddingRight: isM ? 0 : 33 }}>
        {new Date(comment.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
}

/* ─── Panel label ───────────────────────────────────────── */
function PanelLabel({ icon, text, color }: { icon: string; text: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
      <span style={{ fontSize: '0.82rem' }}>{icon}</span>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.67rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.07em', color }}>{text}</span>
    </div>
  );
}
