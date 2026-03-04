'use client';
import { useEffect, useState, useCallback } from 'react';
import { DashboardData, Project, Task, Comment, Status } from '@/types';

const STATUS_OPTIONS: Status[] = ['en-cours', 'a-deployer', 'ok', 'bloque', 'a-cadrer'];
const STATUS_LABELS: Record<Status, string> = {
  'en-cours': 'En cours', 'a-deployer': 'À déployer', 'ok': 'OK', 'bloque': 'Bloqué', 'a-cadrer': 'À cadrer'
};

export default function AdminPage() {
  const [authed, setAuthed]   = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [data, setData]       = useState<DashboardData | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [saving, setSaving]   = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [tab, setTab]         = useState<'projects'|'todos'|'comments'>('projects');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newTaskLabel, setNewTaskLabel] = useState('');
  const [newTodoLabel, setNewTodoLabel] = useState('');

  const load = useCallback(async () => {
    const [d, c] = await Promise.all([
      fetch('/api/projects').then(r => r.json()),
      fetch('/api/comments').then(r => r.json()),
    ]);
    setData(d); setComments(c);
  }, []);

  const login = async () => {
    setLoginError('');
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) { setAuthed(true); load(); }
    else setLoginError('Mot de passe incorrect');
  };

  const logout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    setAuthed(false); setData(null);
  };

  const save = async () => {
    if (!data) return;
    setSaving(true);
    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setSaving(false); setSaveMsg('Sauvegardé ✓');
    setTimeout(() => setSaveMsg(''), 2500);
  };

  const upProject = (id: string, updates: Partial<Project>) => {
    if (!data) return;
    setData({ ...data, projects: data.projects.map(p => p.id === id ? { ...p, ...updates } : p) });
  };

  const toggleTask = (projectId: string, taskId: string) => {
    if (!data) return;
    setData({ ...data, projects: data.projects.map(p => p.id !== projectId ? p : {
      ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t)
    })});
  };

  const addTask = (projectId: string) => {
    if (!newTaskLabel.trim() || !data) return;
    const task: Task = { id: crypto.randomUUID(), label: newTaskLabel.trim(), done: false };
    setData({ ...data, projects: data.projects.map(p => p.id !== projectId ? p : { ...p, tasks: [...p.tasks, task] }) });
    setNewTaskLabel('');
  };

  const removeTask = (projectId: string, taskId: string) => {
    if (!data) return;
    setData({ ...data, projects: data.projects.map(p => p.id !== projectId ? p : { ...p, tasks: p.tasks.filter(t => t.id !== taskId) }) });
  };

  const moveProject = (id: string, dir: -1|1) => {
    if (!data) return;
    const sorted = [...data.projects].sort((a, b) => a.priority - b.priority);
    const idx = sorted.findIndex(p => p.id === id);
    if (idx + dir < 0 || idx + dir >= sorted.length) return;
    const a = sorted[idx], b = sorted[idx + dir];
    const ap = a.priority, bp = b.priority;
    setData({ ...data, projects: data.projects.map(p =>
      p.id === a.id ? { ...p, priority: bp } : p.id === b.id ? { ...p, priority: ap } : p
    )});
  };

  const toggleTodo = (id: string) => {
    if (!data) return;
    setData({ ...data, weeklyTodos: data.weeklyTodos.map(t => t.id === id ? { ...t, done: !t.done } : t) });
  };

  const addTodo = () => {
    if (!data || !newTodoLabel.trim()) return;
    setData({ ...data, weeklyTodos: [...data.weeklyTodos, { id: crypto.randomUUID(), label: newTodoLabel.trim(), done: false }] });
    setNewTodoLabel('');
  };

  const removeTodo = (id: string) => {
    if (!data) return;
    setData({ ...data, weeklyTodos: data.weeklyTodos.filter(t => t.id !== id) });
  };

  const deleteComment = async (id: string) => {
    await fetch('/api/comments', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setComments(c => c.filter(x => x.id !== id));
  };

  /* ── Login ── */
  if (!authed) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 12, padding: '40px 36px', width: 340, textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4 }}>Console Admin</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 24 }}>WorkDash · MISMO</div>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()}
          placeholder="Mot de passe"
          style={{ width: '100%', fontFamily: 'var(--font-body)', fontSize: '0.9rem',
            background: 'var(--bg)', border: `1px solid ${loginError ? '#C0392B' : 'var(--border2)'}`,
            borderRadius: 7, padding: '10px 14px', color: 'var(--text)', outline: 'none', marginBottom: 10 }} />
        {loginError && <div style={{ color: '#C0392B', fontSize: '0.75rem', marginBottom: 10 }}>{loginError}</div>}
        <button onClick={login} style={{ width: '100%', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.9rem',
          background: '#1A5CFF', border: 'none', borderRadius: 7, padding: '10px', color: '#fff', cursor: 'pointer' }}>
          Connexion
        </button>
      </div>
    </div>
  );

  if (!data) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--muted)' }}>Chargement…</span>
    </div>
  );

  const sorted = [...data.projects].sort((a, b) => a.priority - b.priority);

  /* ── Admin UI ── */
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <header style={{ background: 'var(--white)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 600, letterSpacing: '-0.02em' }}>Console Admin</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--muted)' }}>WorkDash</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {saveMsg && <span style={{ color: '#0F8B5A', fontSize: '0.78rem', fontWeight: 500 }}>{saveMsg}</span>}
            <button onClick={save} disabled={saving}
              style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.78rem',
                background: '#1A5CFF', border: 'none', borderRadius: 7, padding: '7px 16px', color: '#fff', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Sauvegarde…' : '💾 Sauvegarder'}
            </button>
            <a href="/" target="_blank" style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', fontWeight: 500,
              color: 'var(--accent)', textDecoration: 'none', padding: '6px 14px', borderRadius: 6,
              background: 'var(--accent-light)', border: '1px solid #C7D7FF' }}>
              👁 Dashboard
            </a>
            <button onClick={logout} style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', background: 'none',
              border: '1px solid var(--border)', borderRadius: 6, padding: '6px 12px', color: 'var(--muted)', cursor: 'pointer' }}>
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 32px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          {([
            ['projects', `📁 Projets (${data.projects.length})`],
            ['todos', `✅ Semaine (${data.weeklyTodos.length})`],
            ['comments', `💬 Échanges (${comments.length})`],
          ] as const).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.8rem', padding: '7px 16px',
                borderRadius: 7, cursor: 'pointer', border: '1px solid',
                background: tab === t ? '#1A5CFF' : 'var(--white)',
                borderColor: tab === t ? '#1A5CFF' : 'var(--border)',
                color: tab === t ? '#fff' : 'var(--muted)' }}>
              {label}
            </button>
          ))}
        </div>

        {/* === PROJECTS === */}
        {tab === 'projects' && (
          <div>
            {sorted.map((p) => (
              <div key={p.id} style={{ background: 'var(--white)', border: `1px solid ${expandedId === p.id ? '#A0B8FF' : 'var(--border)'}`,
                borderRadius: 10, marginBottom: 8, overflow: 'hidden',
                boxShadow: expandedId === p.id ? '0 0 0 3px #EEF2FF' : '0 1px 2px rgba(0,0,0,0.03)' }}>

                {/* Row header */}
                <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr auto auto', gap: 14, padding: '12px 18px', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => setExpandedId(e => e === p.id ? null : p.id)}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600,
                    background: p.priority <= 3 ? 'var(--accent-light)' : 'var(--bg)',
                    border: `1px solid ${p.priority <= 3 ? '#C7D7FF' : 'var(--border)'}`,
                    color: p.priority <= 3 ? 'var(--accent)' : 'var(--muted)' }}>
                    {p.priority}
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{p.name}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', marginLeft: 8,
                      padding: '2px 6px', borderRadius: 4, background: '#EEF2FF', color: '#1A5CFF' }}>
                      {STATUS_LABELS[p.status]}
                    </span>
                  </div>
                  {/* Progress display */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 80, height: 4, background: 'var(--bg2)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${p.progress}%`, borderRadius: 99,
                        background: p.progress >= 70 ? '#0F8B5A' : p.progress >= 40 ? '#F59E0B' : '#C0392B' }} />
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--muted)', width: 32 }}>{p.progress}%</span>
                  </div>
                  {/* Move buttons */}
                  <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                    <Btn onClick={() => moveProject(p.id, -1)}>↑</Btn>
                    <Btn onClick={() => moveProject(p.id, 1)}>↓</Btn>
                  </div>
                </div>

                {/* Expanded editor */}
                {expandedId === p.id && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '20px 18px', background: 'var(--bg)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                      <div>
                        <FLabel>Nom du projet</FLabel>
                        <FInput value={p.name} onChange={v => upProject(p.id, { name: v })} />
                      </div>
                      <div>
                        <FLabel>Statut</FLabel>
                        <select value={p.status} onChange={e => upProject(p.id, { status: e.target.value as Status })}
                          style={selectStyle}>
                          {STATUS_OPTIONS.map(o => <option key={o} value={o}>{STATUS_LABELS[o]}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                      <div>
                        <FLabel>En ce moment (affiché manager)</FLabel>
                        <FInput value={p.currentAction} onChange={v => upProject(p.id, { currentAction: v })} />
                      </div>
                      <div>
                        <FLabel>Prochaine étape</FLabel>
                        <FInput value={p.nextStep} onChange={v => upProject(p.id, { nextStep: v })} />
                      </div>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <FLabel>Avancement : {p.progress}%</FLabel>
                      <input type="range" min={0} max={100} value={p.progress}
                        onChange={e => upProject(p.id, { progress: Number(e.target.value) })}
                        style={{ width: '100%', accentColor: '#1A5CFF', marginTop: 4 }} />
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <FLabel>Notes internes (non visibles en dashboard)</FLabel>
                      <textarea value={p.notes ?? ''} onChange={e => upProject(p.id, { notes: e.target.value })}
                        rows={2} placeholder="Notes admin…"
                        style={{ ...inputStyle, resize: 'vertical', width: '100%' }} />
                    </div>
                    <FLabel>Tâches · {p.tasks.filter(t=>t.done).length}/{p.tasks.length} complétées</FLabel>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
                      {p.tasks.map(t => (
                        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8,
                          background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 12px' }}>
                          <input type="checkbox" checked={t.done} onChange={() => toggleTask(p.id, t.id)} style={{ accentColor: '#0F8B5A' }} />
                          <span style={{ flex: 1, fontSize: '0.8rem', textDecoration: t.done ? 'line-through' : 'none',
                            color: t.done ? 'var(--muted)' : 'var(--text)' }}>{t.label}</span>
                          <button onClick={() => removeTask(p.id, t.id)}
                            style={{ background: 'none', border: 'none', color: '#C0392B', cursor: 'pointer', fontSize: '0.75rem', opacity: 0.6 }}>✕</button>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input value={newTaskLabel} onChange={e => setNewTaskLabel(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addTask(p.id)}
                        placeholder="Nouvelle tâche…"
                        style={{ ...inputStyle, flex: 1 }} />
                      <button onClick={() => addTask(p.id)}
                        style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.78rem',
                          background: 'var(--accent-light)', border: '1px solid #C7D7FF', borderRadius: 6,
                          padding: '6px 14px', color: 'var(--accent)', cursor: 'pointer' }}>
                        + Ajouter
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* === TODOS === */}
        {tab === 'todos' && (
          <div style={{ maxWidth: 600 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              {data.weeklyTodos.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10,
                  background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
                  <input type="checkbox" checked={t.done} onChange={() => toggleTodo(t.id)} style={{ accentColor: '#0F8B5A' }} />
                  <span style={{ flex: 1, fontSize: '0.85rem', textDecoration: t.done ? 'line-through' : 'none',
                    color: t.done ? 'var(--muted)' : 'var(--text)' }}>{t.label}</span>
                  <button onClick={() => removeTodo(t.id)}
                    style={{ background: 'none', border: 'none', color: '#C0392B', cursor: 'pointer', opacity: 0.6 }}>✕</button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={newTodoLabel} onChange={e => setNewTodoLabel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTodo()}
                placeholder="Nouvelle tâche de la semaine…"
                style={{ ...inputStyle, flex: 1 }} />
              <button onClick={addTodo} style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.8rem',
                background: '#1A5CFF', border: 'none', borderRadius: 7, padding: '8px 18px', color: '#fff', cursor: 'pointer' }}>
                + Ajouter
              </button>
            </div>
          </div>
        )}

        {/* === COMMENTS === */}
        {tab === 'comments' && (
          <div style={{ maxWidth: 720 }}>
            {comments.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--muted)' }}>
                Aucun échange pour l'instant.
              </div>
            )}
            {comments.map(c => (
              <div key={c.id} style={{ display: 'flex', gap: 14, background: 'var(--white)',
                border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px', marginBottom: 8, alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.8rem',
                      color: c.author === 'manager' ? '#1A5CFF' : '#0F8B5A' }}>
                      {c.author === 'manager' ? '👔 Manager' : '💻 Valentin'}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--muted)' }}>
                      Projet : {c.projectId}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--muted)' }}>
                      {new Date(c.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{c.text}</div>
                </div>
                <button onClick={() => deleteComment(c.id)}
                  style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 5, padding: '4px 9px',
                    color: '#C0392B', cursor: 'pointer', fontSize: '0.72rem', flexShrink: 0 }}>Suppr.</button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)', fontSize: '0.82rem',
  background: 'var(--white)', border: '1px solid var(--border2)',
  borderRadius: 6, padding: '7px 10px', color: 'var(--text)', outline: 'none',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle, width: '100%', cursor: 'pointer',
};

function FLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', textTransform: 'uppercase',
    letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 5 }}>{children}</div>;
}

function FInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input value={value} onChange={e => onChange(e.target.value)} style={{ ...inputStyle, width: '100%' }} />;
}

function Btn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem',
      background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 5,
      padding: '4px 8px', cursor: 'pointer', color: 'var(--muted)' }}>
      {children}
    </button>
  );
}
