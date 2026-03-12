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

  const [selectedId, setSelectedId] = useState<string>('');
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
          document.documentElement.style.setProperty('--accent-light', data.accentColor + '22');
          document.documentElement.style.setProperty('--accent-border', data.accentColor + '66');
        }
        setTeamName(data.teamName ?? slug);
        setHasTeamPassword(data.hasTeamPassword ?? false);
        const list: MemberInfo[] = data.members ?? [];
        setMembers(list);
        if (list.length > 0) setSelectedId(list[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  const selected = members.find(m => m.id === selectedId) ?? null;
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

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px', borderRadius: 11,
    border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)',
    fontSize: '0.9rem', outline: 'none', transition: 'border-color 0.15s', boxSizing: 'border-box',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: 'none', cursor: 'pointer',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.5' stroke-linecap='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
    paddingRight: 36,
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div
      className="dot-grid"
      style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--bg)', position: 'relative' }}
    >
      {/* Background glow */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 80% 55% at 50% -5%, color-mix(in srgb, var(--accent) 8%, transparent), transparent)',
      }} />

      <div className="w-full relative" style={{ maxWidth: 400, zIndex: 1 }}>
        {/* Logo */}
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
            padding: '4px 14px', borderRadius: 'var(--r-full)',
            background: 'var(--accent-light)', border: '1px solid var(--accent-border)',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent)' }}>
              {teamName || slug}
            </span>
          </div>
        </div>

        {/* Login card */}
        <div
          className="slide-up stagger-1"
          style={{
            background: 'var(--surface)', borderRadius: 20, padding: '28px 24px',
            border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)',
            borderTop: '3px solid var(--accent)',
          }}
        >
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', marginBottom: 4 }}>
            Connexion
          </h2>
          <p style={{ fontSize: '0.79rem', color: 'var(--text-3)', marginBottom: 22 }}>
            Identifiez-vous pour accéder à l&apos;espace {teamName || slug}.
          </p>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Member selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                Utilisateur
              </label>

              {!useCustom ? (
                <>
                  {members.length > 0 ? (
                    <select
                      value={selectedId}
                      onChange={e => { setSelectedId(e.target.value); setMemberPassword(''); setError(''); }}
                      style={selectStyle}
                    >
                      {members.map(m => (
                        <option key={m.id} value={m.id}>{m.name}{m.hasPassword ? ' 🔒' : ''}</option>
                      ))}
                    </select>
                  ) : (
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', padding: '8px 0' }}>
                      Aucun compte configuré.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => { setUseCustom(true); setMemberPassword(''); setError(''); }}
                    style={{
                      marginTop: 8, fontSize: '0.75rem', color: 'var(--accent)',
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline',
                    }}
                  >
                    Autre nom…
                  </button>
                </>
              ) : (
                <>
                  <input
                    required autoFocus
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    placeholder="Votre nom complet"
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  />
                  {members.length > 0 && (
                    <button
                      type="button"
                      onClick={() => { setUseCustom(false); setError(''); }}
                      style={{
                        marginTop: 8, fontSize: '0.75rem', color: 'var(--accent)',
                        background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline',
                      }}
                    >
                      ← Choisir dans la liste
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Member password */}
            {needsMemberPassword && (
              <div>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                  Mot de passe utilisateur
                </label>
                <input
                  required
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

            {/* Team password */}
            {hasTeamPassword && (
              <div>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                  Mot de passe société
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
              style={{ width: '100%', padding: '13px 0', fontSize: '0.9rem', justifyContent: 'center', borderRadius: 12, marginTop: 4 }}
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
