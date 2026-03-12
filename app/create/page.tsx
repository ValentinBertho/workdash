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
        body: JSON.stringify({ name: name.trim(), slug: slug.trim(), template, password: password || undefined, accentColor: accent, adminName: adminName.trim() }),
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

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 10,
    border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)',
    fontSize: '0.875rem', outline: 'none', transition: 'border-color 0.15s',
  };

  return (
    <>
      <style>{`:root { --accent: ${accent}; }`}</style>
      <div
        className="dot-grid min-h-screen flex flex-col items-center justify-center p-6"
        style={{ background: 'var(--bg)' }}
      >
        {/* Ambient gradient */}
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: 'radial-gradient(ellipse 80% 50% at 50% -10%, color-mix(in srgb, var(--accent) 7%, transparent), transparent)',
        }} />

        <div className="w-full relative" style={{ maxWidth: 520, zIndex: 1 }}>
          {/* Back */}
          <div className="slide-up" style={{ marginBottom: 24 }}>
            <Link
              href="/"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: '0.78rem', color: 'var(--text-3)', textDecoration: 'none',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Retour
            </Link>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.04em', marginTop: 12 }}>
              Créer une équipe
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', marginTop: 4 }}>
              Votre espace de travail prêt en quelques secondes.
            </p>
          </div>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Identity block */}
            <div
              className="slide-up stagger-1"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px', boxShadow: 'var(--shadow-sm)' }}
            >
              <SectionLabel>Identité</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Field label="Nom de l'équipe">
                  <input
                    required value={name}
                    onChange={e => handleNameChange(e.target.value)}
                    placeholder="Cabinet Martin, Équipe Dev…"
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  />
                </Field>
                <Field label="Lien d'accès (slug)" hint={`/team/${slug || '…'}`}>
                  <input
                    required value={slug}
                    onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="cabinet-martin"
                    style={{ ...inputStyle, fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}
                    onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  />
                </Field>
                <Field label="Votre nom (administrateur)">
                  <input
                    required value={adminName}
                    onChange={e => setAdminName(e.target.value)}
                    placeholder="Marie Dupont"
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  />
                </Field>
              </div>
            </div>

            {/* Template block */}
            <div
              className="slide-up stagger-2"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px', boxShadow: 'var(--shadow-sm)' }}
            >
              <SectionLabel>Workflow</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {(Object.entries(TEMPLATES) as [TemplateKey, typeof TEMPLATES[TemplateKey]][]).map(([key, tpl]) => {
                  const on = template === key;
                  return (
                    <button
                      key={key} type="button"
                      onClick={() => setTemplate(key)}
                      style={{
                        textAlign: 'left', padding: '11px 12px', borderRadius: 12,
                        border: on ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                        background: on ? 'var(--accent-light)' : 'var(--surface-2)',
                        color: on ? 'var(--accent)' : 'var(--text-2)',
                        transition: 'all 0.15s', cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontSize: '0.85rem', fontWeight: on ? 700 : 500, letterSpacing: '-0.01em' }}>
                        {tpl.label}
                      </div>
                      <div style={{ fontSize: '0.7rem', marginTop: 2, opacity: 0.7 }}>
                        {tpl.steps.length} étapes
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Steps preview */}
              {template && (
                <div style={{ display: 'flex', gap: 5, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                  {TEMPLATES[template].steps.map((s, i) => (
                    <span
                      key={i}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: '0.68rem', fontWeight: 500,
                        padding: '3px 8px', borderRadius: 'var(--r-full)',
                        background: `${s.color}18`, color: s.color, border: `1px solid ${s.color}30`,
                      }}
                    >
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                      {s.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Options block */}
            <div
              className="slide-up stagger-3"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px', boxShadow: 'var(--shadow-sm)' }}
            >
              <SectionLabel>Options</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Field label="Couleur d'accent">
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {COLORS.map(c => (
                      <button
                        key={c} type="button"
                        onClick={() => setAccent(c)}
                        style={{
                          width: 30, height: 30, borderRadius: '50%', background: c,
                          border: accent === c ? '3px solid var(--text)' : '2px solid transparent',
                          cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s',
                          transform: accent === c ? 'scale(1.2)' : 'scale(1)',
                          boxShadow: accent === c ? `0 0 0 2px var(--surface), 0 0 0 4px ${c}` : 'none',
                        }}
                      />
                    ))}
                  </div>
                </Field>
                <Field label="Mot de passe" hint="Optionnel — protège l'accès à l'équipe">
                  <input
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    type="password"
                    placeholder="Laisser vide pour un accès libre"
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  />
                </Field>
              </div>
            </div>

            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 10,
                background: '#fef2f2', border: '1px solid #fca5a5',
                fontSize: '0.82rem', color: '#dc2626', fontWeight: 500,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !name.trim() || !slug.trim() || !adminName.trim()}
              className="btn-primary slide-up stagger-4"
              style={{ width: '100%', padding: '13px 0', fontSize: '0.9rem', justifyContent: 'center', borderRadius: 14 }}
            >
              {loading ? (
                <>
                  <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  Création en cours…
                </>
              ) : (
                <>
                  Créer mon espace équipe
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.09em', color: 'var(--text-4)', marginBottom: 14,
    }}>
      {children}
    </p>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
        <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          {label}
        </label>
        {hint && <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-4)' }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}
