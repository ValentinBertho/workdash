'use client';
import { useEffect, useState, useCallback } from 'react';
import { DashboardData, Project, Task, Comment, Priority, Status } from '@/types';

const PRIORITY_OPTIONS: Priority[] = ['high', 'med', 'low'];
const STATUS_OPTIONS: Status[] = ['en-cours', 'a-deployer', 'ok', 'bloque', 'a-cadrer'];
const STATUS_LABELS: Record<Status, string> = {
  'en-cours': 'En cours', 'a-deployer': 'À déployer', 'ok': 'OK', 'bloque': 'À arbitrer', 'a-cadrer': 'À cadrer'
};
const PRIO_LABELS: Record<Priority, string> = { high: '🔴 Haute', med: '🟡 Moyenne', low: '🟢 Basse' };

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [data, setData] = useState<DashboardData | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [tab, setTab] = useState<'projects' | 'todos' | 'comments'>('projects');
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [newTaskLabel, setNewTaskLabel] = useState('');

  const load = useCallback(async () => {
    const [d, c] = await Promise.all([
      fetch('/api/projects').then(r => r.json()),
      fetch('/api/comments').then(r => r.json()),
    ]);
    setData(d);
    setComments(c);
  }, []);

  useEffect(() => {
    // Check if already authed
    fetch('/api/auth', { method: 'DELETE' }) // just pings to check cookie
      .then(() => {});
  }, []);

  const login = async () => {
    setLoginError('');
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setAuthed(true);
      load();
    } else {
      setLoginError('Mot de passe incorrect');
    }
  };

  const logout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    setAuthed(false);
    setData(null);
  };

  const save = async () => {
    if (!data) return;
    setSaving(true);
    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setSaving(false);
    setSaveMsg('Sauvegardé ✓');
    setTimeout(() => setSaveMsg(''), 2500);
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    if (!data) return;
    setData({ ...data, projects: data.projects.map(p => p.id === id ? { ...p, ...updates } : p) });
  };

  const toggleTask = (projectId: string, taskId: string) => {
    if (!data) return;
    setData({
      ...data,
      projects: data.projects.map(p =>
        p.id !== projectId ? p : {
          ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t)
        }
      )
    });
  };

  const addTask = (projectId: string) => {
    if (!newTaskLabel.trim() || !data) return;
    const task: Task = { id: crypto.randomUUID(), label: newTaskLabel.trim(), done: false };
    setData({
      ...data,
      projects: data.projects.map(p => p.id !== projectId ? p : { ...p, tasks: [...p.tasks, task] })
    });
    setNewTaskLabel('');
  };

  const removeTask = (projectId: string, taskId: string) => {
    if (!data) return;
    setData({
      ...data,
      projects: data.projects.map(p => p.id !== projectId ? p : { ...p, tasks: p.tasks.filter(t => t.id !== taskId) })
    });
  };

  const toggleTodo = (id: string) => {
    if (!data) return;
    setData({ ...data, weeklyTodos: data.weeklyTodos.map(t => t.id === id ? { ...t, done: !t.done } : t) });
  };

  const addTodo = (label: string) => {
    if (!data || !label.trim()) return;
    setData({ ...data, weeklyTodos: [...data.weeklyTodos, { id: crypto.randomUUID(), label: label.trim(), done: false }] });
  };

  const removeTodo = (id: string) => {
    if (!data) return;
    setData({ ...data, weeklyTodos: data.weeklyTodos.filter(t => t.id !== id) });
  };

  const deleteComment = async (id: string) => {
    await fetch('/api/comments', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setComments(c => c.filter(x => x.id !== id));
  };

  const moveProject = (id: string, dir: -1 | 1) => {
    if (!data) return;
    const idx = data.projects.findIndex(p => p.id === id);
    if (idx + dir < 0 || idx + dir >= data.projects.length) return;
    const arr = [...data.projects];
    [arr[idx], arr[idx + dir]] = [arr[idx + dir], arr[idx]];
    setData({ ...data, projects: arr });
  };

  // ---- Login screen ----
  if (!authed) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', backgroundImage: 'radial-gradient(ellipse at 50% 30%, #1a2040 0%, transparent 60%)' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
        padding: '40px 36px', width: 340, textAlign: 'center' }}>
        <div style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 4,
          background: 'linear-gradient(135deg, #e8eaf0 40%, #4f8ef7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Admin
        </div>
        <div className="mono mb-6" style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Console WorkDash
        </div>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()}
          placeholder="Mot de passe admin"
          style={{ width: '100%', background: 'var(--surface2)', border: `1px solid ${loginError ? '#f7534f' : 'var(--border)'}`,
            borderRadius: 6, padding: '10px 14px', color: 'var(--text)', fontSize: '0.9rem',
            fontFamily: 'inherit', outline: 'none', marginBottom: 12 }} />
        {loginError && <div style={{ color: '#f7534f', fontSize: '0.75rem', marginBottom: 10 }}>{loginError}</div>}
        <button onClick={login}
          style={{ width: '100%', background: '#4f8ef7', border: 'none', borderRadius: 6, padding: '10px',
            color: '#fff', fontFamily: 'inherit', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
          Connexion
        </button>
      </div>
    </div>
  );

  if (!data) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="mono text-sm" style={{ color: 'var(--muted)' }}>Chargement...</div>
    </div>
  );

  // ---- Admin console ----
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', padding: '28px 24px',
      backgroundImage: 'radial-gradient(ellipse at 10% 0%, #1a2040 0%, transparent 55%)' }}>

      {/* Top bar */}
      <div className="flex items-center justify-between mb-8 pb-5" style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em',
            background: 'linear-gradient(135deg, #e8eaf0 40%, #4f8ef7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Console Admin
          </div>
          <div className="mono mt-1" style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            // WorkDash · MISMO
          </div>
        </div>
        <div className="flex items-center gap-3">
          {saveMsg && <span style={{ color: '#4fc987', fontSize: '0.78rem' }}>{saveMsg}</span>}
          <button onClick={save} disabled={saving}
            style={{ background: '#4f8ef7', border: 'none', borderRadius: 6, padding: '8px 18px',
              color: '#fff', fontFamily: 'inherit', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Sauvegarde...' : '💾 Sauvegarder'}
          </button>
          <a href="/" target="_blank"
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 16px',
              color: 'var(--text)', fontFamily: 'inherit', fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'none' }}>
            👁 Dashboard
          </a>
          <button onClick={logout}
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 14px',
              color: 'var(--muted)', fontFamily: 'inherit', fontSize: '0.8rem', cursor: 'pointer' }}>
            Déconnexion
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-7">
        {(['projects','todos','comments'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ fontFamily: 'inherit', fontWeight: 600, fontSize: '0.8rem', padding: '7px 18px', borderRadius: 6, cursor: 'pointer',
              background: tab === t ? '#4f8ef7' : 'var(--surface)', border: `1px solid ${tab === t ? '#4f8ef7' : 'var(--border)'}`,
              color: tab === t ? '#fff' : 'var(--muted)' }}>
            {t === 'projects' ? `📁 Projets (${data.projects.length})` : t === 'todos' ? `✅ To-do semaine (${data.weeklyTodos.length})` : `💬 Échanges (${comments.length})`}
          </button>
        ))}
      </div>

      {/* === PROJECTS TAB === */}
      {tab === 'projects' && (
        <div>
          {data.projects.map((p, i) => (
            <div key={p.id} style={{ background: 'var(--surface)', border: `1px solid ${editingProject === p.id ? '#4f8ef7' : 'var(--border)'}`,
              borderRadius: 8, marginBottom: 10, overflow: 'hidden' }}>

              {/* Project header */}
              <div className="flex items-center gap-3 p-4" style={{ cursor: 'pointer' }}
                onClick={() => setEditingProject(e => e === p.id ? null : p.id)}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                  background: { high: '#f7534f', med: '#f7d44f', low: '#4fc987' }[p.priority] }} />
                <span style={{ fontWeight: 700, flex: 1 }}>{p.name}</span>
                <div style={{ width: 100, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${p.progress}%`, borderRadius: 2,
                    background: p.progress >= 70 ? '#4fc987' : p.progress >= 40 ? '#f7d44f' : '#f7534f' }} />
                </div>
                <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--muted)', width: 32, textAlign: 'right' }}>{p.progress}%</span>
                <span className="mono" style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>{editingProject === p.id ? '▲' : '▼'}</span>
                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                  <button onClick={() => moveProject(p.id, -1)} disabled={i === 0}
                    style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 3, padding: '2px 6px', cursor: 'pointer', color: 'var(--muted)', opacity: i===0?0.3:1 }}>↑</button>
                  <button onClick={() => moveProject(p.id, 1)} disabled={i === data.projects.length-1}
                    style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 3, padding: '2px 6px', cursor: 'pointer', color: 'var(--muted)', opacity: i===data.projects.length-1?0.3:1 }}>↓</button>
                </div>
              </div>

              {/* Expanded editor */}
              {editingProject === p.id && (
                <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)' }}>
                  <div className="grid gap-4 mt-4" style={{ gridTemplateColumns: '1fr 1fr 1fr 120px' }}>
                    <div>
                      <Label>Nom du projet</Label>
                      <Input value={p.name} onChange={v => updateProject(p.id, { name: v })} />
                    </div>
                    <div>
                      <Label>Priorité</Label>
                      <Select value={p.priority} onChange={v => updateProject(p.id, { priority: v as Priority })}
                        options={PRIORITY_OPTIONS.map(o => ({ value: o, label: PRIO_LABELS[o] }))} />
                    </div>
                    <div>
                      <Label>Statut</Label>
                      <Select value={p.status} onChange={v => updateProject(p.id, { status: v as Status })}
                        options={STATUS_OPTIONS.map(o => ({ value: o, label: STATUS_LABELS[o] }))} />
                    </div>
                    <div>
                      <Label>Avancement {p.progress}%</Label>
                      <input type="range" min={0} max={100} value={p.progress}
                        onChange={e => updateProject(p.id, { progress: Number(e.target.value) })}
                        style={{ width: '100%', accentColor: '#4f8ef7', marginTop: 8 }} />
                    </div>
                  </div>

                  <div>
                    <Label>Notes internes</Label>
                    <textarea value={p.notes ?? ''} onChange={e => updateProject(p.id, { notes: e.target.value })}
                      placeholder="Notes visibles uniquement en admin..."
                      rows={2}
                      style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 4,
                        padding: '7px 10px', color: 'var(--text)', fontSize: '0.8rem', fontFamily: 'inherit',
                        resize: 'vertical', outline: 'none', marginTop: 4 }} />
                  </div>

                  <Label>Tâches</Label>
                  <div className="flex flex-col gap-1 mb-2">
                    {p.tasks.map(t => (
                      <div key={t.id} className="flex items-center gap-2"
                        style={{ background: 'var(--surface2)', borderRadius: 4, padding: '5px 10px' }}>
                        <input type="checkbox" checked={t.done} onChange={() => toggleTask(p.id, t.id)} style={{ accentColor: '#4fc987' }} />
                        <span style={{ flex: 1, fontSize: '0.8rem', textDecoration: t.done ? 'line-through' : 'none', color: t.done ? 'var(--muted)' : 'var(--text)' }}>
                          {t.label}
                        </span>
                        <button onClick={() => removeTask(p.id, t.id)}
                          style={{ background: 'none', border: 'none', color: '#f7534f', cursor: 'pointer', fontSize: '0.75rem', opacity: 0.7 }}>✕</button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input value={newTaskLabel} onChange={e => setNewTaskLabel(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addTask(p.id)}
                      placeholder="Nouvelle tâche..."
                      style={{ flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 4,
                        padding: '6px 10px', color: 'var(--text)', fontSize: '0.78rem', fontFamily: 'inherit', outline: 'none' }} />
                    <button onClick={() => addTask(p.id)}
                      style={{ background: 'var(--surface2)', border: '1px solid #4f8ef7', borderRadius: 4, padding: '6px 14px',
                        color: '#4f8ef7', fontFamily: 'inherit', fontSize: '0.78rem', cursor: 'pointer' }}>+ Ajouter</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* === TODOS TAB === */}
      {tab === 'todos' && (
        <div style={{ maxWidth: 600 }}>
          <div className="flex flex-col gap-2 mb-4">
            {data.weeklyTodos.map(t => (
              <div key={t.id} className="flex items-center gap-3"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 14px' }}>
                <input type="checkbox" checked={t.done} onChange={() => toggleTodo(t.id)} style={{ accentColor: '#4fc987' }} />
                <span style={{ flex: 1, fontSize: '0.85rem', textDecoration: t.done ? 'line-through' : 'none', color: t.done ? 'var(--muted)' : 'var(--text)' }}>
                  {t.label}
                </span>
                <button onClick={() => removeTodo(t.id)}
                  style={{ background: 'none', border: 'none', color: '#f7534f', cursor: 'pointer', fontSize: '0.8rem', opacity: 0.7 }}>✕</button>
              </div>
            ))}
          </div>
          <AddTodoForm onAdd={addTodo} />
        </div>
      )}

      {/* === COMMENTS TAB === */}
      {tab === 'comments' && (
        <div style={{ maxWidth: 700 }}>
          {comments.length === 0 && (
            <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--muted)', textAlign: 'center', padding: 40 }}>
              Aucun échange pour l'instant.
            </div>
          )}
          {comments.map(c => (
            <div key={c.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
              padding: '12px 16px', marginBottom: 8, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div className="flex items-center gap-3 mb-1">
                  <span style={{ fontWeight: 700, fontSize: '0.8rem', color: c.author === 'manager' ? '#4f8ef7' : '#4fc987' }}>
                    {c.author === 'manager' ? '👔 Manager' : '💻 Valentin'}
                  </span>
                  <span className="mono" style={{ fontSize: '0.62rem', color: 'var(--muted)' }}>
                    Projet : {c.projectId}
                  </span>
                  <span className="mono" style={{ fontSize: '0.62rem', color: 'var(--muted)' }}>
                    {new Date(c.createdAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{c.text}</div>
              </div>
              <button onClick={() => deleteComment(c.id)}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 9px',
                  color: '#f7534f', cursor: 'pointer', fontSize: '0.72rem', flexShrink: 0 }}>
                Suppr.
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="mono" style={{ fontSize: '0.62rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, marginTop: 12 }}>{children}</div>;
}

function Input({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)}
      style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 4,
        padding: '7px 10px', color: 'var(--text)', fontSize: '0.82rem', fontFamily: 'inherit', outline: 'none' }} />
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 4,
        padding: '7px 10px', color: 'var(--text)', fontSize: '0.82rem', fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function AddTodoForm({ onAdd }: { onAdd: (v: string) => void }) {
  const [val, setVal] = useState('');
  return (
    <div className="flex gap-2">
      <input value={val} onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && val.trim()) { onAdd(val); setVal(''); } }}
        placeholder="Nouvelle tâche de la semaine..."
        style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6,
          padding: '9px 14px', color: 'var(--text)', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none' }} />
      <button onClick={() => { if(val.trim()) { onAdd(val); setVal(''); } }}
        style={{ background: '#4f8ef7', border: 'none', borderRadius: 6, padding: '9px 18px',
          color: '#fff', fontFamily: 'inherit', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>
        + Ajouter
      </button>
    </div>
  );
}
