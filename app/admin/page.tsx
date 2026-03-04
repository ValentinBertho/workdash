'use client';
import { useEffect, useState, useCallback } from 'react';
import { DashboardData, Project, Task, Comment, Status } from '@/types';

const STATUS_OPTIONS: Status[] = ['en-cours', 'a-deployer', 'ok', 'bloque', 'a-cadrer'];
const STATUS_META: Record<Status, { label: string; icon: string; color: string; bg: string }> = {
  'en-cours':   { label: 'En cours',   icon: '⚡', color: '#7C3AED', bg: '#EDE9FE' },
  'a-deployer': { label: 'À déployer', icon: '🚀', color: '#EA580C', bg: '#FFEDD5' },
  'ok':         { label: 'Terminé',    icon: '✅', color: '#059669', bg: '#D1FAE5' },
  'bloque':     { label: 'Bloqué',     icon: '🔴', color: '#DC2626', bg: '#FEE2E2' },
  'a-cadrer':   { label: 'À cadrer',   icon: '📋', color: '#64748B', bg: '#F1F5F9' },
};

const EMPTY_PROJECT = {
  name: '', status: 'en-cours' as Status, currentAction: '', nextStep: '', progress: 0,
};

export default function AdminPage() {
  const [authed, setAuthed]     = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [data, setData]         = useState<DashboardData | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [saving, setSaving]     = useState(false);
  const [saveMsg, setSaveMsg]   = useState('');
  const [tab, setTab]           = useState<'projects' | 'todos' | 'comments'>('projects');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newTaskLabel, setNewTaskLabel] = useState('');
  const [newTodoLabel, setNewTodoLabel] = useState('');
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProject, setNewProject] = useState({ ...EMPTY_PROJECT });

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
      ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t),
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
    setData({ ...data, projects: data.projects.map(p => p.id !== projectId ? p : {
      ...p, tasks: p.tasks.filter(t => t.id !== taskId),
    })});
  };

  const moveProject = (id: string, dir: -1 | 1) => {
    if (!data) return;
    const sorted = [...data.projects].sort((a, b) => a.priority - b.priority);
    const idx = sorted.findIndex(p => p.id === id);
    if (idx + dir < 0 || idx + dir >= sorted.length) return;
    const a = sorted[idx], b = sorted[idx + dir];
    setData({ ...data, projects: data.projects.map(p =>
      p.id === a.id ? { ...p, priority: b.priority } :
      p.id === b.id ? { ...p, priority: a.priority } : p
    )});
  };

  const deleteProject = (id: string) => {
    if (!data || !confirm('Supprimer ce projet ?')) return;
    setData({ ...data, projects: data.projects.filter(p => p.id !== id) });
  };

  const addProject = () => {
    if (!newProject.name.trim() || !data) return;
    const maxPriority = data.projects.length > 0
      ? Math.max(...data.projects.map(p => p.priority))
      : 0;
    const project: Project = {
      id: crypto.randomUUID(),
      name: newProject.name.trim(),
      priority: maxPriority + 1,
      status: newProject.status,
      progress: newProject.progress,
      currentAction: newProject.currentAction.trim() || 'Démarrage du projet',
      nextStep: newProject.nextStep.trim() || 'À définir',
      tasks: [],
    };
    setData({ ...data, projects: [...data.projects, project] });
    setNewProject({ ...EMPTY_PROJECT });
    setShowAddProject(false);
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

  /* ── Login screen ──────────────────────────────────────── */
  if (!authed) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #F0EEFF 0%, #EDE9FE 100%)' }}>
      <div style={{
        background: 'white', border: '2.5px solid #1E1B4B', borderRadius: 20,
        padding: '44px 40px', width: 360, textAlign: 'center',
        boxShadow: '6px 6px 0 #1E1B4B',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>🔐</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', fontWeight: 900,
          color: '#1E1B4B', letterSpacing: '-0.02em', marginBottom: 4 }}>
          Console Admin
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: '#9CA3AF',
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 28 }}>
          WorkDash · MISMO
        </div>
        <input
          type="password" value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()}
          placeholder="Mot de passe"
          style={{
            width: '100%', fontFamily: 'var(--font-body)', fontSize: '0.95rem',
            background: '#F9F9FF', border: `2.5px solid ${loginError ? '#DC2626' : '#C4B5FD'}`,
            borderRadius: 12, padding: '11px 16px', color: '#1E1B4B', outline: 'none',
            marginBottom: 12, boxShadow: loginError ? '2px 2px 0 #DC2626' : '2px 2px 0 #C4B5FD',
          }}
        />
        {loginError && (
          <div style={{ color: '#DC2626', fontSize: '0.78rem', marginBottom: 12, fontWeight: 600 }}>
            ❌ {loginError}
          </div>
        )}
        <button onClick={login} style={{
          width: '100%', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '0.95rem',
          background: '#7C3AED', border: '2.5px solid #5B21B6', borderRadius: 12,
          padding: '11px', color: 'white', cursor: 'pointer',
          boxShadow: '3px 3px 0 #5B21B6',
        }}>
          ⚡ Connexion
        </button>
      </div>
    </div>
  );

  if (!data) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: 'var(--purple)', fontSize: '1rem' }}>
        Chargement…
      </div>
    </div>
  );

  const sorted = [...data.projects].sort((a, b) => a.priority - b.priority);

  /* ── Admin UI ──────────────────────────────────────────── */
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)',
        borderBottom: '3px solid #1E1B4B', boxShadow: '0 4px 0 #0F0E2B',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, background: '#7C3AED', borderRadius: 12,
              border: '2px solid rgba(255,255,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
              ⚙️
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 900, color: 'white' }}>
                Console Admin
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'rgba(255,255,255,0.5)' }}>
                WorkDash
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {saveMsg && (
              <span style={{ fontFamily: 'var(--font-display)', color: '#34D399', fontSize: '0.82rem', fontWeight: 900 }}>
                {saveMsg}
              </span>
            )}
            <button onClick={save} disabled={saving} style={{
              fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '0.82rem',
              background: '#059669', border: '2.5px solid #047857', borderRadius: 10,
              padding: '8px 18px', color: 'white', cursor: 'pointer',
              boxShadow: '3px 3px 0 #047857', opacity: saving ? 0.6 : 1,
            }}>
              {saving ? '⏳ Sauvegarde…' : '💾 Sauvegarder'}
            </button>
            <a href="/" target="_blank" style={{
              fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 900,
              color: '#7C3AED', textDecoration: 'none', padding: '7px 16px', borderRadius: 10,
              background: 'white', border: '2.5px solid #EDE9FE', boxShadow: '2px 2px 0 #C4B5FD',
            }}>
              👁 Dashboard
            </a>
            <button onClick={logout} style={{
              fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 700,
              background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.2)',
              borderRadius: 10, padding: '7px 14px', color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
            }}>
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 32px' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          {([
            ['projects', `📁 Projets (${data.projects.length})`],
            ['todos',    `✅ Quêtes (${data.weeklyTodos.length})`],
            ['comments', `💬 Échanges (${comments.length})`],
          ] as const).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)} style={{
              fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '0.82rem',
              padding: '8px 18px', borderRadius: 10, cursor: 'pointer',
              background: tab === t ? '#7C3AED' : 'white',
              border: `2.5px solid ${tab === t ? '#5B21B6' : '#1E1B4B'}`,
              color: tab === t ? 'white' : '#1E1B4B',
              boxShadow: tab === t ? '3px 3px 0 #5B21B6' : '3px 3px 0 #1E1B4B',
            }}>
              {label}
            </button>
          ))}
        </div>

        {/* ═══ PROJECTS TAB ═══════════════════════════════════ */}
        {tab === 'projects' && (
          <div>
            {/* Add project button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button onClick={() => setShowAddProject(v => !v)} style={{
                fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '0.85rem',
                background: showAddProject ? '#EDE9FE' : '#7C3AED',
                border: `2.5px solid ${showAddProject ? '#7C3AED' : '#5B21B6'}`,
                borderRadius: 12, padding: '9px 20px',
                color: showAddProject ? '#7C3AED' : 'white', cursor: 'pointer',
                boxShadow: showAddProject ? '3px 3px 0 #7C3AED' : '3px 3px 0 #5B21B6',
              }}>
                {showAddProject ? '✕ Annuler' : '+ Nouveau projet'}
              </button>
            </div>

            {/* Add project form */}
            {showAddProject && (
              <div style={{
                background: 'white', border: '2.5px solid #7C3AED', borderRadius: 18,
                padding: '24px', marginBottom: 20, boxShadow: '4px 4px 0 #7C3AED',
              }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 900,
                  color: '#7C3AED', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>✨</span> Nouveau projet
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <FLabel>Nom du projet *</FLabel>
                    <FInput
                      value={newProject.name}
                      onChange={v => setNewProject(p => ({ ...p, name: v }))}
                      placeholder="Ex: Interface CHORUS"
                    />
                  </div>
                  <div>
                    <FLabel>Statut</FLabel>
                    <select
                      value={newProject.status}
                      onChange={e => setNewProject(p => ({ ...p, status: e.target.value as Status }))}
                      style={selectStyle}>
                      {STATUS_OPTIONS.map(o => (
                        <option key={o} value={o}>{STATUS_META[o].icon} {STATUS_META[o].label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <FLabel>En ce moment (affiché manager)</FLabel>
                    <FInput
                      value={newProject.currentAction}
                      onChange={v => setNewProject(p => ({ ...p, currentAction: v }))}
                      placeholder="Ex: Développement en cours…"
                    />
                  </div>
                  <div>
                    <FLabel>Prochaine étape</FLabel>
                    <FInput
                      value={newProject.nextStep}
                      onChange={v => setNewProject(p => ({ ...p, nextStep: v }))}
                      placeholder="Ex: Finaliser les tests…"
                    />
                  </div>
                </div>
                <div style={{ marginBottom: 18 }}>
                  <FLabel>Avancement initial : {newProject.progress}%</FLabel>
                  <input
                    type="range" min={0} max={100} value={newProject.progress}
                    onChange={e => setNewProject(p => ({ ...p, progress: Number(e.target.value) }))}
                    style={{ width: '100%', accentColor: '#7C3AED', marginTop: 6, height: 6 }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button onClick={() => { setShowAddProject(false); setNewProject({ ...EMPTY_PROJECT }); }} style={{
                    fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '0.82rem',
                    background: 'white', border: '2.5px solid #E5E7EB', borderRadius: 10,
                    padding: '8px 18px', color: '#6B7280', cursor: 'pointer',
                    boxShadow: '2px 2px 0 #E5E7EB',
                  }}>
                    Annuler
                  </button>
                  <button onClick={addProject} disabled={!newProject.name.trim()} style={{
                    fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '0.82rem',
                    background: newProject.name.trim() ? '#7C3AED' : '#E5E7EB',
                    border: `2.5px solid ${newProject.name.trim() ? '#5B21B6' : '#D1D5DB'}`,
                    borderRadius: 10, padding: '8px 20px',
                    color: newProject.name.trim() ? 'white' : '#9CA3AF',
                    cursor: newProject.name.trim() ? 'pointer' : 'not-allowed',
                    boxShadow: newProject.name.trim() ? '3px 3px 0 #5B21B6' : 'none',
                  }}>
                    ✨ Créer le projet
                  </button>
                </div>
              </div>
            )}

            {/* Project list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sorted.map((p) => {
                const sm = STATUS_META[p.status];
                return (
                  <div key={p.id} style={{
                    background: 'white',
                    border: `2.5px solid ${expandedId === p.id ? sm.color : '#1E1B4B'}`,
                    borderRadius: 16, overflow: 'hidden',
                    boxShadow: expandedId === p.id ? `4px 4px 0 ${sm.color}` : '3px 3px 0 #1E1B4B',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}>

                    {/* Row header */}
                    <div
                      onClick={() => setExpandedId(e => e === p.id ? null : p.id)}
                      style={{ display: 'grid', gridTemplateColumns: '46px 1fr auto auto auto', gap: 12,
                        padding: '12px 18px', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}>

                      {/* Priority */}
                      <div style={{
                        width: 40, height: 40, borderRadius: 12,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 900,
                        background: p.priority <= 3 ? '#EDE9FE' : '#F3F4F6',
                        border: `2px solid ${p.priority <= 3 ? '#7C3AED' : '#9CA3AF'}`,
                        color: p.priority <= 3 ? '#7C3AED' : '#6B7280',
                        boxShadow: p.priority <= 3 ? '2px 2px 0 #7C3AED' : '2px 2px 0 #9CA3AF',
                      }}>
                        #{p.priority}
                      </div>

                      {/* Name + status */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '0.9rem' }}>
                          {p.name}
                        </span>
                        <span style={{
                          fontSize: '0.65rem', padding: '3px 9px', borderRadius: 8, fontWeight: 900,
                          background: sm.bg, color: sm.color, border: `2px solid ${sm.color}`,
                          fontFamily: 'var(--font-display)',
                        }}>
                          {sm.icon} {sm.label}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 90, height: 10, background: '#F3F4F6', borderRadius: 99,
                          overflow: 'hidden', border: '2px solid #E5E7EB' }}>
                          <div style={{ height: '100%', width: `${p.progress}%`, borderRadius: 99,
                            background: p.progress >= 70
                              ? 'linear-gradient(90deg, #059669, #34D399)'
                              : p.progress >= 40
                                ? 'linear-gradient(90deg, #D97706, #FBBF24)'
                                : 'linear-gradient(90deg, #DC2626, #F87171)' }} />
                        </div>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 900,
                          color: '#4B5563', minWidth: 36 }}>
                          {p.progress}%
                        </span>
                      </div>

                      {/* Move buttons */}
                      <div style={{ display: 'flex', gap: 5 }} onClick={e => e.stopPropagation()}>
                        <SmallBtn onClick={() => moveProject(p.id, -1)}>↑</SmallBtn>
                        <SmallBtn onClick={() => moveProject(p.id, 1)}>↓</SmallBtn>
                      </div>

                      {/* Delete */}
                      <div onClick={e => e.stopPropagation()}>
                        <button onClick={() => deleteProject(p.id)} style={{
                          background: '#FEE2E2', border: '2px solid #DC2626', borderRadius: 8,
                          padding: '4px 10px', color: '#DC2626', cursor: 'pointer',
                          fontFamily: 'var(--font-display)', fontSize: '0.7rem', fontWeight: 900,
                          boxShadow: '2px 2px 0 #DC2626',
                        }}>
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Expanded editor */}
                    {expandedId === p.id && (
                      <div style={{ borderTop: `2px solid ${sm.color}`, padding: '22px 20px',
                        background: sm.bg + '33' }}>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                          <div>
                            <FLabel>Nom du projet</FLabel>
                            <FInput value={p.name} onChange={v => upProject(p.id, { name: v })} />
                          </div>
                          <div>
                            <FLabel>Statut</FLabel>
                            <select value={p.status}
                              onChange={e => upProject(p.id, { status: e.target.value as Status })}
                              style={selectStyle}>
                              {STATUS_OPTIONS.map(o => (
                                <option key={o} value={o}>{STATUS_META[o].icon} {STATUS_META[o].label}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                          <div>
                            <FLabel>En ce moment (affiché manager)</FLabel>
                            <FInput value={p.currentAction} onChange={v => upProject(p.id, { currentAction: v })} />
                          </div>
                          <div>
                            <FLabel>Prochaine étape</FLabel>
                            <FInput value={p.nextStep} onChange={v => upProject(p.id, { nextStep: v })} />
                          </div>
                        </div>

                        <div style={{ marginBottom: 14 }}>
                          <FLabel>Avancement : {p.progress}%</FLabel>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <input
                              type="range" min={0} max={100} value={p.progress}
                              onChange={e => upProject(p.id, { progress: Number(e.target.value) })}
                              style={{ flex: 1, accentColor: sm.color, height: 6 }}
                            />
                            <div style={{ width: 70, height: 10, background: '#F3F4F6', borderRadius: 99,
                              overflow: 'hidden', border: '2px solid #E5E7EB' }}>
                              <div style={{ height: '100%', width: `${p.progress}%`, borderRadius: 99,
                                background: p.progress >= 70
                                  ? 'linear-gradient(90deg, #059669, #34D399)'
                                  : p.progress >= 40
                                    ? 'linear-gradient(90deg, #D97706, #FBBF24)'
                                    : 'linear-gradient(90deg, #DC2626, #F87171)' }} />
                            </div>
                          </div>
                        </div>

                        <div style={{ marginBottom: 16 }}>
                          <FLabel>Notes internes (non visibles sur le dashboard)</FLabel>
                          <textarea
                            value={p.notes ?? ''}
                            onChange={e => upProject(p.id, { notes: e.target.value })}
                            rows={2}
                            placeholder="Notes admin…"
                            style={{ ...inputStyle, resize: 'vertical', width: '100%' }}
                          />
                        </div>

                        <FLabel>Tâches · {p.tasks.filter(t => t.done).length}/{p.tasks.length} complétées</FLabel>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                          {p.tasks.map(t => (
                            <div key={t.id} style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              background: 'white',
                              border: `2px solid ${t.done ? '#059669' : '#E5E7EB'}`,
                              borderRadius: 10, padding: '8px 12px',
                              boxShadow: t.done ? '2px 2px 0 #059669' : '1px 1px 0 #E5E7EB',
                            }}>
                              <input type="checkbox" checked={t.done}
                                onChange={() => toggleTask(p.id, t.id)}
                                style={{ accentColor: '#059669', width: 16, height: 16 }} />
                              <span style={{ flex: 1, fontSize: '0.82rem',
                                textDecoration: t.done ? 'line-through' : 'none',
                                color: t.done ? '#9CA3AF' : '#374151',
                                fontWeight: t.done ? 400 : 500 }}>
                                {t.label}
                              </span>
                              <button onClick={() => removeTask(p.id, t.id)} style={{
                                background: 'none', border: 'none', color: '#DC2626',
                                cursor: 'pointer', fontSize: '0.8rem', opacity: 0.7,
                                fontWeight: 900, padding: '2px 6px',
                              }}>✕</button>
                            </div>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input
                            value={newTaskLabel}
                            onChange={e => setNewTaskLabel(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addTask(p.id)}
                            placeholder="Nouvelle tâche… (Entrée)"
                            style={{ ...inputStyle, flex: 1 }}
                          />
                          <button onClick={() => addTask(p.id)} style={{
                            fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '0.78rem',
                            background: '#EDE9FE', border: '2px solid #7C3AED', borderRadius: 10,
                            padding: '7px 16px', color: '#7C3AED', cursor: 'pointer',
                            boxShadow: '2px 2px 0 #7C3AED',
                          }}>
                            + Ajouter
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ TODOS TAB ══════════════════════════════════════ */}
        {tab === 'todos' && (
          <div style={{ maxWidth: 640 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 14 }}>
              {data.weeklyTodos.map(t => (
                <div key={t.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: 'white',
                  border: `2.5px solid ${t.done ? '#059669' : '#1E1B4B'}`,
                  borderRadius: 12, padding: '11px 16px',
                  boxShadow: t.done ? '3px 3px 0 #059669' : '3px 3px 0 #1E1B4B',
                }}>
                  <input type="checkbox" checked={t.done} onChange={() => toggleTodo(t.id)}
                    style={{ accentColor: '#059669', width: 18, height: 18 }} />
                  <span style={{ flex: 1, fontSize: '0.88rem', fontWeight: t.done ? 400 : 600,
                    textDecoration: t.done ? 'line-through' : 'none',
                    color: t.done ? '#9CA3AF' : '#1E1B4B' }}>
                    {t.label}
                  </span>
                  <button onClick={() => removeTodo(t.id)} style={{
                    background: 'none', border: 'none', color: '#DC2626',
                    cursor: 'pointer', fontSize: '0.8rem', fontWeight: 900, opacity: 0.7,
                  }}>✕</button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={newTodoLabel}
                onChange={e => setNewTodoLabel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTodo()}
                placeholder="Nouvelle quête de la semaine… (Entrée)"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button onClick={addTodo} style={{
                fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '0.82rem',
                background: '#7C3AED', border: '2.5px solid #5B21B6', borderRadius: 10,
                padding: '9px 20px', color: 'white', cursor: 'pointer',
                boxShadow: '3px 3px 0 #5B21B6',
              }}>
                + Ajouter
              </button>
            </div>
          </div>
        )}

        {/* ═══ COMMENTS TAB ═══════════════════════════════════ */}
        {tab === 'comments' && (
          <div style={{ maxWidth: 780 }}>
            {comments.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>💬</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 700, color: '#9CA3AF' }}>
                  Aucun échange pour l'instant.
                </div>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {comments.map(c => {
                const isM = c.author === 'manager';
                return (
                  <div key={c.id} style={{
                    display: 'flex', gap: 14, background: 'white',
                    border: `2.5px solid ${isM ? '#2563EB' : '#059669'}`,
                    borderRadius: 14, padding: '14px 18px',
                    boxShadow: `3px 3px 0 ${isM ? '#1D4ED8' : '#047857'}`,
                    alignItems: 'flex-start',
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: isM ? '#DBEAFE' : '#D1FAE5',
                      border: `2px solid ${isM ? '#2563EB' : '#059669'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
                    }}>
                      {isM ? '👔' : '💻'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '0.82rem',
                          color: isM ? '#2563EB' : '#059669' }}>
                          {isM ? 'Manager' : 'Valentin'}
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: '#9CA3AF',
                          background: '#F3F4F6', borderRadius: 6, padding: '2px 7px' }}>
                          Projet : {c.projectId}
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: '#9CA3AF' }}>
                          {new Date(c.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.87rem', color: '#374151', lineHeight: 1.5 }}>
                        {c.text}
                      </div>
                    </div>
                    <button onClick={() => deleteComment(c.id)} style={{
                      background: '#FEE2E2', border: '2px solid #DC2626', borderRadius: 8,
                      padding: '5px 10px', color: '#DC2626', cursor: 'pointer',
                      fontFamily: 'var(--font-display)', fontSize: '0.72rem', fontWeight: 900,
                      boxShadow: '2px 2px 0 #DC2626', flexShrink: 0,
                    }}>
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

/* ─── Shared styles ──────────────────────────────────────────── */
const inputStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)', fontSize: '0.84rem',
  background: 'white', border: '2px solid #C4B5FD',
  borderRadius: 10, padding: '8px 12px', color: '#1E1B4B', outline: 'none',
  boxShadow: '2px 2px 0 #C4B5FD',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle, width: '100%', cursor: 'pointer',
};

function FLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', fontWeight: 900,
      textTransform: 'uppercase', letterSpacing: '0.07em', color: '#6B7280', marginBottom: 6 }}>
      {children}
    </div>
  );
}

function FInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ ...inputStyle, width: '100%' }}
    />
  );
}

function SmallBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      fontFamily: 'var(--font-display)', fontSize: '0.78rem', fontWeight: 900,
      background: 'white', border: '2px solid #1E1B4B', borderRadius: 8,
      padding: '5px 10px', cursor: 'pointer', color: '#1E1B4B',
      boxShadow: '2px 2px 0 #1E1B4B',
    }}>
      {children}
    </button>
  );
}
