'use client';
import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function JoinPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'password' | 'name'>('name');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsPassword, setNeedsPassword] = useState<boolean | null>(null);

  // Detect if team needs password on first render
  useState(() => {
    fetch(`/api/teams/${slug}`)
      .then(r => r.json())
      .then(({ team }) => {
        if (team?.hasPassword) setNeedsPassword(true);
        else setNeedsPassword(false);
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

  if (needsPassword === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>Chargement…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>
            Work<span style={{ color: 'var(--accent)' }}>Dash</span>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>
            Équipe <span className="font-mono font-semibold">{slug}</span>
          </p>
        </div>

        <div className="rounded-2xl p-6 space-y-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div>
            <h2 className="font-semibold text-base" style={{ color: 'var(--text)' }}>Rejoindre l&apos;équipe</h2>
            <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
              Aucun compte requis — identifiez-vous simplement.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-3)' }}>
                Votre nom
              </label>
              <input
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Marie Dupont"
                autoFocus
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border"
                style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }}
              />
            </div>

            {needsPassword && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-3)' }}>
                  Mot de passe de l&apos;équipe
                </label>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none border"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }}
                />
              </div>
            )}

            {error && <p className="text-xs font-medium text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full py-2.5 rounded-xl font-semibold text-white text-sm disabled:opacity-50 transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent)' }}
            >
              {loading ? 'Connexion…' : 'Accéder →'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: 'var(--text-3)' }}>
          <Link href="/" style={{ color: 'var(--text-3)' }}>← Retour à l&apos;accueil</Link>
        </p>
      </div>
    </div>
  );
}
