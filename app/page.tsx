'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const features = [
  { icon: '⚡', label: 'Sans inscription' },
  { icon: '🔒', label: 'Données isolées' },
  { icon: '🧩', label: 'Workflow sur mesure' },
];

export default function LandingPage() {
  const router = useRouter();
  const [slug, setSlug] = useState('');

  const join = (e: React.FormEvent) => {
    e.preventDefault();
    const s = slug.trim().toLowerCase();
    if (s) router.push(`/team/${s}`);
  };

  return (
    <div
      className="dot-grid min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: 'var(--bg)', position: 'relative' }}
    >
      {/* Ambient gradient */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 90% 55% at 50% -5%, color-mix(in srgb, var(--accent) 9%, transparent), transparent)',
      }} />

      <div className="w-full max-w-xs space-y-10 relative" style={{ zIndex: 1 }}>

        {/* Wordmark */}
        <div className="text-center slide-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 16,
            background: 'var(--accent)',
            boxShadow: '0 8px 24px color-mix(in srgb, var(--accent) 38%, transparent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'floatUp 4s ease-in-out infinite',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M3 12h12M3 18h7" />
            </svg>
          </div>
          <div>
            <h1
              style={{
                fontSize: '2rem', fontWeight: 800,
                letterSpacing: '-0.04em', lineHeight: 1,
                color: 'var(--text)',
              }}
            >
              Work<span style={{ color: 'var(--accent)' }}>Dash</span>
            </h1>
            <p style={{ marginTop: 10, color: 'var(--text-3)', fontSize: '0.875rem', lineHeight: 1.65 }}>
              Gérez vos dossiers en équipe.<br />
              <span style={{ color: 'var(--text-4)' }}>Aucun compte requis.</span>
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="slide-up stagger-1" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Link
            href="/create"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '13px 20px', borderRadius: 14, textDecoration: 'none',
              background: 'var(--accent)', color: 'white',
              fontSize: '0.875rem', fontWeight: 700, letterSpacing: '-0.02em',
              boxShadow: '0 4px 20px color-mix(in srgb, var(--accent) 32%, transparent)',
              transition: 'opacity 0.15s, transform 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Créer une équipe
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-4)', whiteSpace: 'nowrap' }}>ou rejoindre</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <form onSubmit={join}>
            <div style={{
              display: 'flex', overflow: 'hidden', borderRadius: 12,
              border: '1px solid var(--border-2)',
              background: 'var(--surface)',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <input
                value={slug}
                onChange={e => setSlug(e.target.value)}
                placeholder="lien-de-votre-equipe"
                style={{
                  flex: 1, padding: '12px 14px',
                  background: 'transparent', color: 'var(--text)',
                  fontFamily: 'var(--font-mono)', fontSize: '0.78rem',
                  border: 'none', outline: 'none',
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '0 16px',
                  borderLeft: '1px solid var(--border)',
                  background: 'var(--surface-2)',
                  color: 'var(--accent)', fontSize: '0.8rem', fontWeight: 600,
                  border: 'none', borderLeft: '1px solid var(--border)',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-2)')}
              >
                Accéder →
              </button>
            </div>
          </form>
        </div>

        {/* Feature pills */}
        <div className="slide-up stagger-2" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}>
          {features.map(f => (
            <span
              key={f.label}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: '0.72rem', padding: '5px 12px', borderRadius: 'var(--r-full)',
                background: 'var(--surface)', border: '1px solid var(--border)',
                color: 'var(--text-3)', boxShadow: 'var(--shadow-xs)',
              }}
            >
              <span style={{ fontSize: '0.85rem' }}>{f.icon}</span>
              {f.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
