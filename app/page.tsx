'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { DashboardData, Comment, Project, Status, ManagerTask } from '@/types';

/* ─── Status config ─────────────────────────────────────── */
const STATUS: Record<Status, { label: string; color: string; bg: string; border: string }> = {
  'en-cours':   { label: 'En cours',   color: '#4F46E5', bg: '#EEEDFD', border: '#C4C2F7' },
  'a-deployer': { label: 'À déployer', color: '#B45309', bg: '#FEF3E2', border: '#F6C27A' },
  'ok':         { label: 'Terminé',    color: '#15803D', bg: '#ECFDF5', border: '#86EFAC' },
  'bloque':     { label: 'Bloqué',     color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5' },
  'a-cadrer':   { label: 'À cadrer',   color: '#78716C', bg: '#F5F0EA', border: '#D6CFC7' },
};

const PRIORITY_COLOR = { high: '#DC2626', medium: '#B45309', low: '#15803D' } as const;
const PRIORITY_LABEL = { high: 'Urgent', medium: 'Normal', low: 'Faible' } as const;


/* ─── Helpers ───────────────────────────────────────────── */
function getWeek(d: Date) {
  const s = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - s.getTime()) / 86400000 + s.getDay() + 1) / 7);
}
function daysUntil(iso?: string) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000);
}
function fmtTimer(s: number) {
  return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
}
function relTime(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'à l\'instant';
  if (m < 60) return `${m}min`;
  const h = Math.floor(m/60);
  if (h < 24) return `${h}h`;
  return new Date(iso).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'});
}
function pgColor(p: number) {
  return p >= 70 ? '#15803D' : p >= 40 ? '#B45309' : '#DC2626';
}

/* ─── Design primitives ─────────────────────────────────── */
const card: React.CSSProperties = {
  background: 'linear-gradient(160deg, #ffffff, #fff6df)',
  border: '2px solid var(--border-2)',
  borderRadius: 22,
  boxShadow: 'var(--shadow-md)',
  backdropFilter: 'blur(12px)',
};

