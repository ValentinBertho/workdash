'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { DashboardData, Comment, Project, Status, ChangelogEntry, ManagerTask, DecisionPoint } from '@/types';

/* ─── Status config ─────────────────────────────────────── */
const STATUS: Record<Status, { label: string; color: string; bg: string; border: string }> = {
  'en-cours':   { label: 'En cours',   color: '#6366F1', bg: '#EEF2FF', border: '#C7D2FE' },
  'a-deployer': { label: 'À déployer', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  'ok':         { label: 'Terminé',    color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  'bloque':     { label: 'Bloqué',     color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  'a-cadrer':   { label: 'À cadrer',   color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0' },
};

const PRIORITY_COLOR = { high: '#DC2626', medium: '#D97706', low: '#059669' } as const;
const PRIORITY_LABEL = { high: 'Urgent', medium: 'Normal', low: 'Faible' } as const;

const DECISION_STATUS = {
  open:     { label: 'En attente', dot: '#D97706', text: '#92400E', bg: '#FFFBEB' },
  decided:  { label: 'Décidé',     dot: '#059669', text: '#065F46', bg: '#ECFDF5' },
  deferred: { label: 'Reporté',    dot: '#64748B', text: '#475569', bg: '#F8FAFC' },
} as const;

/* ─── Helpers ───────────────────────────────────────────── */
function getWeek(d: Date) {
  const s = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - s.getTime()) / 86400000 + s.getDay() + 1) / 7);
}

function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000);
}

function fmtTimer(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
}

