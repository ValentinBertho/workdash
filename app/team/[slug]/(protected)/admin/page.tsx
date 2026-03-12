'use client';
import { useState, useEffect, use } from 'react';
import { WorkflowStep, TeamMember, MemberRole } from '@/types';
import { Sidebar } from '@/app/components/Sidebar';

type MemberWithPassword = TeamMember & { hasPassword: boolean };

const COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#f97316', '#6b7280'];
const ROLES: { value: MemberRole; label: string; desc: string }[] = [
  { value: 'admin', label: 'Admin', desc: 'Tout gérer' },
  { value: 'operator', label: 'Opérateur', desc: 'Créer et modifier' },
  { value: 'viewer', label: 'Viewer', desc: 'Lecture seule' },
];

export default function AdminPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [tab, setTab] = useState<'steps' | 'members' | 'settings'>('steps');
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [members, setMembers] = useState<MemberWithPassword[]>([]);
  const [editingPasswordId, setEditingPasswordId] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [teamName, setTeamName] = useState('');
  const [accentColor, setAccentColor] = useState('#4f46e5');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`/api/teams/${slug}/steps`).then(r => r.json()),
      fetch(`/api/teams/${slug}/members`).then(r => r.json()),
      fetch(`/api/teams/${slug}`).then(r => r.json()),
    ]).then(([s, m, t]) => {
      setSteps(s.steps ?? []);
      setMembers(m.members ?? []);
      setTeamName(t.team?.name ?? '');
      const color = t.team?.accentColor ?? '#4f46e5';
      setAccentColor(color);
      document.documentElement.style.setProperty('--accent', color);
    }).finally(() => setLoading(false));
  }, [slug]);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const addStep = async () => {
    const name = prompt('Nom de l\'étape');
    if (!name?.trim()) return;
    const res = await fetch(`/api/teams/${slug}/steps`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), color: '#6b7280', sortOrder: steps.length }),
    });
    const data = await res.json();
    if (res.ok) { setSteps(prev => [...prev, data.step]); flash('Étape ajoutée'); }
  };

  const updateStep = async (id: string, updates: Partial<WorkflowStep>) => {
    await fetch(`/api/teams/${slug}/steps/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    setSteps(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const deleteStep = async (id: string) => {
    if (!confirm('Supprimer cette étape ? Les dossiers liés perdront leur étape.')) return;
    await fetch(`/api/teams/${slug}/steps/${id}`, { method: 'DELETE' });
    setSteps(prev => prev.filter(s => s.id !== id));
    flash('Étape supprimée');
  };

  const addMember = async () => {
    const name = prompt('Nom du membre');
    if (!name?.trim()) return;
    const password = prompt('Mot de passe (optionnel — laisser vide pour aucun)');
    const res = await fetch(`/api/teams/${slug}/members`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), role: 'operator', password: password?.trim() || undefined }),
    });
    const data = await res.json();
    if (res.ok) { setMembers(prev => [...prev, data.member]); flash('Membre ajouté'); }
  };

  const savePassword = async (id: string) => {
    const pw = passwordInput.trim();
    const res = await fetch(`/api/teams/${slug}/members/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw || null }),
    });
    if (res.ok) {
      setMembers(prev => prev.map(m => m.id === id ? { ...m, hasPassword: !!pw } : m));
      setEditingPasswordId(null);
      setPasswordInput('');
      flash(pw ? 'Mot de passe défini' : 'Mot de passe supprimé');
    }
  };

  const updateMember = async (id: string, updates: Partial<MemberWithPassword>) => {
    await fetch(`/api/teams/${slug}/members/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    setMembers(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    flash('Mis à jour');
  };

  const deleteMember = async (id: string) => {
    if (!confirm('Supprimer ce membre ?')) return;
    await fetch(`/api/teams/${slug}/members/${id}`, { method: 'DELETE' });
    setMembers(prev => prev.filter(m => m.id !== id));
    flash('Membre supprimé');
  };

  const saveSettings = async () => {
    document.documentElement.style.setProperty('--accent', accentColor);
    await fetch(`/api/teams/${slug}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: teamName, accentColor, password: newPassword || undefined }),
    });
    setNewPassword('');
    flash('Paramètres sauvegardés');
  };

  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 10,
    border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)',
    fontSize: '0.85rem', outline: 'none', transition: 'border-color 0.15s',
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)' }}>
        <Sidebar slug={slug} active="admin" members={[]} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      <Sidebar slug={slug} active="admin" members={members} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Top bar */}
        <header style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '0 20px', height: 52, flexShrink: 0,
          background: 'var(--surface)', borderBottom: '1px solid var(--border)', zIndex: 30,
        }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
            Administration
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>·</span>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>{teamName || slug}</span>
          <div style={{ flex: 1 }} />
          {toast && (
            <span className="fade-in" style={{
              fontSize: '0.75rem', fontWeight: 600, color: '#16a34a',
              background: '#f0fdf4', padding: '4px 10px', borderRadius: 8, border: '1px solid #bbf7d0',
            }}>
              ✓ {toast}
            </span>
          )}
        </header>

        {/* Content */}
        <main style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>

            {/* Tab bar */}
            <div
              className="slide-up"
              style={{
                display: 'inline-flex', marginBottom: 20,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 12, padding: 4, gap: 2,
                boxShadow: 'var(--shadow-xs)',
              }}
            >
              {(['steps', 'members', 'settings'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    padding: '7px 16px', borderRadius: 9, border: 'none',
                    background: tab === t ? 'var(--accent)' : 'transparent',
                    color: tab === t ? 'white' : 'var(--text-3)',
                    fontSize: '0.8rem', fontWeight: tab === t ? 600 : 400,
                    transition: 'all 0.18s',
                    letterSpacing: tab === t ? '-0.01em' : '0',
                  }}
                >
                  {t === 'steps' ? 'Étapes' : t === 'members' ? 'Membres' : 'Paramètres'}
                </button>
              ))}
            </div>

            {/* Steps */}
            {tab === 'steps' && (
              <AdminSection
                title="Workflow — étapes"
                subtitle="Définissez les étapes que traversent vos dossiers."
                action={<button onClick={addStep} className="btn-primary" style={{ padding: '6px 14px', fontSize: '0.78rem' }}>+ Ajouter</button>}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {steps.map((s, i) => (
                    <div
                      key={s.id}
                      className="slide-up"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        background: 'var(--surface-2)', border: '1px solid var(--border)',
                        borderLeft: `3px solid ${s.color}`,
                        borderRadius: 12, padding: '12px 14px',
                        transition: 'box-shadow 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-sm)')}
                      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                    >
                      {/* Color swatches */}
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 112 }}>
                        {COLORS.map(c => (
                          <button
                            key={c}
                            onClick={() => updateStep(s.id, { color: c })}
                            style={{
                              width: 14, height: 14, borderRadius: '50%', background: c,
                              border: s.color === c ? '2px solid var(--text)' : '2px solid transparent',
                              cursor: 'pointer', transition: 'transform 0.1s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.25)')}
                            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                          />
                        ))}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1 }}>
                        <span className="step-dot" style={{ background: s.color }} />
                        <input
                          value={s.name}
                          onChange={e => setSteps(prev => prev.map(x => x.id === s.id ? { ...x, name: e.target.value } : x))}
                          onBlur={e => updateStep(s.id, { name: e.target.value })}
                          style={{
                            flex: 1, fontSize: '0.88rem', fontWeight: 600, outline: 'none',
                            background: 'transparent', border: 'none', color: 'var(--text)',
                          }}
                        />
                      </div>

                      <span style={{ fontSize: '0.68rem', color: 'var(--text-4)', fontFamily: 'var(--font-mono)' }}>
                        #{i + 1}
                      </span>
                      <button
                        onClick={() => deleteStep(s.id)}
                        style={{
                          width: 24, height: 24, borderRadius: 6, border: 'none',
                          background: 'transparent', color: 'var(--text-4)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '1.1rem', transition: 'background 0.15s, color 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#dc2626'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-4)'; }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {steps.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-4)', fontSize: '0.82rem' }}>
                      Aucune étape. Cliquez sur <strong>+ Ajouter</strong> pour commencer.
                    </div>
                  )}
                </div>
              </AdminSection>
            )}

            {/* Members */}
            {tab === 'members' && (
              <AdminSection
                title="Membres de l'équipe"
                subtitle="Gérez les accès et les rôles de chaque membre."
                action={<button onClick={addMember} className="btn-primary" style={{ padding: '6px 14px', fontSize: '0.78rem' }}>+ Ajouter</button>}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {members.map(m => (
                    <div key={m.id}>
                      <div
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          background: 'var(--surface-2)', border: '1px solid var(--border)',
                          borderRadius: editingPasswordId === m.id ? '12px 12px 0 0' : 12,
                          padding: '11px 14px',
                        }}
                      >
                        <div className="avatar" style={{ width: 34, height: 34, fontSize: '0.8rem', borderRadius: 9 }}>
                          {m.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)' }}>{m.name}</p>
                          <p style={{ fontSize: '0.68rem', color: 'var(--text-4)', marginTop: 1 }}>
                            Depuis le {new Date(m.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <select
                          value={m.role}
                          onChange={e => updateMember(m.id, { role: e.target.value as MemberRole })}
                          style={{
                            padding: '5px 9px', borderRadius: 8, fontSize: '0.75rem',
                            border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
                            outline: 'none', cursor: 'pointer',
                          }}
                        >
                          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: 'var(--text-3)', cursor: 'pointer', userSelect: 'none' }}>
                          <input
                            type="checkbox" checked={m.canComment}
                            onChange={e => updateMember(m.id, { canComment: e.target.checked })}
                            style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                          />
                          Commenter
                        </label>
                        {/* Password toggle */}
                        <button
                          onClick={() => {
                            if (editingPasswordId === m.id) { setEditingPasswordId(null); setPasswordInput(''); }
                            else { setEditingPasswordId(m.id); setPasswordInput(''); }
                          }}
                          title={m.hasPassword ? 'Changer le mot de passe' : 'Définir un mot de passe'}
                          style={{
                            width: 26, height: 26, borderRadius: 7, border: 'none',
                            background: m.hasPassword ? 'var(--accent-light)' : 'transparent',
                            color: m.hasPassword ? 'var(--accent)' : 'var(--text-4)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'background 0.15s, color 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-light)'; e.currentTarget.style.color = 'var(--accent)'; }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = m.hasPassword ? 'var(--accent-light)' : 'transparent';
                            e.currentTarget.style.color = m.hasPassword ? 'var(--accent)' : 'var(--text-4)';
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteMember(m.id)}
                          style={{
                            width: 26, height: 26, borderRadius: 7, border: 'none',
                            background: 'transparent', color: 'var(--text-4)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.1rem', transition: 'background 0.15s, color 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#dc2626'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-4)'; }}
                        >
                          ×
                        </button>
                      </div>

                      {/* Inline password form */}
                      {editingPasswordId === m.id && (
                        <div style={{
                          padding: '12px 14px', background: 'var(--accent-light)',
                          border: '1px solid var(--accent-border)', borderTop: 'none',
                          borderRadius: '0 0 12px 12px',
                          display: 'flex', alignItems: 'center', gap: 8,
                        }}>
                          <input
                            autoFocus
                            type="password"
                            value={passwordInput}
                            onChange={e => setPasswordInput(e.target.value)}
                            placeholder="Nouveau mot de passe (vide = supprimer)"
                            onKeyDown={e => { if (e.key === 'Enter') savePassword(m.id); if (e.key === 'Escape') { setEditingPasswordId(null); setPasswordInput(''); } }}
                            style={{
                              flex: 1, padding: '7px 11px', borderRadius: 8,
                              border: '1px solid var(--accent-border)', background: 'var(--surface)',
                              color: 'var(--text)', fontSize: '0.82rem', outline: 'none',
                            }}
                          />
                          <button
                            onClick={() => savePassword(m.id)}
                            className="btn-primary"
                            style={{ padding: '7px 14px', fontSize: '0.78rem' }}
                          >
                            {passwordInput.trim() ? 'Définir' : 'Supprimer'}
                          </button>
                          <button
                            onClick={() => { setEditingPasswordId(null); setPasswordInput(''); }}
                            style={{
                              padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)',
                              background: 'var(--surface)', color: 'var(--text-3)', fontSize: '0.78rem',
                            }}
                          >
                            Annuler
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Invitation link */}
                <div style={{
                  marginTop: 16, padding: '14px 16px', borderRadius: 12,
                  background: 'var(--accent-light)', border: '1px solid var(--accent-border)',
                }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
                    Lien d&apos;invitation
                  </p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-2)', wordBreak: 'break-all' }}>
                    {typeof window !== 'undefined' ? `${window.location.origin}/team/${slug}` : `/team/${slug}`}
                  </p>
                </div>
              </AdminSection>
            )}

            {/* Settings */}
            {tab === 'settings' && (
              <AdminSection
                title="Paramètres de l'équipe"
                subtitle="Personnalisez l'identité visuelle et la sécurité."
                action={
                  <button onClick={saveSettings} className="btn-primary" style={{ padding: '6px 16px', fontSize: '0.78rem' }}>
                    Enregistrer
                  </button>
                }
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7 }}>
                      Nom de l&apos;équipe
                    </label>
                    <input
                      value={teamName}
                      onChange={e => setTeamName(e.target.value)}
                      style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                      onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
                      Couleur d&apos;accent
                    </label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      {COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => {
                            setAccentColor(c);
                            document.documentElement.style.setProperty('--accent', c);
                          }}
                          style={{
                            width: 34, height: 34, borderRadius: '50%', background: c,
                            border: accentColor === c ? '3px solid var(--text)' : '3px solid transparent',
                            transition: 'transform 0.15s, border-color 0.15s',
                            transform: accentColor === c ? 'scale(1.2)' : 'scale(1)',
                            boxShadow: accentColor === c ? `0 0 0 2px var(--surface), 0 0 0 4px ${c}` : 'none',
                            cursor: 'pointer',
                          }}
                        />
                      ))}
                    </div>
                    <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: accentColor, boxShadow: 'var(--shadow-sm)' }} />
                      <div>
                        <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)' }}>Aperçu</p>
                        <p style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>{accentColor}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>
                      Nouveau mot de passe
                      <span style={{ fontWeight: 400, textTransform: 'none', marginLeft: 6, color: 'var(--text-4)' }}>
                        (laisser vide pour ne pas modifier)
                      </span>
                    </label>
                    <input
                      type="password" value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                      onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                    />
                  </div>
                </div>
              </AdminSection>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function AdminSection({
  title, subtitle, action, children,
}: {
  title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div
      className="slide-up"
      style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '22px', boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <h2 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>{title}</h2>
          {subtitle && <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 3 }}>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
