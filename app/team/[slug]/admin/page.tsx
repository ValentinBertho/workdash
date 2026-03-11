'use client';
import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { WorkflowStep, TeamMember, MemberRole } from '@/types';

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
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [teamName, setTeamName] = useState('');
  const [accentColor, setAccentColor] = useState('#4f46e5');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`/api/teams/${slug}/steps`).then(r => r.json()),
      fetch(`/api/teams/${slug}/members`).then(r => r.json()),
      fetch(`/api/teams/${slug}`).then(r => r.json()),
    ]).then(([s, m, t]) => {
      setSteps(s.steps ?? []);
      setMembers(m.members ?? []);
      setTeamName(t.team?.name ?? '');
      setAccentColor(t.team?.accentColor ?? '#4f46e5');
    }).finally(() => setLoading(false));
  }, [slug]);

  const flash = (msg: string) => { setSaved(msg); setTimeout(() => setSaved(''), 2000); };

  // Steps
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

  // Members
  const addMember = async () => {
    const name = prompt('Nom du membre');
    if (!name?.trim()) return;
    const res = await fetch(`/api/teams/${slug}/members`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), role: 'operator' }),
    });
    const data = await res.json();
    if (res.ok) { setMembers(prev => [...prev, data.member]); flash('Membre ajouté'); }
  };

  const updateMember = async (id: string, updates: Partial<TeamMember>) => {
    await fetch(`/api/teams/${slug}/members/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    setMembers(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    flash('Membre mis à jour');
  };

  const deleteMember = async (id: string) => {
    if (!confirm('Supprimer ce membre ?')) return;
    await fetch(`/api/teams/${slug}/members/${id}`, { method: 'DELETE' });
    setMembers(prev => prev.filter(m => m.id !== id));
    flash('Membre supprimé');
  };

  // Settings
  const saveSettings = async () => {
    await fetch(`/api/teams/${slug}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: teamName, accentColor, password: newPassword || undefined }),
    });
    setNewPassword('');
    flash('Paramètres sauvegardés');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-sm" style={{ color: 'var(--text-3)' }}>Chargement…</p></div>;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ borderTop: '3px solid var(--accent)' }} />
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', gap: 8, height: 52 }}>
          <Link href={`/team/${slug}`} className="text-sm" style={{ color: 'var(--text-3)', textDecoration: 'none' }}>← {slug}</Link>
          <span style={{ color: 'var(--text-3)' }}>/</span>
          <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Admin</span>
          <div style={{ flex: 1 }} />
          {saved && <span className="text-xs font-medium text-green-600">{saved}</span>}
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>
        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl inline-flex" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {(['steps', 'members', 'settings'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ background: tab === t ? 'var(--accent)' : 'transparent', color: tab === t ? 'white' : 'var(--text-3)' }}>
              {t === 'steps' ? 'Étapes' : t === 'members' ? 'Membres' : 'Paramètres'}
            </button>
          ))}
        </div>

        {/* Steps */}
        {tab === 'steps' && (
          <Section title="Workflow — étapes" action={<Btn onClick={addStep}>+ Ajouter</Btn>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {steps.map((s, i) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {COLORS.map(c => (
                      <button key={c} onClick={() => updateStep(s.id, { color: c })}
                        style={{ width: 16, height: 16, borderRadius: '50%', background: c, border: s.color === c ? '2px solid var(--text)' : '2px solid transparent', cursor: 'pointer' }} />
                    ))}
                  </div>
                  <span className="step-dot" style={{ background: s.color }} />
                  <input
                    value={s.name}
                    onChange={e => setSteps(prev => prev.map(x => x.id === s.id ? { ...x, name: e.target.value } : x))}
                    onBlur={e => updateStep(s.id, { name: e.target.value })}
                    className="flex-1 text-sm font-medium outline-none bg-transparent"
                    style={{ color: 'var(--text)' }}
                  />
                  <span className="text-xs" style={{ color: 'var(--text-3)' }}>#{i + 1}</span>
                  <button onClick={() => deleteStep(s.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}>×</button>
                </div>
              ))}
              {steps.length === 0 && <p className="text-sm text-center py-6" style={{ color: 'var(--text-3)' }}>Aucune étape. Cliquez sur "+ Ajouter" pour commencer.</p>}
            </div>
          </Section>
        )}

        {/* Members */}
        {tab === 'members' && (
          <Section title="Membres de l'équipe" action={<Btn onClick={addMember}>+ Ajouter</Btn>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {members.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
                    {m.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>{m.name}</p>
                  </div>
                  <select
                    value={m.role}
                    onChange={e => updateMember(m.id, { role: e.target.value as MemberRole })}
                    className="text-xs border rounded-lg px-2 py-1 outline-none"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }}
                  >
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'var(--text-3)' }}>
                    <input type="checkbox" checked={m.canComment} onChange={e => updateMember(m.id, { canComment: e.target.checked })} className="accent-[var(--accent)]" />
                    Commenter
                  </label>
                  <button onClick={() => deleteMember(m.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}>×</button>
                </div>
              ))}
            </div>
            <div className="mt-4 p-4 rounded-xl" style={{ background: 'var(--accent-light)', border: '1px solid var(--accent-border)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--accent)' }}>Lien d&apos;invitation</p>
              <p className="font-mono text-xs" style={{ color: 'var(--text-2)', wordBreak: 'break-all' }}>
                {typeof window !== 'undefined' ? `${window.location.origin}/team/${slug}` : `/team/${slug}`}
              </p>
            </div>
          </Section>
        )}

        {/* Settings */}
        {tab === 'settings' && (
          <Section title="Paramètres de l'équipe" action={<Btn onClick={saveSettings}>Enregistrer</Btn>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-3)' }}>Nom de l&apos;équipe</label>
                <input value={teamName} onChange={e => setTeamName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>Couleur d&apos;accent</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setAccentColor(c)}
                      style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: accentColor === c ? '3px solid var(--text)' : '3px solid transparent', cursor: 'pointer', transition: 'transform 0.15s', transform: accentColor === c ? 'scale(1.2)' : 'scale(1)' }} />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-3)' }}>
                  Nouveau mot de passe <span style={{ opacity: 0.5 }}>(laisser vide pour ne pas changer)</span>
                </label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }} />
              </div>
            </div>
          </Section>
        )}
      </main>
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px' }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold" style={{ color: 'var(--text)' }}>{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function Btn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
      style={{ background: 'var(--accent)' }}>
      {children}
    </button>
  );
}