function relativeTime(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'à l\'instant';
  if (m < 60) return `il y a ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

/* ─── Page ──────────────────────────────────────────────── */
export default function Page() {
  const [checking, setChecking]           = useState(true);
  const [isManager, setIsManager]         = useState(false);
  const [loginPwd, setLoginPwd]           = useState('');
  const [loginErr, setLoginErr]           = useState('');
  const [data, setData]                   = useState<DashboardData | null>(null);
  const [comments, setComments]           = useState<Comment[]>([]);
  const [changelog, setChangelog]         = useState<ChangelogEntry[]>([]);
  const [managerTasks, setManagerTasks]   = useState<ManagerTask[]>([]);
  const [decisions, setDecisions]         = useState<DecisionPoint[]>([]);
  const [openId, setOpenId]               = useState<string | null>(null);
  const [commentText, setCommentText]     = useState('');
  const [commentAuthor, setCommentAuthor] = useState<'manager' | 'valentin'>('manager');
  const [sending, setSending]             = useState(false);
  // Meeting
  const [meeting, setMeeting]   = useState(false);
  const [meetIdx, setMeetIdx]   = useState(0);
  const [meetTimer, setMeetTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Manager task forms
  const [mtForm, setMtForm] = useState<Record<string, { label: string; priority: 'high'|'medium'|'low'; dueDate: string }>>({});

  const load = useCallback(async () => {
    const [d, c, cl, mt, dec] = await Promise.all([
      fetch('/api/projects').then(r => r.json()),
      fetch('/api/comments').then(r => r.json()),
      fetch('/api/changelog').then(r => r.ok ? r.json() : []),
      fetch('/api/manager-tasks').then(r => r.ok ? r.json() : []),
      fetch('/api/decisions').then(r => r.ok ? r.json() : []),
    ]);
    setData(d); setComments(c); setChangelog(cl); setManagerTasks(mt); setDecisions(dec);
  }, []);

  useEffect(() => {
    fetch('/api/auth/manager').then(r => r.json()).then(({ authenticated }) => {
      setIsManager(authenticated);
      setChecking(false);
      if (authenticated) load();
    });
  }, [load]);

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
    await fetch('/api/comments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: commentText.trim(), projectId: openId, author: commentAuthor }) });
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

  if (checking) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
      <p style={{ fontSize:'0.82rem', color:'var(--text-3)', fontWeight:500 }}>Chargement…</p>
    </div>
  );

  /* ── Login ── */
  if (!isManager) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,#0F172A 0%,#1E1B4B 100%)' }}>
      <div style={{ background:'white', borderRadius:20, padding:'48px 44px', width:400, textAlign:'center', boxShadow:'0 24px 48px rgba(0,0,0,0.3)' }}>
        <div style={{ width:52, height:52, background:'#EEF2FF', borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', border:'1.5px solid #C7D2FE' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <div style={{ fontWeight:700, fontSize:'1.4rem', color:'var(--text)', letterSpacing:'-0.02em', marginBottom:4 }}>Espace Manager</div>
        <div style={{ fontSize:'0.8rem', color:'var(--text-3)', marginBottom:32 }}>WorkDash · MISMO</div>
        <input type="password" value={loginPwd} onChange={e => setLoginPwd(e.target.value)} onKeyDown={e => e.key==='Enter'&&login()}
          placeholder="Mot de passe"
          style={{ width:'100%', fontSize:'0.88rem', background:'var(--bg)', border:`1.5px solid ${loginErr?'#DC2626':'var(--border)'}`, borderRadius:10, padding:'11px 14px', color:'var(--text)', outline:'none', marginBottom:10, transition:'border-color 0.15s' }} />
        {loginErr && <p style={{ color:'#DC2626', fontSize:'0.78rem', marginBottom:12, fontWeight:500 }}>{loginErr}</p>}
        <button onClick={login} style={{ width:'100%', fontWeight:600, fontSize:'0.88rem', background:'#6366F1', border:'none', borderRadius:10, padding:'12px', color:'white', cursor:'pointer' }}
          onMouseOver={e=>(e.currentTarget.style.opacity='0.9')} onMouseOut={e=>(e.currentTarget.style.opacity='1')}>
          Accéder au dashboard
        </button>
        <p style={{ marginTop:24, fontSize:'0.68rem', color:'#CBD5E1', fontFamily:'var(--font-mono)' }}>Accès manager · MISMO</p>
      </div>
    </div>
  );

  if (!data) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
      <p style={{ fontSize:'0.82rem', color:'var(--text-3)', fontWeight:500 }}>Chargement des données…</p>
    </div>
  );

  /* ── Computed ── */
  const now      = new Date();
  const sorted   = [...data.projects].sort((a, b) => a.priority - b.priority);
  const active   = sorted.filter(p => p.status === 'en-cours');
  const deploy   = sorted.filter(p => p.status === 'a-deployer');
  const done     = sorted.filter(p => p.status === 'ok');
  const blocked  = sorted.filter(p => p.status === 'bloque' || p.status === 'a-cadrer');
  const avgProg  = Math.round(data.projects.reduce((s, p) => s + p.progress, 0) / Math.max(data.projects.length, 1));
  const overdue  = data.projects.filter(p => p.dueDate && daysUntil(p.dueDate)! < 0).length;
  const doneTodos = data.weeklyTodos.filter(t => t.done).length;
  const recentLog = [...changelog].reverse().slice(0, 10);
  const openDecisions = decisions.filter(d => d.status === 'open').length;

  const sections = [
    { status: 'en-cours'   as Status, items: active  },
    { status: 'a-deployer' as Status, items: deploy  },
    { status: 'ok'         as Status, items: done    },
    { status: 'bloque'     as Status, items: blocked },
  ].filter(s => s.items.length > 0);

  /* ── Meeting mode ── */
  if (meeting) {
    const mp = sorted[meetIdx];
    if (!mp) { setMeeting(false); return null; }
    const ms = STATUS[mp.status];
    const pg = mp.progress >= 70 ? '#059669' : mp.progress >= 40 ? '#D97706' : '#DC2626';
    return (
      <div style={{ position:'fixed', inset:0, background:'#0F172A', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', zIndex:9999, padding:48 }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#6366F1,#8B5CF6)' }} />
        <div style={{ position:'absolute', top:24, left:0, right:0, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 40px' }}>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.88rem', color:'#64748B', letterSpacing:'0.08em' }}>{fmtTimer(meetTimer)}</span>
          <span style={{ fontSize:'0.75rem', color:'#475569', fontWeight:500 }}>Mode réunion · {meetIdx+1}/{sorted.length}</span>
          <button onClick={()=>setMeeting(false)} style={{ fontSize:'0.75rem', fontWeight:600, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'6px 14px', color:'#64748B', cursor:'pointer' }}>Quitter (ESC)</button>
        </div>
        <div style={{ background:'white', borderRadius:20, padding:'44px 52px', maxWidth:760, width:'100%', boxShadow:'0 24px 48px rgba(0,0,0,0.4)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:ms.color, flexShrink:0 }} />
            <h2 style={{ fontSize:'1.8rem', fontWeight:700, color:'var(--text)', letterSpacing:'-0.02em', flex:1 }}>{mp.name}</h2>
            <span style={{ fontSize:'0.75rem', fontWeight:600, padding:'4px 12px', borderRadius:99, background:ms.bg, color:ms.color, border:`1px solid ${ms.border}` }}>{ms.label}</span>
          </div>
          <div style={{ marginBottom:32 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:10 }}>
              <span style={{ fontSize:'0.72rem', fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Avancement</span>
              <span style={{ fontSize:'2.6rem', fontWeight:800, color:pg, letterSpacing:'-0.03em' }}>{mp.progress}<span style={{ fontSize:'1.1rem' }}>%</span></span>
            </div>
            <div style={{ height:8, background:'#F1F5F9', borderRadius:99, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${mp.progress}%`, borderRadius:99, transition:'width 0.5s', background:mp.progress>=70?'linear-gradient(90deg,#059669,#34D399)':mp.progress>=40?'linear-gradient(90deg,#D97706,#FBBF24)':'linear-gradient(90deg,#DC2626,#F87171)' }} />
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div style={{ background:'var(--bg)', borderRadius:12, padding:'16px 18px' }}>
              <p style={{ fontSize:'0.68rem', fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>En ce moment</p>
              <p style={{ fontSize:'0.9rem', color:'var(--text-2)', lineHeight:1.55 }}>{mp.currentAction}</p>
            </div>
            <div style={{ background:ms.bg, borderRadius:12, padding:'16px 18px', border:`1px solid ${ms.border}` }}>
              <p style={{ fontSize:'0.68rem', fontWeight:600, color:ms.color, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>Prochaine étape</p>
              <p style={{ fontSize:'0.9rem', color:'var(--text)', lineHeight:1.55, fontWeight:500 }}>→ {mp.nextStep}</p>
            </div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:20, marginTop:36 }}>
          <button onClick={()=>setMeetIdx(i=>Math.max(i-1,0))} disabled={meetIdx===0} style={{ fontSize:'0.82rem', fontWeight:600, background:meetIdx===0?'rgba(255,255,255,0.03)':'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'9px 22px', color:meetIdx===0?'#1E293B':'white', cursor:meetIdx===0?'not-allowed':'pointer' }}>← Précédent</button>
          <div style={{ display:'flex', gap:5 }}>
            {sorted.map((_,i)=>(
              <div key={i} onClick={()=>setMeetIdx(i)} style={{ width:i===meetIdx?22:6, height:6, borderRadius:99, background:i===meetIdx?'#6366F1':'rgba(255,255,255,0.15)', cursor:'pointer', transition:'all 0.2s' }} />
            ))}
          </div>
          <button onClick={()=>setMeetIdx(i=>Math.min(i+1,sorted.length-1))} disabled={meetIdx===sorted.length-1} style={{ fontSize:'0.82rem', fontWeight:600, background:meetIdx===sorted.length-1?'rgba(255,255,255,0.03)':'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'9px 22px', color:meetIdx===sorted.length-1?'#1E293B':'white', cursor:meetIdx===sorted.length-1?'not-allowed':'pointer' }}>Suivant →</button>
        </div>
        <p style={{ marginTop:12, fontFamily:'var(--font-mono)', fontSize:'0.58rem', color:'#1E293B' }}>← → pour naviguer · ESC pour quitter</p>
      </div>
    );
  }

  /* ── Dashboard ── */
  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }} id="print-root">

      {/* HEADER */}
      <header className="no-print" style={{ background:'#0F172A', borderBottom:'1px solid #1E293B', position:'sticky', top:0, zIndex:50 }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#6366F1,#8B5CF6)' }} />
        <div style={{ maxWidth:1380, margin:'0 auto', padding:'0 28px', display:'flex', alignItems:'center', justifyContent:'space-between', height:64 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:36, height:36, background:'#6366F1', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>
            <div>
              <p style={{ fontWeight:700, fontSize:'0.95rem', color:'white', letterSpacing:'-0.01em', lineHeight:1.2 }}>WorkDash</p>
              <p style={{ fontFamily:'var(--font-mono)', fontSize:'0.58rem', color:'#475569' }}>MISMO · Manager</p>
            </div>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ textAlign:'right', marginRight:6 }}>
              <p style={{ fontSize:'0.82rem', fontWeight:600, color:'#E2E8F0' }}>Valentin Bertho</p>
              <p style={{ fontFamily:'var(--font-mono)', fontSize:'0.6rem', color:'#475569' }}>Semaine {getWeek(now)} · {now.toLocaleDateString('fr-FR',{day:'2-digit',month:'long'})}</p>
            </div>
            <Btn onClick={()=>{setMeetIdx(0);setMeeting(true);}}>Réunion</Btn>
            <Btn onClick={()=>window.print()}>PDF</Btn>
            <BtnLink href="/admin">Admin</BtnLink>
            <button onClick={logout} title="Déconnexion" style={{ width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', background:'none', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, cursor:'pointer', color:'#475569' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth:1380, margin:'0 auto', padding:'28px 28px 56px' }}>

        {/* KPI STRIP */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:28 }}>
          {([
            { label:'Projets',    value:data.projects.length, sub:`${active.length} en cours`,                   accent:'#6366F1' },
            { label:'À déployer', value:deploy.length,        sub:'prêts à livrer',                              accent:'#D97706' },
            { label:'Avancement', value:`${avgProg}%`,        sub:'progression globale',                        accent:avgProg>=60?'#059669':'#D97706' },
            { label:'En retard',  value:overdue,              sub:overdue>0?`projet${overdue>1?'s':''}`:' aucun retard', accent:overdue>0?'#DC2626':'#059669' },
            { label:'À décider',  value:openDecisions,        sub:'points ouverts',                              accent:'#D97706' },
          ] as const).map((k,i) => (
            <div key={i} className="slide-up" style={{ animationDelay:`${i*0.04}s`, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:'18px 20px', boxShadow:'var(--shadow-xs)', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:k.accent, borderRadius:'14px 14px 0 0', opacity:0.8 }} />
              <p style={{ fontSize:'0.68rem', fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>{k.label}</p>
              <p style={{ fontSize:'2rem', fontWeight:800, color:k.accent, letterSpacing:'-0.03em', lineHeight:1 }}>{k.value}</p>
              <p style={{ fontSize:'0.72rem', color:'var(--text-3)', marginTop:5 }}>{k.sub}</p>
            </div>
          ))}
        </div>

        {/* MAIN GRID */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 316px', gap:20, alignItems:'start' }}>

          {/* PROJECTS */}
          <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
            {sections.map((section, si) => {
              const sc = STATUS[section.status];
              return (
                <div key={section.status} className="slide-up" style={{ animationDelay:`${si*0.06}s` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10, paddingBottom:10, borderBottom:'1px solid var(--border)' }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:sc.color }} />
                    <span style={{ fontSize:'0.72rem', fontWeight:700, color:'var(--text-2)', textTransform:'uppercase', letterSpacing:'0.07em' }}>{sc.label}</span>
                    <span style={{ fontSize:'0.7rem', fontWeight:600, color:sc.color, background:sc.bg, border:`1px solid ${sc.border}`, borderRadius:99, padding:'1px 8px', fontFamily:'var(--font-mono)' }}>{section.items.length}</span>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {section.items.map((p, i) => (
                      <ProjectCard key={p.id} project={p} animDelay={i*0.04}
                        comments={comments.filter(c=>c.projectId===p.id)}
                        managerTasks={managerTasks.filter(t=>t.projectId===p.id)}
                        isOpen={openId===p.id} onToggle={()=>setOpenId(o=>o===p.id?null:p.id)}
                        commentText={commentText} setCommentText={setCommentText}
                        commentAuthor={commentAuthor} setCommentAuthor={setCommentAuthor}
                        onSendComment={sendComment} sending={sending}
                        mtForm={mtForm[p.id]??{label:'',priority:'medium',dueDate:''}}
                        onMtFormChange={f=>setMtForm(prev=>({...prev,[p.id]:f}))}
                        onAssignTask={()=>assignTask(p.id,p.name)}
                        onToggleManagerTask={toggleManagerTask}
                        onDeleteManagerTask={deleteManagerTask} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* SIDEBAR */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

            {/* Weekly todos */}
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:'18px', boxShadow:'var(--shadow-xs)' }}>
              <SidebarHeader label={`Semaine ${getWeek(now)}`} right={`${doneTodos}/${data.weeklyTodos.length}`} />
              <div style={{ height:4, background:'var(--surface-2)', borderRadius:99, overflow:'hidden', marginBottom:12 }}>
                <div style={{ height:'100%', borderRadius:99, transition:'width 0.4s',
                  width:`${(doneTodos/Math.max(data.weeklyTodos.length,1))*100}%`,
                  background:doneTodos===data.weeklyTodos.length?'#059669':'#6366F1' }} />
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
                {data.weeklyTodos.map(t => (
                  <div key={t.id} style={{ display:'flex', gap:9, padding:'5px 0', alignItems:'flex-start' }}>
                    <div style={{ width:15, height:15, borderRadius:4, flexShrink:0, marginTop:2,
                      background:t.done?'#059669':'transparent', border:`1.5px solid ${t.done?'#059669':'var(--border-2)'}`,
                      display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {t.done && <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <span style={{ fontSize:'0.77rem', lineHeight:1.45, color:t.done?'var(--text-3)':'var(--text-2)', textDecoration:t.done?'line-through':'none', fontWeight:t.done?400:500 }}>{t.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Decision Points */}
            <DecisionPointsPanel decisions={decisions} comments={comments} openCount={openDecisions} reload={load} />

            {/* Changelog */}
            {recentLog.length > 0 && (
              <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:'18px', boxShadow:'var(--shadow-xs)' }}>
                <SidebarHeader label="Activité récente" />
                {recentLog.map((e, i) => {
                  const icon: Record<string,string> = { progress_changed:'↑', status_changed:'→', task_completed:'✓', todo_completed:'✓', project_added:'+', task_added:'+' };
                  return (
                    <div key={e.id} style={{ display:'flex', gap:10, padding:'7px 0', borderBottom:i<recentLog.length-1?'1px solid var(--bg)':'none', alignItems:'flex-start' }}>
                      <div style={{ width:20, height:20, borderRadius:6, background:'var(--surface-2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1, fontSize:'0.62rem', fontWeight:700, color:'var(--text-3)', fontFamily:'var(--font-mono)' }}>{icon[e.type]??'·'}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:'0.75rem', color:'var(--text-2)', lineHeight:1.4, fontWeight:500 }}>{e.description}</p>
                        <p style={{ fontSize:'0.62rem', color:'var(--text-3)', marginTop:2, fontFamily:'var(--font-mono)' }}>{relativeTime(e.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <p style={{ textAlign:'center', fontFamily:'var(--font-mono)', fontSize:'0.58rem', color:'var(--text-3)' }}>
              màj {new Date(data.updatedAt).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ─── Small header helpers ──────────────────────────────── */
function SidebarHeader({ label, right }: { label: string; right?: string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
      <span style={{ fontSize:'0.7rem', fontWeight:700, color:'var(--text-2)', textTransform:'uppercase', letterSpacing:'0.08em' }}>{label}</span>
      {right && <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.66rem', color:'var(--text-3)' }}>{right}</span>}
    </div>
  );
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize:'0.66rem', fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:7 }}>{children}</p>;
}

function Btn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ fontSize:'0.76rem', fontWeight:600, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'7px 14px', color:'#94A3B8', cursor:'pointer' }}>
      {children}
    </button>
  );
}

function BtnLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} style={{ fontSize:'0.76rem', fontWeight:600, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'7px 14px', color:'#94A3B8', textDecoration:'none', display:'inline-block' }}>
      {children}
    </a>
  );
}

/* ─── Decision Points panel ─────────────────────────────── */
function DecisionPointsPanel({ decisions, comments, openCount, reload }: {
  decisions: DecisionPoint[]; comments: Comment[]; openCount: number; reload: () => void;
}) {
  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const [showAdd, setShowAdd]           = useState(false);
  const [newText, setNewText]           = useState('');
  const [commentInputs, setCommentInputs] = useState<Record<string,string>>({});
  const [resolving, setResolving]       = useState<string | null>(null);
  const [resolution, setResolution]     = useState('');
  const [author, setAuthor]             = useState<'manager'|'valentin'>('manager');
  const [sending, setSending]           = useState(false);

  const addDecision = async () => {
    if (!newText.trim()) return;
    await fetch('/api/decisions', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({text:newText.trim()}) });
    setNewText(''); setShowAdd(false); reload();
  };

  const updateStatus = async (id: string, status: 'open'|'decided'|'deferred', res?: string) => {
    await fetch('/api/decisions', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id,status,resolution:res||undefined}) });
    setResolving(null); setResolution(''); reload();
  };

  const deleteDecision = async (id: string) => {
    await fetch('/api/decisions', { method:'DELETE', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id}) });
    reload();
  };

  const sendComment = async (decisionId: string) => {
    const text = commentInputs[decisionId]?.trim();
    if (!text || sending) return;
    setSending(true);
    await fetch('/api/comments', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({text, projectId:'decision:'+decisionId, author}) });
    setCommentInputs(prev=>({...prev,[decisionId]:''}));
    setSending(false); reload();
  };

  const sorted = [
    ...decisions.filter(d=>d.status==='open'),
    ...decisions.filter(d=>d.status==='decided'),
    ...decisions.filter(d=>d.status==='deferred'),
  ];

  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, boxShadow:'var(--shadow-xs)', overflow:'hidden' }}>
      {/* Header */}
      <div style={{ padding:'16px 18px 14px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:'0.7rem', fontWeight:700, color:'var(--text-2)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Points à décider</span>
          {openCount > 0 && (
            <span style={{ fontSize:'0.64rem', fontWeight:700, background:'#FFFBEB', color:'#92400E', border:'1px solid #FDE68A', borderRadius:99, padding:'1px 7px', fontFamily:'var(--font-mono)' }}>{openCount}</span>
          )}
        </div>
        <button onClick={()=>setShowAdd(v=>!v)}
          style={{ width:26, height:26, display:'flex', alignItems:'center', justifyContent:'center', background:showAdd?'#EEF2FF':'var(--surface-2)', border:`1px solid ${showAdd?'#C7D2FE':'var(--border)'}`, borderRadius:7, cursor:'pointer', color:showAdd?'#6366F1':'var(--text-3)', fontSize:'1.1rem', lineHeight:1, transition:'all 0.15s' }}>
          {showAdd ? '×' : '+'}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div style={{ padding:'12px 18px', borderBottom:'1px solid var(--border)', background:'#EEF2FF' }} className="fade-in">
          <textarea value={newText} onChange={e=>setNewText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&e.metaKey&&addDecision()}
            placeholder="Décrire le point à décider…" rows={2}
            style={{ width:'100%', fontSize:'0.8rem', background:'white', border:'1.5px solid #C7D2FE', borderRadius:8, padding:'9px 11px', color:'var(--text)', outline:'none', resize:'none', lineHeight:1.5, marginBottom:8 }} />
          <div style={{ display:'flex', justifyContent:'flex-end', gap:6 }}>
            <button onClick={()=>{setShowAdd(false);setNewText('');}}
              style={{ fontSize:'0.74rem', fontWeight:600, background:'white', border:'1px solid var(--border)', borderRadius:7, padding:'6px 12px', color:'var(--text-3)', cursor:'pointer' }}>
              Annuler
            </button>
            <button onClick={addDecision} disabled={!newText.trim()}
              style={{ fontSize:'0.74rem', fontWeight:600, background:newText.trim()?'#6366F1':'var(--border)', border:'none', borderRadius:7, padding:'6px 12px', color:newText.trim()?'white':'var(--text-3)', cursor:newText.trim()?'pointer':'not-allowed', transition:'all 0.15s' }}>
              Ajouter
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div>
        {sorted.length === 0 && (
          <p style={{ padding:'24px 18px', textAlign:'center', fontSize:'0.76rem', color:'var(--text-3)' }}>Aucun point à décider.</p>
        )}
        {sorted.map((d, i) => {
          const ds = DECISION_STATUS[d.status];
          const dComments = comments.filter(c=>c.projectId===`decision:${d.id}`);
          const isExpanded = expandedId === d.id;
          return (
            <div key={d.id} style={{ borderBottom:i<sorted.length-1?'1px solid var(--bg)':'none' }}>
              {/* Row */}
              <div onClick={()=>setExpandedId(v=>v===d.id?null:d.id)}
                style={{ display:'flex', gap:10, padding:'11px 18px', cursor:'pointer', alignItems:'flex-start', background:isExpanded?'var(--surface-2)':'transparent', transition:'background 0.15s' }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:ds.dot, flexShrink:0, marginTop:5 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:'0.8rem', fontWeight:500, color:d.status==='decided'?'var(--text-3)':'var(--text)', lineHeight:1.4,
                    textDecoration:d.status==='decided'?'line-through':'none' }}>{d.text}</p>
                  {d.resolution && (
                    <p style={{ fontSize:'0.72rem', color:ds.text, background:ds.bg, borderRadius:6, padding:'3px 8px', marginTop:5, display:'inline-block', border:`1px solid ${ds.dot}33` }}>{d.resolution}</p>
                  )}
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:5 }}>
                    <span style={{ fontSize:'0.62rem', color:ds.text, background:ds.bg, borderRadius:99, padding:'1px 7px', fontWeight:600 }}>{ds.label}</span>
                    {dComments.length > 0 && <span style={{ fontSize:'0.62rem', color:'var(--text-3)' }}>{dComments.length} réponse{dComments.length>1?'s':''}</span>}
                  </div>
                </div>
                <button onClick={e=>{e.stopPropagation();deleteDecision(d.id);}}
                  style={{ background:'none', border:'none', color:'var(--text-3)', cursor:'pointer', fontSize:'0.85rem', padding:'2px 4px', opacity:0.4, flexShrink:0, lineHeight:1 }}>×</button>
              </div>

              {/* Expanded */}
              {isExpanded && (
                <div style={{ padding:'4px 18px 14px', background:'var(--surface-2)' }} className="fade-in" onClick={e=>e.stopPropagation()}>
                  {/* Thread */}
                  {dComments.length > 0 && (
                    <div style={{ marginBottom:10, display:'flex', flexDirection:'column', gap:7 }}>
                      {dComments.map(c => (
                        <div key={c.id} style={{ display:'flex', flexDirection:'column', alignItems:c.author==='manager'?'flex-start':'flex-end' }}>
                          <div style={{ maxWidth:'88%', background:c.author==='manager'?'white':'#EEF2FF', border:`1px solid ${c.author==='manager'?'var(--border)':'#C7D2FE'}`, borderRadius:c.author==='manager'?'4px 10px 10px 10px':'10px 4px 10px 10px', padding:'7px 10px', fontSize:'0.76rem', lineHeight:1.5, color:'var(--text)', boxShadow:'var(--shadow-xs)' }}>
                            {c.text}
                          </div>
                          <p style={{ fontSize:'0.62rem', color:'var(--text-3)', marginTop:2, fontWeight:500 }}>
                            {c.author==='manager'?'Manager':'Valentin'} · {relativeTime(c.createdAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Status buttons */}
                  {d.status==='open' && resolving!==d.id+':decided' && (
                    <div style={{ display:'flex', gap:6, marginBottom:10 }}>
                      <button onClick={()=>setResolving(d.id+':decided')} style={{ flex:1, fontSize:'0.72rem', fontWeight:600, background:'#ECFDF5', border:'1px solid #A7F3D0', borderRadius:7, padding:'6px', color:'#059669', cursor:'pointer' }}>Décider</button>
                      <button onClick={()=>updateStatus(d.id,'deferred')} style={{ flex:1, fontSize:'0.72rem', fontWeight:600, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:7, padding:'6px', color:'var(--text-3)', cursor:'pointer' }}>Reporter</button>
                    </div>
                  )}
                  {(d.status==='decided'||d.status==='deferred') && (
                    <button onClick={()=>updateStatus(d.id,'open')} style={{ width:'100%', fontSize:'0.72rem', fontWeight:600, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:7, padding:'6px', color:'var(--text-3)', cursor:'pointer', marginBottom:10 }}>Réouvrir</button>
                  )}

                  {/* Resolution form */}
                  {resolving===d.id+':decided' && (
                    <div style={{ marginBottom:10 }} className="fade-in">
                      <input value={resolution} onChange={e=>setResolution(e.target.value)} onKeyDown={e=>e.key==='Enter'&&updateStatus(d.id,'decided',resolution)} placeholder="Résolution (optionnelle)…"
                        style={{ width:'100%', fontSize:'0.78rem', background:'white', border:'1.5px solid #A7F3D0', borderRadius:7, padding:'7px 10px', color:'var(--text)', outline:'none', marginBottom:6 }} />
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={()=>{setResolving(null);setResolution('');}} style={{ flex:1, fontSize:'0.72rem', fontWeight:600, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:7, padding:'6px', color:'var(--text-3)', cursor:'pointer' }}>Annuler</button>
                        <button onClick={()=>updateStatus(d.id,'decided',resolution)} style={{ flex:1, fontSize:'0.72rem', fontWeight:600, background:'#059669', border:'none', borderRadius:7, padding:'6px', color:'white', cursor:'pointer' }}>Confirmer</button>
                      </div>
                    </div>
                  )}

                  {/* Reply */}
                  <div style={{ display:'flex', gap:6 }}>
                    <select value={author} onChange={e=>setAuthor(e.target.value as 'manager'|'valentin')}
                      style={{ fontSize:'0.68rem', fontWeight:600, background:'white', border:'1px solid var(--border)', borderRadius:7, padding:'6px 8px', color:'var(--text-2)', cursor:'pointer', flexShrink:0 }}>
                      <option value="manager">Manager</option>
                      <option value="valentin">Valentin</option>
                    </select>
                    <input value={commentInputs[d.id]??''} onChange={e=>setCommentInputs(prev=>({...prev,[d.id]:e.target.value}))}
                      onKeyDown={e=>e.key==='Enter'&&sendComment(d.id)}
                      placeholder="Répondre…"
                      style={{ flex:1, fontSize:'0.76rem', background:'white', border:'1px solid var(--border)', borderRadius:7, padding:'6px 10px', color:'var(--text)', outline:'none' }} />
                    <button onClick={()=>sendComment(d.id)} disabled={sending||!(commentInputs[d.id]?.trim())}
                      style={{ fontSize:'0.76rem', fontWeight:600, background:(commentInputs[d.id]?.trim()&&!sending)?'#6366F1':'var(--border)', border:'none', borderRadius:7, padding:'6px 12px', color:(commentInputs[d.id]?.trim()&&!sending)?'white':'var(--text-3)', cursor:(commentInputs[d.id]?.trim()&&!sending)?'pointer':'not-allowed', flexShrink:0 }}>
                      →
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Project card ──────────────────────────────────────── */
function ProjectCard({ project, animDelay, comments, managerTasks, isOpen, onToggle,
  commentText, setCommentText, commentAuthor, setCommentAuthor, onSendComment, sending,
  mtForm, onMtFormChange, onAssignTask, onToggleManagerTask, onDeleteManagerTask,
}: {
  project: Project; animDelay: number; comments: Comment[]; managerTasks: ManagerTask[];
  isOpen: boolean; onToggle: () => void;
  commentText: string; setCommentText: (v:string)=>void;
  commentAuthor: 'manager'|'valentin'; setCommentAuthor: (v:'manager'|'valentin')=>void;
  onSendComment: ()=>void; sending: boolean;
  mtForm: {label:string;priority:'high'|'medium'|'low';dueDate:string};
  onMtFormChange: (f:{label:string;priority:'high'|'medium'|'low';dueDate:string})=>void;
  onAssignTask: ()=>void;
  onToggleManagerTask: (id:string,done:boolean)=>void;
  onDeleteManagerTask: (id:string)=>void;
}) {
  const st = STATUS[project.status];
  const doneTasks = project.tasks.filter(t=>t.done).length;
  const days = daysUntil(project.dueDate);
  const isOverdue = days !== null && days < 0;
  const isDueSoon = days !== null && days >= 0 && days <= 3;
  const pg = project.progress>=70?'#059669':project.progress>=40?'#D97706':'#DC2626';
  const pgGrad = project.progress>=70?'linear-gradient(90deg,#059669,#34D399)':project.progress>=40?'linear-gradient(90deg,#D97706,#FBBF24)':'linear-gradient(90deg,#DC2626,#F87171)';
  const pendingTasks = managerTasks.filter(t=>!t.done).length;

  return (
    <div className="slide-up" style={{ animationDelay:`${animDelay}s`, background:'var(--surface)', border:`1px solid ${isOpen?st.color+'55':'var(--border)'}`, borderRadius:14, overflow:'hidden', boxShadow:isOpen?`var(--shadow-sm), 0 0 0 3px ${st.color}14`:'var(--shadow-xs)', transition:'border-color 0.2s, box-shadow 0.2s' }}>
      {/* Status stripe */}
      <div style={{ height:3, background:st.color, opacity:0.75 }} />

      {/* Collapsed */}
      <div onClick={onToggle} style={{ display:'grid', gridTemplateColumns:'1fr 80px', gap:14, padding:'13px 16px', cursor:'pointer', alignItems:'center' }}>
        <div style={{ minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:5, flexWrap:'wrap' }}>
            <span style={{ fontWeight:600, fontSize:'0.88rem', color:'var(--text)' }}>{project.name}</span>
            {pendingTasks > 0 && <Tag color="#D97706" bg="#FFFBEB" border="#FDE68A">{pendingTasks} demande{pendingTasks>1?'s':''}</Tag>}
            {comments.length > 0 && <Tag color="#6366F1" bg="#EEF2FF" border="#C7D2FE">{comments.length}</Tag>}
            {isOverdue && <Tag color="#DC2626" bg="#FEF2F2" border="#FECACA">Retard {Math.abs(days!)}j</Tag>}
            {isDueSoon && !isOverdue && <Tag color="#D97706" bg="#FFFBEB" border="#FDE68A">J-{days}</Tag>}
          </div>
          <p style={{ fontSize:'0.77rem', color:'var(--text-3)', lineHeight:1.4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{project.currentAction}</p>
        </div>
        <div style={{ textAlign:'right' }}>
          <p style={{ fontSize:'1.65rem', fontWeight:800, color:pg, letterSpacing:'-0.03em', lineHeight:1, marginBottom:5 }}>{project.progress}<span style={{ fontSize:'0.7rem', fontWeight:600 }}>%</span></p>
          <div style={{ height:4, background:'var(--surface-2)', borderRadius:99, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${project.progress}%`, borderRadius:99, background:pgGrad, transition:'width 0.4s' }} />
          </div>
          <p style={{ fontFamily:'var(--font-mono)', fontSize:'0.57rem', color:'var(--text-3)', marginTop:3 }}>{doneTasks}/{project.tasks.length}</p>
        </div>
      </div>

      {/* Expanded */}
      {isOpen && (
        <div onClick={e=>e.stopPropagation()} style={{ borderTop:'1px solid var(--border)', padding:'16px', background:'var(--surface-2)', display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

          {/* LEFT */}
          <div>
            <SubLabel>Prochaine étape</SubLabel>
            <div style={{ fontSize:'0.8rem', lineHeight:1.55, color:'var(--text-2)', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 12px', marginBottom:14 }}>
              → {project.nextStep}
            </div>

            {managerTasks.length > 0 && (
              <>
                <SubLabel>Demandes ({managerTasks.filter(t=>t.done).length}/{managerTasks.length})</SubLabel>
                <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:14 }}>
                  {managerTasks.map(t => {
                    const td = daysUntil(t.dueDate);
                    return (
                      <div key={t.id} style={{ display:'flex', gap:8, background:'var(--surface)', border:`1px solid ${t.done?'var(--border)':'var(--border-2)'}`, borderRadius:9, padding:'7px 10px', alignItems:'flex-start' }}>
                        <input type="checkbox" checked={t.done} onChange={()=>onToggleManagerTask(t.id,!t.done)} style={{ accentColor:'#6366F1', width:14, height:14, marginTop:2, flexShrink:0, cursor:'pointer' }} />
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ fontSize:'0.76rem', fontWeight:t.done?400:500, textDecoration:t.done?'line-through':'none', color:t.done?'var(--text-3)':'var(--text)', lineHeight:1.35 }}>{t.label}</p>
                          <div style={{ display:'flex', gap:6, marginTop:3 }}>
                            <span style={{ fontSize:'0.62rem', fontWeight:600, color:PRIORITY_COLOR[t.priority] }}>{PRIORITY_LABEL[t.priority]}</span>
                            {t.dueDate && <span style={{ fontSize:'0.62rem', color:td!==null&&td<0?'#DC2626':'var(--text-3)' }}>
                              {td!==null&&td<0?`Retard ${Math.abs(td)}j`:new Date(t.dueDate).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'})}
                            </span>}
                          </div>
                        </div>
                        <button onClick={()=>onDeleteManagerTask(t.id)} style={{ background:'none', border:'none', color:'var(--text-3)', cursor:'pointer', fontSize:'0.85rem', padding:'0 3px', opacity:0.4, lineHeight:1 }}>×</button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <SubLabel>Assigner à Valentin</SubLabel>
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 12px' }}>
              <input value={mtForm.label} onChange={e=>onMtFormChange({...mtForm,label:e.target.value})} onKeyDown={e=>e.key==='Enter'&&onAssignTask()}
                placeholder="Description…"
                style={{ width:'100%', fontSize:'0.78rem', border:'none', outline:'none', color:'var(--text)', marginBottom:8, background:'transparent' }} />
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                <select value={mtForm.priority} onChange={e=>onMtFormChange({...mtForm,priority:e.target.value as 'high'|'medium'|'low'})}
                  style={{ fontSize:'0.68rem', fontWeight:600, border:'1px solid var(--border)', borderRadius:6, padding:'4px 7px', color:'var(--text-2)', background:'var(--surface)', cursor:'pointer' }}>
                  <option value="high">Urgent</option>
                  <option value="medium">Normal</option>
                  <option value="low">Faible</option>
                </select>
                <input type="date" value={mtForm.dueDate} onChange={e=>onMtFormChange({...mtForm,dueDate:e.target.value})}
                  style={{ fontSize:'0.68rem', border:'1px solid var(--border)', borderRadius:6, padding:'4px 7px', color:'var(--text-2)', background:'var(--surface)', flex:1 }} />
                <button onClick={onAssignTask} disabled={!mtForm.label.trim()}
                  style={{ fontSize:'0.7rem', fontWeight:600, background:mtForm.label.trim()?'#6366F1':'var(--border)', border:'none', borderRadius:6, padding:'5px 11px', color:mtForm.label.trim()?'white':'var(--text-3)', cursor:mtForm.label.trim()?'pointer':'not-allowed', transition:'all 0.15s' }}>
                  Assigner
                </button>
              </div>
            </div>

            {project.tasks.length > 0 && (
              <div style={{ marginTop:14 }}>
                <SubLabel>Tâches ({doneTasks}/{project.tasks.length})</SubLabel>
                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                  {project.tasks.map(t => (
                    <div key={t.id} style={{ display:'flex', gap:8, alignItems:'flex-start', padding:'3px 0' }}>
                      <div style={{ width:15, height:15, borderRadius:4, flexShrink:0, marginTop:2, background:t.done?'#059669':'transparent', border:`1.5px solid ${t.done?'#059669':'var(--border-2)'}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {t.done && <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                      <span style={{ fontSize:'0.76rem', color:t.done?'var(--text-3)':'var(--text-2)', textDecoration:t.done?'line-through':'none', lineHeight:1.45, fontWeight:t.done?400:500 }}>{t.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: discussion */}
          <div style={{ display:'flex', flexDirection:'column' }}>
            <SubLabel>Discussion</SubLabel>
            <div style={{ flex:1, maxHeight:260, overflowY:'auto', display:'flex', flexDirection:'column', gap:8, marginBottom:10 }}>
              {comments.length === 0
                ? <p style={{ textAlign:'center', paddingTop:20, fontSize:'0.76rem', color:'var(--text-3)', lineHeight:1.6 }}>Pas encore d&apos;échanges<br/>sur ce projet.</p>
                : comments.map(c => <ChatBubble key={c.id} comment={c} />)}
            </div>
            <div style={{ display:'flex', gap:6, marginBottom:6 }}>
              {(['manager','valentin'] as const).map(a => (
                <button key={a} onClick={()=>setCommentAuthor(a)}
                  style={{ flex:1, fontSize:'0.71rem', fontWeight:600, padding:'6px', borderRadius:8, cursor:'pointer', background:commentAuthor===a?(a==='manager'?'#6366F1':'#059669'):'var(--surface)', border:`1px solid ${commentAuthor===a?(a==='manager'?'#4338CA':'#047857'):'var(--border)'}`, color:commentAuthor===a?'white':'var(--text-3)', transition:'all 0.15s' }}>
                  {a==='manager'?'Manager':'Valentin'}
                </button>
              ))}
            </div>
            <div style={{ display:'flex', gap:6 }}>
              <input value={commentText} onChange={e=>setCommentText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&onSendComment()}
                placeholder="Message…"
                style={{ flex:1, fontSize:'0.77rem', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 10px', color:'var(--text)', outline:'none' }} />
              <button onClick={onSendComment} disabled={sending||!commentText.trim()}
                style={{ fontSize:'0.77rem', fontWeight:600, background:(commentText.trim()&&!sending)?'#6366F1':'var(--border)', border:'none', borderRadius:8, padding:'8px 14px', color:(commentText.trim()&&!sending)?'white':'var(--text-3)', cursor:(commentText.trim()&&!sending)?'pointer':'not-allowed', transition:'all 0.15s' }}>
                {sending?'…':'→'}
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
    <div style={{ display:'flex', flexDirection:'column', alignItems:isM?'flex-start':'flex-end' }}>
      <div style={{ maxWidth:'84%', background:isM?'var(--surface)':'#EEF2FF', border:`1px solid ${isM?'var(--border)':'#C7D2FE'}`, borderRadius:isM?'4px 10px 10px 10px':'10px 4px 10px 10px', padding:'7px 11px', fontSize:'0.77rem', lineHeight:1.5, color:'var(--text)', boxShadow:'var(--shadow-xs)' }}>
        {comment.text}
      </div>
      <p style={{ fontSize:'0.61rem', color:'var(--text-3)', marginTop:2, fontWeight:500 }}>
        {isM?'Manager':'Valentin'} · {relativeTime(comment.createdAt)}
      </p>
    </div>
  );
}

/* ─── Tag ───────────────────────────────────────────────── */
function Tag({ children, color, bg, border }: { children: React.ReactNode; color: string; bg: string; border: string }) {
  return (
    <span style={{ fontSize:'0.62rem', fontWeight:600, color, background:bg, border:`1px solid ${border}`, borderRadius:99, padding:'1px 7px' }}>
      {children}
    </span>
  );
}
