'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: 'var(--bg)' }}
    >
      <div className="w-full max-w-sm space-y-10">
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-2" style={{ color: 'var(--text)' }}>
            Work<span style={{ color: 'var(--accent)' }}>Dash</span>
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>
            Gérez vos dossiers en équipe — sans compte à créer.
          </p>
        </div>

        {/* CTAs */}
        <div className="space-y-3">
          <Link
            href="/create"
            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-semibold text-white text-sm transition-opacity hover:opacity-90"
            style={{ background: 'var(--accent)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Créer une équipe
          </Link>

          <div style={{ color: 'var(--text-3)', textAlign: 'center', fontSize: '0.78rem' }}>ou</div>

          <form onSubmit={join} className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border-2)' }}>
            <input
              value={slug}
              onChange={e => setSlug(e.target.value)}
              placeholder="Entrez le lien de votre équipe…"
              className="flex-1 px-4 py-3 text-sm outline-none"
              style={{ background: 'var(--surface)', color: 'var(--text)' }}
            />
            <button
              type="submit"
              className="px-4 text-sm font-semibold"
              style={{ background: 'var(--surface-2)', color: 'var(--text-2)', borderLeft: '1px solid var(--border)' }}
            >
              Rejoindre →
            </button>
          </form>
        </div>

        <p className="text-center text-xs" style={{ color: 'var(--text-3)' }}>
          Aucun compte requis · Données privées et isolées par équipe
        </p>
      </div>
    </div>
  );
}
