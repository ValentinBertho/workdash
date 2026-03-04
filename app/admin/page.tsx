'use client';
import { useEffect, useState, useCallback } from 'react';
import { DashboardData, Project, Task, Comment, Status } from '@/types';

const STATUS_OPTIONS: Status[] = ['en-cours', 'a-deployer', 'ok', 'bloque', 'a-cadrer'];
const STATUS_META: Record<Status, { label: string; color: string; bg: string; border: string }> = {
  'en-cours':   { label: 'En cours',   color: '#4F46E5', bg: '#EEEDFD', border: '#C4C2F7' },
  'a-deployer': { label: 'À déployer', color: '#B45309', bg: '#FEF3E2', border: '#F6C27A' },
  'ok':         { label: 'Terminé',    color: '#15803D', bg: '#ECFDF5', border: '#86EFAC' },
  'bloque':     { label: 'Bloqué',     color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5' },
  'a-cadrer':   { label: 'À cadrer',   color: '#78716C', bg: '#F5F0EA', border: '#D6CFC7' },
};

const EMPTY: { name: string; status: Status; currentAction: string; nextStep: string; progress: number; dueDate: string | undefined } = {
  name: '', status: 'en-cours', currentAction: '', nextStep: '', progress: 0, dueDate: undefined,
};

export default function AdminPage() {
  const [authed, setAuthed]     = useState(false);
  const [password, setPassword] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [data, setData]         = useState<DashboardData|null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [unsaved, setUnsaved]   = useState(false);
  const [tab, setTab]           = useState<'projects'|'todos'|'comments'>('projects');
  const [expandedId, setExpandedId] = useState<string|null>(null);
  const [newTask, setNewTask]   = useState('');
  const [newTodo, setNewTodo]   = useState('');
  const [showAdd, setShowAdd]   = useState(false);
  const [form, setForm]         = useState({...EMPTY});

  const load = useCallback(async () => {
    const [d, c] = await Promise.all([
      fetch('/api/projects').then(r=>r.json()),
      fetch('/api/comments').then(r=>r.json()),
    ]);
    setData(d); setComments(c); setUnsaved(false);
  }, []);

  const login = async () => {
    setLoginErr('');
    const r = await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});
    if (r.ok) { setAuthed(true); load(); } else setLoginErr('Mot de passe incorrect');
  };
  const logout = async () => { await fetch('/api/auth',{method:'DELETE'}); setAuthed(false); setData(null); };

  const save = async () => {
    if (!data) return; setSaving(true);
    await fetch('/api/projects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    setSaving(false); setSaved(true); setUnsaved(false);
    setTimeout(()=>setSaved(false), 2500);
  };

  const upProject = (id: string, updates: Partial<Project>) => {
    if (!data) return;
    setData({...data, projects: data.projects.map(p=>p.id===id?{...p,...updates}:p)});
    setUnsaved(true);
  };

  const toggleTask = (pid: string, tid: string) => {
    if (!data) return;
    setData({...data, projects: data.projects.map(p=>p.id!==pid?p:{...p,tasks:p.tasks.map(t=>t.id===tid?{...t,done:!t.done}:t)})});
    setUnsaved(true);
  };

  const addTask = (pid: string) => {
    if (!newTask.trim()||!data) return;
    const task: Task = {id: crypto.randomUUID(), label: newTask.trim(), done: false};
    setData({...data, projects: data.projects.map(p=>p.id!==pid?p:{...p,tasks:[...p.tasks,task]})});
    setNewTask(''); setUnsaved(true);
  };

  const removeTask = (pid: string, tid: string) => {
    if (!data) return;
    setData({...data, projects: data.projects.map(p=>p.id!==pid?p:{...p,tasks:p.tasks.filter(t=>t.id!==tid)})});
    setUnsaved(true);
  };

  const moveProject = (id: string, dir: -1|1) => {
    if (!data) return;
    const s = [...data.projects].sort((a,b)=>a.priority-b.priority);
    const idx = s.findIndex(p=>p.id===id);
    if (idx+dir<0||idx+dir>=s.length) return;
    const [a,b] = [s[idx],s[idx+dir]];
    setData({...data, projects: data.projects.map(p=>p.id===a.id?{...p,priority:b.priority}:p.id===b.id?{...p,priority:a.priority}:p)});
    setUnsaved(true);
  };

  const deleteProject = (id: string) => {
    if (!data||!confirm('Supprimer ce projet ?')) return;
    setData({...data, projects: data.projects.filter(p=>p.id!==id)});
    setUnsaved(true);
  };

  const addProject = () => {
    if (!form.name.trim()||!data) return;
    const max = data.projects.length>0 ? Math.max(...data.projects.map(p=>p.priority)) : 0;
    const p: Project = {
      id: crypto.randomUUID(), name: form.name.trim(), priority: max+1, status: form.status,
      progress: form.progress, currentAction: form.currentAction.trim()||'Démarrage du projet',
      nextStep: form.nextStep.trim()||'À définir', tasks: [], dueDate: form.dueDate||undefined,
    };
    setData({...data, projects:[...data.projects,p]});
    setForm({...EMPTY}); setShowAdd(false); setUnsaved(true);
  };

  const toggleTodo = (id: string) => {
    if (!data) return;
    setData({...data, weeklyTodos: data.weeklyTodos.map(t=>t.id===id?{...t,done:!t.done}:t)});
    setUnsaved(true);
  };

  const addTodo = () => {
    if (!data||!newTodo.trim()) return;
    setData({...data, weeklyTodos:[...data.weeklyTodos,{id:crypto.randomUUID(),label:newTodo.trim(),done:false}]});
    setNewTodo(''); setUnsaved(true);
  };

  const removeTodo = (id: string) => {
    if (!data) return;
    setData({...data, weeklyTodos: data.weeklyTodos.filter(t=>t.id!==id)});
    setUnsaved(true);
  };

  const deleteComment = async (id: string) => {
    await fetch('/api/comments',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});
    setComments(c=>c.filter(x=>x.id!==id));
  };

  /* ── Login ── */
  if (!authed) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--header)'}}>
      <div style={{background:'#251E19',border:'1px solid #3D3128',borderRadius:14,padding:'48px 44px',width:400,textAlign:'center',boxShadow:'0 32px 64px rgba(0,0,0,0.4)'}}>
        <div style={{width:48,height:48,background:'var(--accent-light)',border:'1px solid var(--accent-border)',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 24px'}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>
        </div>
        <p style={{fontWeight:700,fontSize:'1.3rem',color:'#F5EDE0',letterSpacing:'-0.02em',marginBottom:5}}>Console Admin</p>
        <p style={{fontFamily:'var(--font-mono)',fontSize:'0.58rem',color:'#4A3A2E',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:32}}>WorkDash · Valentin</p>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()} placeholder="Mot de passe"
          style={{width:'100%',fontSize:'0.87rem',background:'rgba(255,255,255,0.05)',border:`1px solid ${loginErr?'#DC2626':'rgba(255,255,255,0.1)'}`,borderRadius:8,padding:'11px 14px',color:'#F5EDE0',outline:'none',marginBottom:10,caretColor:'var(--accent)'}} />
        {loginErr&&<p style={{color:'#F87171',fontSize:'0.76rem',marginBottom:12,fontWeight:500}}>{loginErr}</p>}
        <button onClick={login} style={{width:'100%',fontWeight:600,fontSize:'0.87rem',background:'var(--accent)',border:'none',borderRadius:8,padding:'12px',color:'white',cursor:'pointer'}}
          onMouseOver={e=>(e.currentTarget.style.background='var(--accent-dark)')} onMouseOut={e=>(e.currentTarget.style.background='var(--accent)')}>
          Accéder à la console
        </button>
      </div>
    </div>
  );

  if (!data) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)'}}>
      <p style={{color:'var(--text-3)',fontFamily:'var(--font-mono)',fontSize:'0.78rem'}}>chargement…</p>
    </div>
  );

  const sorted = [...data.projects].sort((a,b)=>a.priority-b.priority);

  /* ── Admin UI ── */
  return (
    <div style={{minHeight:'100vh',background:'var(--bg)'}}>

      {/* Header */}
      <header style={{background:'var(--header)',borderBottom:'1px solid var(--header-border)',position:'sticky',top:0,zIndex:50}}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:'var(--accent)'}} />
        <div style={{maxWidth:1280,margin:'0 auto',padding:'0 32px',display:'flex',alignItems:'center',justifyContent:'space-between',height:60}}>
          <div style={{display:'flex',alignItems:'center',gap:16}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:7,height:28,background:'var(--accent)',borderRadius:2}} />
              <div>
                <p style={{fontWeight:800,fontSize:'0.88rem',color:'#F5EDE0',letterSpacing:'-0.02em',lineHeight:1.15}}>Console Admin</p>
                <p style={{fontFamily:'var(--font-mono)',fontSize:'0.54rem',color:'#4A3A2E',letterSpacing:'0.08em'}}>WorkDash · MISMO</p>
              </div>
            </div>
            <span style={{width:1,height:18,background:'#2D2420'}} />
            {unsaved&&<span style={{fontFamily:'var(--font-mono)',fontSize:'0.6rem',color:'#B45309',letterSpacing:'0.04em'}}>● Modifications non sauvegardées</span>}
            {saved&&<span style={{fontFamily:'var(--font-mono)',fontSize:'0.6rem',color:'#15803D',letterSpacing:'0.04em'}}>✓ Sauvegardé</span>}
          </div>

          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <button onClick={save} disabled={saving||!unsaved}
              style={{fontSize:'0.76rem',fontWeight:600,background:(unsaved&&!saving)?'var(--accent)':'rgba(255,255,255,0.05)',border:`1px solid ${(unsaved&&!saving)?'transparent':'rgba(255,255,255,0.08)'}`,borderRadius:7,padding:'7px 16px',color:(unsaved&&!saving)?'white':'#4A3A2E',cursor:(unsaved&&!saving)?'pointer':'not-allowed',transition:'all 0.2s'}}>
              {saving?'Sauvegarde…':'Sauvegarder'}
            </button>
            <a href="/" target="_blank" style={{fontSize:'0.76rem',fontWeight:500,border:'1px solid rgba(255,255,255,0.08)',borderRadius:7,padding:'7px 14px',color:'#6B5A4A',textDecoration:'none',display:'inline-block'}}>
              Dashboard ↗
            </a>
            <button onClick={logout} style={{fontSize:'0.76rem',fontWeight:500,background:'none',border:'1px solid rgba(255,255,255,0.06)',borderRadius:7,padding:'7px 12px',color:'#4A3A2E',cursor:'pointer'}}>Déconnexion</button>
          </div>
        </div>
      </header>

      <main style={{maxWidth:1280,margin:'0 auto',padding:'28px 32px 56px'}}>

        {/* Tabs */}
        <div style={{display:'flex',gap:0,marginBottom:28,borderBottom:'1px solid var(--border)'}}>
          {([
            ['projects',`Projets (${data.projects.length})`],
            ['todos',   `Objectifs (${data.weeklyTodos.length})`],
            ['comments',`Échanges (${comments.length})`],
          ] as const).map(([t,label])=>(
            <button key={t} onClick={()=>setTab(t)}
              style={{fontSize:'0.78rem',fontWeight:tab===t?700:500,padding:'10px 20px',background:'none',border:'none',borderBottom:`2px solid ${tab===t?'var(--accent)':'transparent'}`,color:tab===t?'var(--accent)':'var(--text-3)',cursor:'pointer',letterSpacing:'0.01em',transition:'color 0.15s',marginBottom:-1}}>
              {label}
            </button>
          ))}
        </div>

        {/* ── PROJECTS ── */}
        {tab==='projects'&&(
          <div>
            {/* Add button */}
            <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}>
              <button onClick={()=>setShowAdd(v=>!v)}
                style={{fontSize:'0.78rem',fontWeight:600,background:showAdd?'var(--surface-2)':'var(--accent)',border:`1px solid ${showAdd?'var(--border)':'transparent'}`,borderRadius:8,padding:'8px 16px',color:showAdd?'var(--text-2)':'white',cursor:'pointer',transition:'all 0.15s'}}>
                {showAdd?'× Annuler':'+ Nouveau projet'}
              </button>
            </div>

            {/* Add form */}
            {showAdd&&(
              <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,padding:'24px',marginBottom:16,boxShadow:'var(--shadow-sm)'}} className="slide-up">
                <p style={{fontSize:'0.72rem',fontWeight:700,color:'var(--accent)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:18}}>Nouveau projet</p>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
                  <div><FL>Nom *</FL><FI value={form.name} onChange={v=>setForm(f=>({...f,name:v}))} placeholder="Ex: Interface CHORUS" /></div>
                  <div>
                    <FL>Statut</FL>
                    <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value as Status}))} style={sel}>
                      {STATUS_OPTIONS.map(o=><option key={o} value={o}>{STATUS_META[o].label}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
                  <div><FL>En ce moment</FL><FI value={form.currentAction} onChange={v=>setForm(f=>({...f,currentAction:v}))} placeholder="Développement en cours…" /></div>
                  <div><FL>Prochaine étape</FL><FI value={form.nextStep} onChange={v=>setForm(f=>({...f,nextStep:v}))} placeholder="Finaliser les tests…" /></div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:18}}>
                  <div>
                    <FL>Date d&apos;échéance</FL>
                    <input type="date" value={form.dueDate??''} onChange={e=>setForm(f=>({...f,dueDate:e.target.value||undefined}))} style={{...inp,width:'100%'}} />
                  </div>
                  <div>
                    <FL>Avancement initial — {form.progress}%</FL>
                    <input type="range" min={0} max={100} value={form.progress} onChange={e=>setForm(f=>({...f,progress:+e.target.value}))} style={{width:'100%',accentColor:'var(--accent)',marginTop:10}} />
                  </div>
                </div>
                <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
                  <GBtn onClick={()=>{setShowAdd(false);setForm({...EMPTY});}}>Annuler</GBtn>
                  <PBtn onClick={addProject} disabled={!form.name.trim()}>Créer le projet</PBtn>
                </div>
              </div>
            )}

            {/* Project list */}
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {sorted.map(p=>{
                const sm = STATUS_META[p.status];
                const isExp = expandedId===p.id;
                const pDone = p.tasks.filter(t=>t.done).length;
                const pCol = p.progress>=70?'#15803D':p.progress>=40?'#B45309':'#DC2626';
                return (
                  <div key={p.id} style={{background:'var(--surface)',border:`1px solid ${isExp?sm.color+'55':'var(--border)'}`,borderRadius:10,overflow:'hidden',boxShadow:isExp?`var(--shadow-sm),0 0 0 3px ${sm.color}10`:'var(--shadow-xs)',transition:'all 0.2s'}}>
                    {/* Status stripe */}
                    <div style={{height:3,background:sm.color,opacity:0.8}} />

                    {/* Row */}
                    <div onClick={()=>setExpandedId(e=>e===p.id?null:p.id)}
                      style={{display:'grid',gridTemplateColumns:'28px 1fr 140px auto',gap:14,padding:'12px 16px',alignItems:'center',cursor:'pointer'}}>
                      <span style={{fontFamily:'var(--font-mono)',fontSize:'0.65rem',color:'var(--text-3)',textAlign:'center'}}>{p.priority}</span>
                      <div>
                        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                          <span style={{fontWeight:700,fontSize:'0.87rem',color:'var(--text)',letterSpacing:'-0.01em'}}>{p.name}</span>
                          <span style={{fontSize:'0.62rem',fontWeight:600,padding:'2px 9px',borderRadius:99,background:sm.bg,color:sm.color,border:`1px solid ${sm.border}`}}>{sm.label}</span>
                        </div>
                        <p style={{fontSize:'0.74rem',color:'var(--text-3)',lineHeight:1.35,fontStyle:'italic'}}>{p.currentAction}</p>
                      </div>
                      <div>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:8,marginBottom:5}}>
                          <span style={{fontFamily:'var(--font-mono)',fontSize:'0.62rem',color:'var(--text-3)'}}>{pDone}/{p.tasks.length}</span>
                          <span style={{fontFamily:'var(--font-mono)',fontSize:'0.82rem',fontWeight:700,color:pCol}}>{p.progress}%</span>
                        </div>
                        <div style={{height:3,background:'var(--surface-2)',borderRadius:99,overflow:'hidden'}}>
                          <div style={{height:'100%',width:`${p.progress}%`,borderRadius:99,background:pCol,opacity:0.8}} />
                        </div>
                      </div>
                      <div style={{display:'flex',gap:5}} onClick={e=>e.stopPropagation()}>
                        <IconBtn onClick={()=>moveProject(p.id,-1)}>↑</IconBtn>
                        <IconBtn onClick={()=>moveProject(p.id,1)}>↓</IconBtn>
                        <IconBtn onClick={()=>deleteProject(p.id)} danger>×</IconBtn>
                      </div>
                    </div>

                    {/* Expanded editor */}
                    {isExp&&(
                      <div style={{borderTop:'1px solid var(--border)',padding:'20px',background:'var(--surface-2)'}} className="fade-in">
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
                          <div><FL>Nom du projet</FL><FI value={p.name} onChange={v=>upProject(p.id,{name:v})} /></div>
                          <div>
                            <FL>Statut</FL>
                            <select value={p.status} onChange={e=>upProject(p.id,{status:e.target.value as Status})} style={sel}>
                              {STATUS_OPTIONS.map(o=><option key={o} value={o}>{STATUS_META[o].label}</option>)}
                            </select>
                          </div>
                        </div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
                          <div><FL>En ce moment</FL><FI value={p.currentAction} onChange={v=>upProject(p.id,{currentAction:v})} /></div>
                          <div><FL>Prochaine étape</FL><FI value={p.nextStep} onChange={v=>upProject(p.id,{nextStep:v})} /></div>
                        </div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
                          <div>
                            <FL>Date d&apos;échéance</FL>
                            <div style={{display:'flex',gap:8}}>
                              <input type="date" value={p.dueDate??''} onChange={e=>upProject(p.id,{dueDate:e.target.value||undefined})} style={{...inp,flex:1}} />
                              {p.dueDate&&<GBtn onClick={()=>upProject(p.id,{dueDate:undefined})}>Effacer</GBtn>}
                            </div>
                          </div>
                          <div>
                            <FL>Avancement — {p.progress}%</FL>
                            <div style={{display:'flex',alignItems:'center',gap:10}}>
                              <input type="range" min={0} max={100} value={p.progress} onChange={e=>upProject(p.id,{progress:+e.target.value})} style={{flex:1,accentColor:sm.color,cursor:'pointer'}} />
                              <div style={{width:50,height:6,background:'var(--surface-3)',borderRadius:99,overflow:'hidden'}}>
                                <div style={{height:'100%',width:`${p.progress}%`,background:sm.color,opacity:0.8}} />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div style={{marginBottom:16}}>
                          <FL>Notes internes</FL>
                          <textarea value={p.notes??''} onChange={e=>upProject(p.id,{notes:e.target.value})} rows={2} placeholder="Notes admin…"
                            style={{...inp,resize:'vertical',width:'100%'}} />
                        </div>

                        {/* Tasks */}
                        <FL>Tâches — {pDone}/{p.tasks.length} complétées</FL>
                        <div style={{display:'flex',flexDirection:'column',gap:5,marginBottom:10}}>
                          {p.tasks.map(t=>(
                            <div key={t.id} style={{display:'flex',alignItems:'center',gap:10,background:'var(--surface)',border:`1px solid ${t.done?'#86EFAC':'var(--border)'}`,borderRadius:7,padding:'8px 12px',transition:'border-color 0.15s'}}>
                              <input type="checkbox" checked={t.done} onChange={()=>toggleTask(p.id,t.id)} style={{accentColor:'#15803D',width:15,height:15,cursor:'pointer'}} />
                              <span style={{flex:1,fontSize:'0.8rem',textDecoration:t.done?'line-through':'none',color:t.done?'var(--text-3)':'var(--text-2)',fontWeight:t.done?400:500}}>{t.label}</span>
                              <button onClick={()=>removeTask(p.id,t.id)} style={{background:'none',border:'none',color:'var(--text-3)',cursor:'pointer',fontSize:'0.8rem',opacity:0.4,padding:'0 4px'}}>×</button>
                            </div>
                          ))}
                        </div>
                        <div style={{display:'flex',gap:8}}>
                          <input value={newTask} onChange={e=>setNewTask(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addTask(p.id)} placeholder="Nouvelle tâche… (Entrée)"
                            style={{...inp,flex:1}} />
                          <GBtn onClick={()=>addTask(p.id)}>+ Ajouter</GBtn>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TODOS ── */}
        {tab==='todos'&&(
          <div style={{maxWidth:640}}>
            <div style={{display:'flex',flexDirection:'column',gap:5,marginBottom:12}}>
              {data.weeklyTodos.map(t=>(
                <div key={t.id} style={{display:'flex',alignItems:'center',gap:12,background:'var(--surface)',border:`1px solid ${t.done?'#86EFAC':'var(--border)'}`,borderRadius:9,padding:'11px 14px',transition:'border-color 0.15s'}}>
                  <input type="checkbox" checked={t.done} onChange={()=>toggleTodo(t.id)} style={{accentColor:'#15803D',width:16,height:16,cursor:'pointer'}} />
                  <span style={{flex:1,fontSize:'0.85rem',fontWeight:t.done?400:500,textDecoration:t.done?'line-through':'none',color:t.done?'var(--text-3)':'var(--text)'}}>{t.label}</span>
                  <button onClick={()=>removeTodo(t.id)} style={{background:'none',border:'none',color:'var(--text-3)',cursor:'pointer',fontSize:'0.78rem',opacity:0.4,padding:'0 4px'}}>×</button>
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:8}}>
              <input value={newTodo} onChange={e=>setNewTodo(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addTodo()} placeholder="Nouvel objectif de la semaine… (Entrée)"
                style={{...inp,flex:1}} />
              <GBtn onClick={addTodo}>+ Ajouter</GBtn>
            </div>
          </div>
        )}

        {/* ── COMMENTS ── */}
        {tab==='comments'&&(
          <div style={{maxWidth:820}}>
            {comments.length===0&&(
              <div style={{textAlign:'center',padding:'60px 0',color:'var(--text-3)'}}>
                <p style={{fontSize:'0.82rem',fontWeight:500}}>Aucun échange pour l&apos;instant.</p>
              </div>
            )}
            <div style={{display:'flex',flexDirection:'column',gap:7}}>
              {comments.map(c=>{
                const isM = c.author==='manager';
                const isDecision = c.projectId?.startsWith('decision:');
                return (
                  <div key={c.id} style={{display:'flex',gap:14,background:'var(--surface)',border:`1px solid ${isM?'#C4C2F7':'#86EFAC'}`,borderRadius:10,padding:'14px 16px',alignItems:'flex-start',boxShadow:'var(--shadow-xs)'}}>
                    <div style={{width:34,height:34,borderRadius:9,flexShrink:0,background:isM?'#EEEDFD':'#ECFDF5',border:`1px solid ${isM?'#C4C2F7':'#86EFAC'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.75rem',fontWeight:700,color:isM?'#4F46E5':'#15803D'}}>
                      {isM?'M':'V'}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6,flexWrap:'wrap'}}>
                        <span style={{fontWeight:700,fontSize:'0.78rem',color:isM?'#4F46E5':'#15803D'}}>{isM?'Manager':'Valentin'}</span>
                        <span style={{fontFamily:'var(--font-mono)',fontSize:'0.6rem',color:'var(--text-3)',background:'var(--surface-2)',borderRadius:5,padding:'2px 7px'}}>{isDecision?'Décision':c.projectId}</span>
                        <span style={{fontFamily:'var(--font-mono)',fontSize:'0.6rem',color:'var(--text-3)'}}>{new Date(c.createdAt).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</span>
                      </div>
                      <p style={{fontSize:'0.84rem',color:'var(--text-2)',lineHeight:1.5}}>{c.text}</p>
                    </div>
                    <button onClick={()=>deleteComment(c.id)} style={{fontSize:'0.7rem',fontWeight:600,background:'var(--surface-2)',border:'1px solid var(--border)',borderRadius:6,padding:'4px 10px',color:'var(--text-3)',cursor:'pointer',flexShrink:0,transition:'all 0.15s'}}
                      onMouseOver={e=>{e.currentTarget.style.background='#FEF2F2';e.currentTarget.style.color='#DC2626';e.currentTarget.style.borderColor='#FCA5A5';}}
                      onMouseOut={e=>{e.currentTarget.style.background='var(--surface-2)';e.currentTarget.style.color='var(--text-3)';e.currentTarget.style.borderColor='var(--border)';}}>
                      Suppr.
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/* ─── Styles & primitives ───────────────────────────────── */
const inp: React.CSSProperties = {
  fontFamily: 'var(--font-body)', fontSize: '0.82rem',
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 7, padding: '8px 12px', color: 'var(--text)', outline: 'none',
  caretColor: 'var(--accent)',
};

const sel: React.CSSProperties = { ...inp, width: '100%', cursor: 'pointer' };

function FL({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: '0.61rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 7 }}>{children}</p>;
}

function FI({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ ...inp, width: '100%' }} />;
}

function GBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ fontSize: '0.74rem', fontWeight: 600, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 7, padding: '7px 14px', color: 'var(--text-2)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
      {children}
    </button>
  );
}

function PBtn({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ fontSize: '0.74rem', fontWeight: 600, background: disabled ? 'var(--border)' : 'var(--accent)', border: 'none', borderRadius: 7, padding: '7px 16px', color: disabled ? 'var(--text-3)' : 'white', cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}>
      {children}
    </button>
  );
}

function IconBtn({ onClick, children, danger }: { onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <button onClick={onClick}
      style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: danger ? 'transparent' : 'var(--surface-2)', border: `1px solid ${danger ? 'var(--border)' : 'var(--border)'}`, borderRadius: 6, cursor: 'pointer', color: danger ? 'var(--text-3)' : 'var(--text-2)', fontSize: '0.75rem', fontWeight: 700, transition: 'all 0.15s' }}
      onMouseOver={e => { e.currentTarget.style.background = danger ? '#FEF2F2' : 'var(--surface-3)'; if (danger) e.currentTarget.style.color = '#DC2626'; }}
      onMouseOut={e => { e.currentTarget.style.background = danger ? 'transparent' : 'var(--surface-2)'; if (danger) e.currentTarget.style.color = 'var(--text-3)'; }}>
      {children}
    </button>
  );
}