/* ─── Page ──────────────────────────────────────────────── */
export default function Page() {
  const [checking, setChecking]           = useState(true);
  const [isManager, setIsManager]         = useState(false);
  const [loginPwd, setLoginPwd]           = useState('');
  const [loginErr, setLoginErr]           = useState('');
  const [data, setData]                   = useState<DashboardData|null>(null);
  const [comments, setComments]           = useState<Comment[]>([]);
  const [managerTasks, setManagerTasks]   = useState<ManagerTask[]>([]);
  const [openId, setOpenId]               = useState<string|null>(null);
  const [cText, setCText]                 = useState('');
  const [cAuthor, setCAuthor]             = useState<'manager'|'valentin'>('manager');
  const [sending, setSending]             = useState(false);
  const [meeting, setMeeting]             = useState(false);
  const [meetIdx, setMeetIdx]             = useState(0);
  const [meetTimer, setMeetTimer]         = useState(0);
  const timerRef                          = useRef<ReturnType<typeof setInterval>|null>(null);
  const [mtForm, setMtForm]               = useState<Record<string,{label:string;priority:'high'|'medium'|'low';dueDate:string}>>({});

  const load = useCallback(async () => {
    const [d,c,mt] = await Promise.all([
      fetch('/api/projects').then(r=>r.json()),
      fetch('/api/comments').then(r=>r.json()),
      fetch('/api/manager-tasks').then(r=>r.ok?r.json():[]),
    ]);
    setData(d); setComments(c); setManagerTasks(mt);
  }, []);

  useEffect(() => {
    fetch('/api/auth/manager').then(r=>r.json()).then(({authenticated})=>{
      setIsManager(authenticated); setChecking(false);
      if (authenticated) load();
    });
  }, [load]);

  useEffect(() => {
    if (!meeting) { if (timerRef.current) clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => setMeetTimer(t=>t+1), 1000);
    const onKey = (e: KeyboardEvent) => {
      if (e.key==='Escape') setMeeting(false);
      if (e.key==='ArrowRight') setMeetIdx(i=>Math.min(i+1,(data?.projects.length??1)-1));
      if (e.key==='ArrowLeft')  setMeetIdx(i=>Math.max(i-1,0));
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); if (timerRef.current) clearInterval(timerRef.current); };
  }, [meeting, data]);

  const login = async () => {
    setLoginErr('');
    const r = await fetch('/api/auth/manager',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:loginPwd})});
    if (r.ok) { setIsManager(true); load(); } else setLoginErr('Mot de passe incorrect');
  };
  const logout = async () => { await fetch('/api/auth/manager',{method:'DELETE'}); setIsManager(false); setData(null); };
  const sendComment = async () => {
    if (!cText.trim()||!openId) return; setSending(true);
    await fetch('/api/comments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:cText.trim(),projectId:openId,author:cAuthor})});
    setCText(''); await load(); setSending(false);
  };
  const assignTask = async (projectId: string, projectName: string) => {
    const f = mtForm[projectId]; if (!f?.label.trim()) return;
    await fetch('/api/manager-tasks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({projectId,projectName,label:f.label.trim(),priority:f.priority||'medium',dueDate:f.dueDate||undefined})});
    setMtForm(prev=>({...prev,[projectId]:{label:'',priority:'medium',dueDate:''}})); await load();
  };
  const toggleMT = async (id: string, done: boolean) => {
    await fetch('/api/manager-tasks',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,done})});
    setManagerTasks(prev=>prev.map(t=>t.id===id?{...t,done}:t));
  };
  const deleteMT = async (id: string) => {
    await fetch('/api/manager-tasks',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});
    setManagerTasks(prev=>prev.filter(t=>t.id!==id));
  };

  /* ── Loading ── */
  if (checking) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)'}}>
      <p style={{color:'var(--text-3)',fontSize:'0.8rem',fontFamily:'var(--font-mono)'}}>chargement…</p>
    </div>
  );

  /* ── Login ── */
  if (!isManager) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--header)'}}>
      {/* Warm grain on login bg */}
      <div style={{position:'fixed',inset:0,backgroundImage:'radial-gradient(ellipse at 30% 20%, rgba(194,112,10,0.08) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(79,70,229,0.06) 0%, transparent 60%)'}} />
      <div style={{...card,position:'relative',padding:'48px 44px',width:400,textAlign:'center',background:'linear-gradient(165deg,#fffdf7,#fff1cf)',border:'1px solid #FFCD81',boxShadow:'var(--shadow-lg)'}}>
        <div style={{width:48,height:48,background:'var(--accent-light)',border:'1px solid var(--accent-border)',borderRadius:18,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 24px'}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <p style={{fontWeight:700,fontSize:'1.35rem',color:'#3A2A15',letterSpacing:'-0.02em',marginBottom:6}}>Espace Manager</p>
        <p style={{fontFamily:'var(--font-mono)',fontSize:'0.6rem',color:'#B8893F',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:32}}>WorkDash · MISMO</p>
        <input type="password" value={loginPwd} onChange={e=>setLoginPwd(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()}
          placeholder="Mot de passe"
          style={{width:'100%',fontSize:'0.88rem',background:'rgba(255, 172, 70, 0.28)',border:`1px solid ${loginErr?'#DC2626':'rgba(255,255,255,0.20)'}`,borderRadius:8,padding:'11px 14px',color:'#3A2A15',outline:'none',marginBottom:10,caretColor:'var(--accent)'}} />
        {loginErr && <p style={{color:'#F87171',fontSize:'0.78rem',marginBottom:12,fontWeight:500}}>{loginErr}</p>}
        <button onClick={login}
          style={{width:'100%',fontWeight:600,fontSize:'0.88rem',background:'var(--accent)',border:'none',borderRadius:8,padding:'12px',color:'white',cursor:'pointer',letterSpacing:'0.01em'}}
          onMouseOver={e=>(e.currentTarget.style.background='var(--accent-dark)')} onMouseOut={e=>(e.currentTarget.style.background='var(--accent)')}>
          Accéder au dashboard
        </button>
        <p style={{marginTop:28,fontFamily:'var(--font-mono)',fontSize:'0.58rem',color:'#FFCD81'}}>Accès restreint · MISMO</p>
      </div>
    </div>
  );

  if (!data) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)'}}>
      <p style={{color:'var(--text-3)',fontSize:'0.8rem',fontFamily:'var(--font-mono)'}}>chargement des données…</p>
    </div>
  );

  /* ── Computed ── */
  const now       = new Date();
  const sorted    = [...data.projects].sort((a,b)=>a.priority-b.priority);
  const doneTodos = data.weeklyTodos.filter(t=>t.done).length;

  /* ── Meeting mode ── */
  if (meeting) {
    const mp = sorted[meetIdx];
    if (!mp) { setMeeting(false); return null; }
    const ms = STATUS[mp.status];
    return (
      <div style={{position:'fixed',inset:0,background:'#FFF8E8',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',zIndex:9999,padding:48}}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:'var(--accent)'}} />
        <div style={{position:'absolute',top:24,left:40,right:40,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontFamily:'var(--font-mono)',fontSize:'0.85rem',color:'#A06A22',letterSpacing:'0.06em'}}>{fmtTimer(meetTimer)}</span>
          <span style={{fontSize:'0.72rem',color:'#A06A22',fontWeight:500}}>Réunion · {meetIdx+1}/{sorted.length}</span>
          <button onClick={()=>setMeeting(false)} style={{fontSize:'0.72rem',fontWeight:600,background:'rgba(255, 172, 70, 0.35)',border:'1px solid rgba(255, 172, 70, 0.35)',borderRadius:6,padding:'5px 12px',color:'#B8893F',cursor:'pointer'}}>Quitter (ESC)</button>
        </div>
        <div style={{background:'#FFF6E6',border:'1px solid #FFCD81',borderRadius:16,padding:'44px 52px',maxWidth:760,width:'100%',boxShadow:'var(--shadow-lg)'}}>
          <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:32}}>
            <div style={{width:10,height:10,borderRadius:'50%',background:ms.color,flexShrink:0}} />
            <h2 style={{fontSize:'1.9rem',fontWeight:800,color:'#3A2A15',letterSpacing:'-0.025em',flex:1}}>{mp.name}</h2>
            <span style={{fontSize:'0.7rem',fontWeight:600,padding:'4px 12px',borderRadius:99,background:ms.bg,color:ms.color,border:`1px solid ${ms.border}`}}>{ms.label}</span>
          </div>
          <div style={{marginBottom:36}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:12}}>
              <span style={{fontFamily:'var(--font-mono)',fontSize:'0.62rem',color:'#A06A22',textTransform:'uppercase',letterSpacing:'0.1em'}}>Avancement</span>
              <span style={{fontSize:'3rem',fontWeight:800,color:pgColor(mp.progress),letterSpacing:'-0.04em',fontVariantNumeric:'tabular-nums'}}>{mp.progress}<span style={{fontSize:'1.2rem'}}>%</span></span>
            </div>
            <div style={{height:6,background:'#FFDCA7',borderRadius:99,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${mp.progress}%`,borderRadius:99,background:pgColor(mp.progress),transition:'width 0.6s cubic-bezier(0.16,1,0.3,1)'}} />
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            <div style={{background:'rgba(255, 194, 112, 0.18)',borderRadius:16,padding:'16px 18px',border:'1px solid rgba(255, 172, 70, 0.28)'}}>
              <p style={{fontFamily:'var(--font-mono)',fontSize:'0.58rem',color:'#A06A22',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:8}}>En ce moment</p>
              <p style={{fontSize:'0.88rem',color:'var(--text-2)',lineHeight:1.6}}>{mp.currentAction}</p>
            </div>
            <div style={{background:`${ms.color}12`,borderRadius:16,padding:'16px 18px',border:`1px solid ${ms.color}30`}}>
              <p style={{fontFamily:'var(--font-mono)',fontSize:'0.58rem',color:ms.color,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:8,opacity:0.8}}>Prochaine étape</p>
              <p style={{fontSize:'0.88rem',color:'#3A2A15',lineHeight:1.6,fontWeight:500}}>→ {mp.nextStep}</p>
            </div>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:24,marginTop:40}}>
          <button onClick={()=>setMeetIdx(i=>Math.max(i-1,0))} disabled={meetIdx===0}
            style={{fontSize:'0.78rem',fontWeight:600,background:meetIdx===0?'transparent':'rgba(255, 172, 70, 0.28)',border:'1px solid rgba(255, 172, 70, 0.35)',borderRadius:8,padding:'9px 22px',color:meetIdx===0?'#FFDCA7':'#8A7060',cursor:meetIdx===0?'not-allowed':'pointer'}}>
            ← Précédent
          </button>
          <div style={{display:'flex',gap:5}}>
            {sorted.map((_,i)=>(
              <div key={i} onClick={()=>setMeetIdx(i)} style={{width:i===meetIdx?20:5,height:5,borderRadius:99,background:i===meetIdx?'var(--accent)':'rgba(255,255,255,0.1)',cursor:'pointer',transition:'all 0.2s'}} />
            ))}
          </div>
          <button onClick={()=>setMeetIdx(i=>Math.min(i+1,sorted.length-1))} disabled={meetIdx===sorted.length-1}
            style={{fontSize:'0.78rem',fontWeight:600,background:meetIdx===sorted.length-1?'transparent':'rgba(255, 172, 70, 0.28)',border:'1px solid rgba(255, 172, 70, 0.35)',borderRadius:8,padding:'9px 22px',color:meetIdx===sorted.length-1?'#FFDCA7':'#8A7060',cursor:meetIdx===sorted.length-1?'not-allowed':'pointer'}}>
            Suivant →
          </button>
        </div>
        <p style={{marginTop:14,fontFamily:'var(--font-mono)',fontSize:'0.56rem',color:'#FFDCA7'}}>← → naviguer · ESC quitter</p>
      </div>
    );
  }

  /* ── Dashboard ── */
  return (
    <div style={{minHeight:'100vh',background:'var(--bg)'}} id="print-root">
      <div style={{position:'fixed',inset:0,pointerEvents:'none',background:'radial-gradient(circle at 30% 20%, rgba(255,122,89,0.12), transparent 40%), radial-gradient(circle at 70% 70%, rgba(98,198,255,0.12), transparent 45%)'}} />

      {/* HEADER */}
      <header className="no-print" style={{background:'var(--header)',backdropFilter:'blur(10px)',borderBottom:'1px solid var(--header-border)',position:'sticky',top:0,zIndex:50,boxShadow:'var(--shadow-sm)'}}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:'var(--accent)'}} />
        <div style={{maxWidth:1440,margin:'0 auto',padding:'0 32px',display:'flex',alignItems:'center',justifyContent:'space-between',height:60}}>
          {/* Logo */}
          <div style={{display:'flex',alignItems:'center',gap:16}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:7,height:28,background:'var(--accent)',borderRadius:2,flexShrink:0}} />
              <div>
                <p style={{fontWeight:800,fontSize:'0.95rem',color:'#3A2A15',letterSpacing:'-0.02em',lineHeight:1.15}}>WorkDash</p>
                <p style={{fontFamily:'var(--font-mono)',fontSize:'0.55rem',color:'#A06A22',letterSpacing:'0.08em'}}>MISMO · MGR</p>
              </div>
            </div>
          </div>

          {/* Center — week */}
          <div style={{display:'flex',alignItems:'center',gap:20}}>
            <span style={{fontFamily:'var(--font-mono)',fontSize:'0.65rem',color:'#A06A22',letterSpacing:'0.06em'}}>
              S{getWeek(now)} · {now.toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'})}
            </span>
            <span style={{width:1,height:16,background:'#FFDCA7'}} />
            <span style={{fontFamily:'var(--font-mono)',fontSize:'0.65rem',color:'#B8893F',letterSpacing:'0.04em'}}>Valentin Bertho</span>
          </div>

          {/* Actions */}
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <HdrBtn onClick={()=>{setMeetIdx(0);setMeetTimer(0);setMeeting(true);}}>Réunion</HdrBtn>
            <HdrBtn onClick={()=>window.print()}>PDF</HdrBtn>
            <HdrLink href="/admin">Admin</HdrLink>
            <button onClick={logout} title="Déconnexion"
              style={{width:30,height:30,display:'flex',alignItems:'center',justifyContent:'center',background:'none',border:'1px solid rgba(255, 172, 70, 0.28)',borderRadius:6,cursor:'pointer',color:'#A06A22'}}
              onMouseOver={e=>(e.currentTarget.style.borderColor='rgba(255,255,255,0.15)')} onMouseOut={e=>(e.currentTarget.style.borderColor='rgba(255, 172, 70, 0.28)')}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        </div>
      </header>

      <main style={{maxWidth:1440,margin:'0 auto',padding:'32px 32px 64px'}}>

        <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:20,alignItems:'start'}}>
          <div style={{...card,padding:'18px'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
              <h2 style={{fontSize:'1.05rem',fontWeight:800,color:'var(--text)'}}>Projets en cours</h2>
              <span className="mono" style={{fontSize:'0.66rem',color:'var(--text-3)'}}>{sorted.length} projets</span>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {sorted.map((p,i)=>(
                <ProjectCard key={p.id} project={p} delay={i*0.03}
                  comments={comments.filter(c=>c.projectId===p.id)}
                  managerTasks={managerTasks.filter(t=>t.projectId===p.id)}
                  isOpen={openId===p.id} onToggle={()=>setOpenId(o=>o===p.id?null:p.id)}
                  cText={cText} setCText={setCText}
                  cAuthor={cAuthor} setCAuthor={setCAuthor}
                  onSend={sendComment} sending={sending}
                  mtForm={mtForm[p.id]??{label:'',priority:'medium',dueDate:''}}
                  onMtForm={f=>setMtForm(prev=>({...prev,[p.id]:f}))}
                  onAssign={()=>assignTask(p.id,p.name)}
                  onToggleMT={toggleMT} onDeleteMT={deleteMT} />
              ))}
            </div>
          </div>

          <div style={{...card,padding:'18px'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
              <h2 style={{fontSize:'1.02rem',fontWeight:800,color:'var(--text)'}}>Tâches de la semaine</h2>
              <span className="mono" style={{fontSize:'0.66rem',color:doneTodos===data.weeklyTodos.length?'#15803D':'var(--text-3)'}}>{doneTodos}/{data.weeklyTodos.length}</span>
            </div>
            <div style={{height:6,background:'var(--surface-2)',borderRadius:99,overflow:'hidden',marginBottom:12}}>
              <div style={{height:'100%',width:`${(doneTodos/Math.max(data.weeklyTodos.length,1))*100}%`,background:'var(--accent)',transition:'width .3s'}}/>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {data.weeklyTodos.map(t=>(
                <div key={t.id} style={{display:'flex',gap:10,alignItems:'flex-start',padding:'6px 0',borderBottom:'1px dashed var(--border)'}}>
                  <div style={{width:16,height:16,borderRadius:4,marginTop:2,background:t.done?'#22C55E':'transparent',border:`2px solid ${t.done?'#22C55E':'var(--border-2)'}`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {t.done&&<svg width="8" height="8" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span style={{fontSize:'0.78rem',lineHeight:1.4,color:t.done?'var(--text-3)':'var(--text-2)',textDecoration:t.done?'line-through':'none'}}>{t.label}</span>
                </div>
              ))}
            </div>

            <p className="mono" style={{textAlign:'center',fontSize:'0.57rem',color:'var(--text-3)',marginTop:10}}>
              màj {new Date(data.updatedAt).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ─── Header buttons ────────────────────────────────────── */
function HdrBtn({onClick,children}:{onClick:()=>void;children:React.ReactNode}) {
  return (
    <button onClick={onClick} style={{fontSize:'0.72rem',fontWeight:500,background:'none',border:'1px solid rgba(255, 172, 70, 0.35)',borderRadius:6,padding:'6px 12px',color:'#B8893F',cursor:'pointer',transition:'border-color 0.15s,color 0.15s'}}
      onMouseOver={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.18)';e.currentTarget.style.color='var(--text-2)';}}
      onMouseOut={e=>{e.currentTarget.style.borderColor='rgba(255, 172, 70, 0.35)';e.currentTarget.style.color='#B8893F';}}>
      {children}
    </button>
  );
}
function HdrLink({href,children}:{href:string;children:React.ReactNode}) {
  return <a href={href} style={{fontSize:'0.72rem',fontWeight:500,border:'1px solid rgba(255, 172, 70, 0.35)',borderRadius:6,padding:'6px 12px',color:'#B8893F',textDecoration:'none',display:'inline-block'}}>
    {children}
  </a>;
}

/* ─── Project card ──────────────────────────────────────── */
function ProjectCard({project,delay,comments,managerTasks,isOpen,onToggle,cText,setCText,cAuthor,setCAuthor,onSend,sending,mtForm,onMtForm,onAssign,onToggleMT,onDeleteMT}:{
  project:Project;delay:number;comments:Comment[];managerTasks:ManagerTask[];
  isOpen:boolean;onToggle:()=>void;
  cText:string;setCText:(v:string)=>void;cAuthor:'manager'|'valentin';setCAuthor:(v:'manager'|'valentin')=>void;
  onSend:()=>void;sending:boolean;
  mtForm:{label:string;priority:'high'|'medium'|'low';dueDate:string};
  onMtForm:(f:{label:string;priority:'high'|'medium'|'low';dueDate:string})=>void;
  onAssign:()=>void;onToggleMT:(id:string,done:boolean)=>void;onDeleteMT:(id:string)=>void;
}) {
  const st = STATUS[project.status];
  const done = project.tasks.filter(t=>t.done).length;
  const days = daysUntil(project.dueDate);
  const late = days!==null&&days<0;
  const soon = days!==null&&days>=0&&days<=3;
  const col  = pgColor(project.progress);
  const pgGrad = project.progress>=70?'linear-gradient(90deg,#15803D,#4ADE80)':project.progress>=40?'linear-gradient(90deg,#B45309,#FCD34D)':'linear-gradient(90deg,#DC2626,#F87171)';
  const pending = managerTasks.filter(t=>!t.done).length;

  return (
    <div className="slide-up" style={{animationDelay:`${delay}s`,background:'var(--surface)',border:`1px solid ${isOpen?st.color+'40':'var(--border)'}`,borderRadius:16,overflow:'hidden',boxShadow:isOpen?`var(--shadow-sm),0 0 0 3px ${st.color}10`:'var(--shadow-xs)',transition:'border-color 0.2s,box-shadow 0.2s'}}>
      {/* Status bar */}
      <div style={{height:3,background:st.color,opacity:0.8,transition:'opacity 0.2s'}} />

      {/* Row */}
      <div onClick={onToggle} style={{display:'grid',gridTemplateColumns:'1fr 88px',gap:16,padding:'13px 16px',cursor:'pointer',alignItems:'center'}}>
        <div style={{minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:4,flexWrap:'wrap'}}>
            <span style={{fontWeight:700,fontSize:'0.88rem',color:'var(--text)',letterSpacing:'-0.01em'}}>{project.name}</span>
            {pending>0&&<Pill color="#B45309" bg="#FEF3E2" border="#F6C27A">{pending} demande{pending>1?'s':''}</Pill>}
            {comments.length>0&&<Pill color="#4F46E5" bg="#EEEDFD" border="#C4C2F7">{comments.length}</Pill>}
            {late&&<Pill color="#DC2626" bg="#FEF2F2" border="#FCA5A5">−{Math.abs(days!)}j</Pill>}
            {soon&&!late&&<Pill color="#B45309" bg="#FEF3E2" border="#F6C27A">J−{days}</Pill>}
          </div>
          <p style={{fontSize:'0.76rem',color:'var(--text-3)',lineHeight:1.4,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',fontStyle:'italic'}}>{project.currentAction}</p>
        </div>
        <div style={{textAlign:'right'}}>
          <p style={{fontSize:'1.75rem',fontWeight:800,color:col,letterSpacing:'-0.04em',lineHeight:1,marginBottom:6,fontVariantNumeric:'tabular-nums'}}>{project.progress}<span style={{fontSize:'0.7rem',fontWeight:600}}>%</span></p>
          <div style={{height:3,background:'var(--surface-2)',borderRadius:99,overflow:'hidden'}}>
            <div style={{height:'100%',width:`${project.progress}%`,borderRadius:99,background:pgGrad,transition:'width 0.4s'}} />
          </div>
          <p className="mono" style={{fontSize:'0.56rem',color:'var(--text-3)',marginTop:4}}>{done}/{project.tasks.length}</p>
        </div>
      </div>

      {/* Expanded */}
      {isOpen&&(
        <div onClick={e=>e.stopPropagation()} style={{borderTop:'1px solid var(--border)',padding:'16px',background:'var(--surface-2)',display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>

          {/* Left */}
          <div>
            <FieldLabel>Prochaine étape</FieldLabel>
            <div style={{fontSize:'0.79rem',lineHeight:1.55,color:'var(--text-2)',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,padding:'10px 12px',marginBottom:14,fontStyle:'italic'}}>
              → {project.nextStep}
            </div>

            {managerTasks.length>0&&(
              <>
                <FieldLabel>Demandes ({managerTasks.filter(t=>t.done).length}/{managerTasks.length})</FieldLabel>
                <div style={{display:'flex',flexDirection:'column',gap:4,marginBottom:14}}>
                  {managerTasks.map(t=>{
                    const td=daysUntil(t.dueDate);
                    return (
                      <div key={t.id} style={{display:'flex',gap:8,background:'var(--surface)',border:`1px solid ${t.done?'var(--border)':'var(--border-2)'}`,borderRadius:8,padding:'7px 10px',alignItems:'flex-start'}}>
                        <input type="checkbox" checked={t.done} onChange={()=>onToggleMT(t.id,!t.done)} style={{accentColor:'var(--accent)',width:14,height:14,marginTop:2,flexShrink:0,cursor:'pointer'}} />
                        <div style={{flex:1,minWidth:0}}>
                          <p style={{fontSize:'0.75rem',fontWeight:t.done?400:500,textDecoration:t.done?'line-through':'none',color:t.done?'var(--text-3)':'var(--text)',lineHeight:1.35}}>{t.label}</p>
                          <div style={{display:'flex',gap:6,marginTop:3}}>
                            <span style={{fontSize:'0.6rem',fontWeight:600,color:PRIORITY_COLOR[t.priority]}}>{PRIORITY_LABEL[t.priority]}</span>
                            {t.dueDate&&<span className="mono" style={{fontSize:'0.6rem',color:td!==null&&td<0?'#DC2626':'var(--text-3)'}}>{td!==null&&td<0?`−${Math.abs(td)}j`:new Date(t.dueDate).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'})}</span>}
                          </div>
                        </div>
                        <button onClick={()=>onDeleteMT(t.id)} style={{background:'none',border:'none',color:'var(--text-3)',cursor:'pointer',fontSize:'0.85rem',padding:'0 3px',opacity:0.35,lineHeight:1}}>×</button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <FieldLabel>Assigner à Valentin</FieldLabel>
            <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,padding:'10px 12px',marginBottom:14}}>
              <input value={mtForm.label} onChange={e=>onMtForm({...mtForm,label:e.target.value})} onKeyDown={e=>e.key==='Enter'&&onAssign()} placeholder="Description…"
                style={{width:'100%',fontSize:'0.77rem',border:'none',outline:'none',color:'var(--text)',background:'var(--bg)',marginBottom:8,caretColor:'var(--accent)'}} />
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                <select value={mtForm.priority} onChange={e=>onMtForm({...mtForm,priority:e.target.value as 'high'|'medium'|'low'})}
                  style={{fontSize:'0.67rem',fontWeight:600,border:'1px solid var(--border)',borderRadius:5,padding:'4px 6px',color:'var(--text-2)',background:'var(--surface)',cursor:'pointer'}}>
                  <option value="high">Urgent</option><option value="medium">Normal</option><option value="low">Faible</option>
                </select>
                <input type="date" value={mtForm.dueDate} onChange={e=>onMtForm({...mtForm,dueDate:e.target.value})}
                  style={{fontSize:'0.67rem',border:'1px solid var(--border)',borderRadius:5,padding:'4px 6px',color:'var(--text-2)',background:'var(--surface)',flex:1}} />
                <button onClick={onAssign} disabled={!mtForm.label.trim()}
                  style={{fontSize:'0.69rem',fontWeight:600,background:mtForm.label.trim()?'var(--accent)':'var(--border)',border:'none',borderRadius:6,padding:'5px 11px',color:mtForm.label.trim()?'white':'var(--text-3)',cursor:mtForm.label.trim()?'pointer':'not-allowed',transition:'all 0.15s'}}>
                  Assigner
                </button>
              </div>
            </div>

            {project.tasks.length>0&&(
              <>
                <FieldLabel>Tâches Valentin ({done}/{project.tasks.length})</FieldLabel>
                <div style={{display:'flex',flexDirection:'column',gap:3}}>
                  {project.tasks.map(t=>(
                    <div key={t.id} style={{display:'flex',gap:8,alignItems:'flex-start',padding:'3px 0'}}>
                      <div style={{width:14,height:14,borderRadius:3,flexShrink:0,marginTop:2,background:t.done?'#15803D':'transparent',border:`1.5px solid ${t.done?'#15803D':'var(--border-2)'}`,display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.15s'}}>
                        {t.done&&<svg width="8" height="8" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                      <span style={{fontSize:'0.75rem',color:t.done?'var(--text-3)':'var(--text-2)',textDecoration:t.done?'line-through':'none',lineHeight:1.45,fontWeight:t.done?400:500}}>{t.label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Right — discussion */}
          <div style={{display:'flex',flexDirection:'column'}}>
            <FieldLabel>Discussion</FieldLabel>
            <div style={{flex:1,maxHeight:260,overflowY:'auto',display:'flex',flexDirection:'column',gap:8,marginBottom:10}}>
              {comments.length===0
                ? <p style={{textAlign:'center',paddingTop:20,fontSize:'0.75rem',color:'var(--text-3)',lineHeight:1.7,fontStyle:'italic'}}>Pas encore d&apos;échanges<br/>sur ce projet.</p>
                : comments.map(c=><Bubble key={c.id} comment={c} />)
              }
            </div>
            <div style={{display:'flex',gap:5,marginBottom:6}}>
              {(['manager','valentin'] as const).map(a=>(
                <button key={a} onClick={()=>setCAuthor(a)} style={{flex:1,fontSize:'0.7rem',fontWeight:600,padding:'6px',borderRadius:7,cursor:'pointer',background:cAuthor===a?(a==='manager'?'#4F46E5':'#15803D'):'var(--surface)',border:`1px solid ${cAuthor===a?(a==='manager'?'#3730A3':'#166534'):'var(--border)'}`,color:cAuthor===a?'white':'var(--text-3)',transition:'all 0.15s'}}>
                  {a==='manager'?'Manager':'Valentin'}
                </button>
              ))}
            </div>
            <div style={{display:'flex',gap:6}}>
              <input value={cText} onChange={e=>setCText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&onSend()} placeholder="Message…"
                style={{flex:1,fontSize:'0.77rem',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:7,padding:'8px 10px',color:'var(--text)',outline:'none',caretColor:'var(--accent)'}} />
              <button onClick={onSend} disabled={sending||!cText.trim()}
                style={{fontSize:'0.77rem',fontWeight:600,background:(cText.trim()&&!sending)?'var(--accent)':'var(--border)',border:'none',borderRadius:7,padding:'8px 14px',color:(cText.trim()&&!sending)?'white':'var(--text-3)',cursor:(cText.trim()&&!sending)?'pointer':'not-allowed',transition:'all 0.15s'}}>
                {sending?'…':'→'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Small components ──────────────────────────────────── */
function Bubble({comment}:{comment:Comment}) {
  const isM = comment.author==='manager';
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:isM?'flex-start':'flex-end'}}>
      <div style={{maxWidth:'85%',background:isM?'var(--surface)':'#EEEDFD',border:`1px solid ${isM?'var(--border)':'#C4C2F7'}`,borderRadius:isM?'3px 9px 9px 9px':'9px 3px 9px 9px',padding:'7px 11px',fontSize:'0.76rem',lineHeight:1.5,color:'var(--text)',boxShadow:'var(--shadow-xs)'}}>
        {comment.text}
      </div>
      <p className="mono" style={{fontSize:'0.58rem',color:'var(--text-3)',marginTop:2}}>{isM?'Manager':'Valentin'} · {relTime(comment.createdAt)}</p>
    </div>
  );
}

function Pill({children,color,bg,border}:{children:React.ReactNode;color:string;bg:string;border:string}) {
  return <span style={{fontSize:'0.6rem',fontWeight:600,color,background:bg,border:`1px solid ${border}`,borderRadius:99,padding:'1px 7px'}}>{children}</span>;
}

function FieldLabel({children}:{children:React.ReactNode}) {
  return <p className="caps" style={{fontSize:'0.59rem',fontWeight:700,color:'var(--text-3)',marginBottom:7}}>{children}</p>;
}

