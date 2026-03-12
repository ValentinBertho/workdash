'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface MemberInfo {
  id: string;
  name: string;
  hasPassword: boolean;
}

export default function JoinPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();

  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [teamName, setTeamName] = useState('');
  const [hasTeamPassword, setHasTeamPassword] = useState(false);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState<'pick' | 'login'>('pick');
  const [selected, setSelected] = useState<MemberInfo | null>(null);
  const [useCustom, setUseCustom] = useState(false);
  const [customName, setCustomName] = useState('');

  const [memberPassword, setMemberPassword] = useState('');
  const [teamPassword, setTeamPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/teams/${slug}/member-list`)
      .then(r => r.json())
      .then(data => {
        if (data.accentColor) {
          document.documentElement.style.setProperty('--accent', data.accentColor);
        }
        setTeamName(data.teamName ?? slug);
        setHasTeamPassword(data.hasTeamPassword ?? false);
        setMembers(data.members ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  const pickMember = (m: MemberInfo) => {
    setSelected(m);
    setUseCustom(false);
    setStep('login');
    setError('');
    setMemberPassword('');
  };

  const pickCustom = () => {
    setSelected(null);
    setUseCustom(true);
    setStep('login');
    setError('');
    setMemberPassword('');
  };

  const goBack = () => {
    setStep('pick');
    setError('');
  };

  const memberName = useCustom ? customName.trim() : (selected?.name ?? '');
  const needsMemberPassword = !useCustom && (selected?.hasPassword ?? false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName) return;
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`/api/teams/${slug}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberName,
          password: teamPassword || undefined,
          memberPassword: memberPassword || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Erreur'); return; }
      router.push(`/team/${slug}`);
    } catch {
      setError('Erreur réseau');
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: 11,
    border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)',
    fontSize: '0.9rem', outline: 'none', transition: 'border-color 0.15s',
  };

  const logoBlock = (
    <div className="slide-up" style={{ textAlign: 'center', marginBottom: 32 }}>
      <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 7, marginBottom: 20 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 6px 18px color-mix(in srgb, var(--accent) 35%, transparent)',
        }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M3 12h12M3 18h7" />
          </svg>
        </div>
        <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em' }}>
          Work<span style={{ color: 'var(--accent)' }}>Dash</span>
        </span>
      </Link>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 12px', borderRadius: 'var(--r-full)',
        background: 'var(--accent-light)', border: '1px solid var(--accent-border)',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent)' }}>
          {teamName || slug}
        </span>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div
      className="dot-grid min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: 'var(--bg)', position: 'relative' }}
    >
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 80% 55% at 50% -5%, color-mix(in srgb, var(--accent) 8%, transparent), transparent)',
      }} />

      <div className="w-full relative" style={{ maxWidth: 380, zIndex: 1 }}>
        {logoBlock}

        {/* Step 1 — sélectionner un membre */}
        {step === 'pick' && (
          <div
            className="slide-up stagger-1"
            style={{
              background: 'var(--surface)', borderRadius: 20, padding: '24px',
              border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)',
              borderTop: '3px solid var(--accent)',
            }}
          >
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', marginBottom: 4 }}>
              Qui êtes-vous ?
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginBottom: 18 }}>
              Sélectionnez votre compte pour accéder à l&apos;espace.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {members.map(m => (
                <button
                  key={m.id}
                  onClick={() => pickMember(m)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 14px', borderRadius: 12, border: '1px solid var(--border)',
                    background: 'var(--surface-2)', cursor: 'pointer',
                    transition: 'all 0.15s', textAlign: 'left', width: '100%',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--accent)';
                    e.currentTarget.style.background = 'var(--accent-light)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.background = 'var(--surface-2)';
                  }}
                >
                  <div className="avatar" style={{ width: 34, height: 34, fontSize: '0.85rem', borderRadius: 9, flexShrink: 0 }}>
                    {m.name.slice(0, 1).toUpperCase()}
                  </div>
                  <span style={{ flex: 1, fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)' }}>
                    {m.name}
                  </span>
                  {m.hasPassword && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  )}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              ))}

              {members.length === 0 && (
                <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', textAlign: 'center', padding: '8px 0 4px' }}>
                  Aucun compte encore créé.
                </p>
              )}

              <button
                onClick={pickCustom}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', borderRadius: 12, border: '1.5px dashed var(--border)',
                  background: 'transparent', cursor: 'pointer', transition: 'all 0.15s',
                  marginTop: 4, width: '100%',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-light)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>Autre nom…</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — connexion */}
        {step === 'login' && (
          <div
            className="slide-up stagger-1"
            style={{
              background: 'var(--surface)', borderRadius: 20, padding: '24px',
              border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)',
              borderTop: '3px solid var(--accent)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <button
                onClick={goBack}
                style={{
                  width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--surface-2)', color: 'var(--text-3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              {!useCustom && selected && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="avatar" style={{ width: 30, height: 30, fontSize: '0.78rem', borderRadius: 8 }}>
                    {selected.name.slice(0, 1).toUpperCase()}
                  </div>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>{selected.name}</span>
                </div>
              )}
              {useCustom && (
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>Nouveau participant</span>
              )}
            </div>

            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {useCustom && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                    Votre nom
                  </label>
                  <input
                    required autoFocus
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    placeholder="Marie Dupont"
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  />
                </div>
              )}

              {needsMemberPassword && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                    Mot de passe
                  </label>
                  <input
                    required autoFocus={!useCustom}
                    type="password"
                    value={memberPassword}
                    onChange={e => setMemberPassword(e.target.value)}
                    placeholder="••••••••"
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  />
                </div>
              )}

              {hasTeamPassword && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                    Mot de passe équipe
                  </label>
                  <input
                    required
                    type="password"
                    value={teamPassword}
                    onChange={e => setTeamPassword(e.target.value)}
                    placeholder="••••••••"
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  />
                </div>
              )}

              {!needsMemberPassword && !hasTeamPassword && !useCustom && (
                <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', textAlign: 'center', padding: '4px 0' }}>
                  Aucun mot de passe requis.
                </p>
              )}

              {error && (
                <div style={{
                  padding: '9px 12px', borderRadius: 9,
                  background: '#fef2f2', border: '1px solid #fca5a5',
                  fontSize: '0.78rem', color: '#dc2626', fontWeight: 500,
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !memberName}
                className="btn-primary"
                style={{ width: '100%', padding: '12px 0', fontSize: '0.9rem', justifyContent: 'center', borderRadius: 12, marginTop: 2 }}
              >
                {submitting ? (
                  <>
                    <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                    Connexion…
                  </>
                ) : (
                  <>
                    Accéder à l&apos;espace
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        <p className="slide-up stagger-2" style={{ textAlign: 'center', marginTop: 16, fontSize: '0.75rem' }}>
          <Link
            href="/"
            style={{ color: 'var(--text-3)', textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
          >
            ← Retour à l&apos;accueil
          </Link>
        </p>
      </div>
    </div>
  );
}
