'use client';
import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function JoinPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsPassword, setNeedsPassword] = useState<boolean | null>(null);

  useState(() => {
    fetch(`/api/teams/${slug}`)
      .then(r => r.json())
      .then(({ team }) => {
        if (team?.accentColor) {
          document.documentElement.style.setProperty('--accent', team.accentColor);
        }
        setNeedsPassword(team?.hasPassword ?? false);
      })
      .catch(() => setNeedsPassword(false));
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/teams/${slug}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberName: name.trim(), password: password || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Erreur'); return; }
      router.push(`/team/${slug}`);
    } catch {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: 11,
    border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)',
    fontSize: '0.9rem', outline: 'none', transition: 'border-color 0.15s',
  };

  if (needsPassword === null) {
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
      {/* Ambient */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 80% 55% at 50% -5%, color-mix(in srgb, var(--accent) 8%, transparent), transparent)',
      }} />

      <div className="w-full relative" style={{ maxWidth: 360, zIndex: 1 }}>

        {/* Wordmark */}
        <div className="slide-up" style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 7, marginBottom: 20 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--accent)',
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
              {slug}
            </span>
          </div>
        </div>

        {/* Card */}
        <div
          className="slide-up stagger-1"
          style={{
            background: 'var(--surface)', borderRadius: 20, padding: '28px',
            border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)',
            borderTop: '3px solid var(--accent)',
          }}
        >
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', marginBottom: 5 }}>
            Rejoindre l&apos;équipe
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginBottom: 22 }}>
            Aucun compte requis — identifiez-vous simplement.
          </p>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                Votre nom
              </label>
              <input
                required value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Marie Dupont"
                autoFocus
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>

            {needsPassword && (
              <div>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                  Mot de passe de l&apos;équipe
                </label>
                <input
                  required type="password" value={password}
                  onChange={e => setPassword(e.target.value)}
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
              disabled={loading || !name.trim()}
              className="btn-primary"
              style={{ width: '100%', padding: '12px 0', fontSize: '0.9rem', justifyContent: 'center', borderRadius: 12, marginTop: 4 }}
            >
              {loading ? (
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
