'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { slugify, TEMPLATES, TemplateKey } from '@/lib/templates';

const COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#f97316'];

export default function CreatePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [template, setTemplate] = useState<TemplateKey>('custom');
  const [password, setPassword] = useState('');
  const [accent, setAccent] = useState('#4f46e5');
  const [adminName, setAdminName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleNameChange = (v: string) => {
    setName(v);
    setSlug(slugify(v));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          template,
          password: password || undefined,
          accentColor: accent,
          adminName: adminName.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Erreur'); return; }
      router.push(`/team/${data.slug}`);
    } catch {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  const s = (
    <style>{`:root { --accent: ${accent}; --accent-light: ${accent}22; --accent-border: ${accent}66; }`}</style>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      {s}
      <div className="w-full max-w-lg">
        <div className="mb-6">
          <Link href="/" className="text-sm" style={{ color: 'var(--text-3)' }}>← Retour</Link>
          <h1 className="text-2xl font-bold mt-3" style={{ color: 'var(--text)' }}>
            Créer une équipe
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
            Votre espace de travail prêt en 2 minutes.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-5">
          {/* Nom + admin */}
          <div className="p-5 rounded-2xl space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <Field label="Nom de l'équipe">
              <input
                required value={name}
                onChange={e => handleNameChange(e.target.value)}
                placeholder="Cabinet Martin, Équipe Dev…"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none border"
                style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }}
              />
            </Field>
            <Field label="Lien d'accès (slug)" hint={`/team/${slug || '…'}`}>
              <input
                required value={slug}
                onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="cabinet-martin"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none border font-mono"
                style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }}
              />
            </Field>
            <Field label="Votre nom (admin)">
              <input
                required value={adminName}
                onChange={e => setAdminName(e.target.value)}
                placeholder="Marie Dupont"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none border"
                style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }}
              />
            </Field>
          </div>

          {/* Template */}
          <div className="p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <label className="block text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
              Workflow
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(Object.entries(TEMPLATES) as [TemplateKey, typeof TEMPLATES[TemplateKey]][]).map(([key, tpl]) => (
                <button
                  key={key} type="button"
                  onClick={() => setTemplate(key)}
                  className="text-left p-3 rounded-xl border text-sm transition-all"
                  style={{
                    borderColor: template === key ? 'var(--accent)' : 'var(--border)',
                    background: template === key ? 'var(--accent-light)' : 'var(--surface-2)',
                    color: template === key ? 'var(--accent)' : 'var(--text-2)',
                    fontWeight: template === key ? 600 : 400,
                  }}
                >
                  <div className="font-semibold">{tpl.label}</div>
                  <div className="text-xs mt-0.5 opacity-70">{tpl.steps.length} étapes</div>
                </button>
              ))}
            </div>
            {template && (
              <div className="flex gap-1 mt-3 flex-wrap">
                {TEMPLATES[template].steps.map((s, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: s.color }}>
                    {s.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Options */}
          <div className="p-5 rounded-2xl space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <Field label="Couleur d'accent de l'équipe">
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button
                    key={c} type="button"
                    onClick={() => setAccent(c)}
                    className="w-8 h-8 rounded-full border-2 transition-transform"
                    style={{
                      background: c,
                      borderColor: accent === c ? 'var(--text)' : 'transparent',
                      transform: accent === c ? 'scale(1.15)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>
            </Field>
            <Field label="Mot de passe d'accès" hint="Optionnel — protège le lien d'accès">
              <input
                value={password}
                onChange={e => setPassword(e.target.value)}
                type="password"
                placeholder="Laisser vide pour un accès libre"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none border"
                style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }}
              />
            </Field>
          </div>

          {error && (
            <p className="text-sm text-red-500 font-medium">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !name.trim() || !slug.trim() || !adminName.trim()}
            className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-opacity disabled:opacity-50"
            style={{ background: 'var(--accent)' }}
          >
            {loading ? 'Création…' : 'Créer mon espace équipe →'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1.5">
        <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
          {label}
        </label>
        {hint && <span className="text-xs font-mono" style={{ color: 'var(--text-3)' }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}
