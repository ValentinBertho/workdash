'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TeamMember, Folder } from '@/types';

interface SidebarProps {
  slug: string;
  active: 'folders' | 'admin' | 'folder' | 'archives';
  members?: TeamMember[];
  teamName?: string;
  accentColor?: string;
}

/* ─── Notification bell ──────────────────────────────────────── */
function NotifBell({ slug }: { slug: string }) {
  const [notifs, setNotifs] = useState<Folder[]>([]);
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const fetchNotifs = async () => {
    try {
      const r = await fetch(`/api/teams/${slug}/folders`);
      if (!r.ok) return;
      const data = await r.json();
      setNotifs((data.folders ?? []).filter((f: Folder) => f.hasUnread));
    } catch {}
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30_000);
    return () => clearInterval(interval);
  }, [slug]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const dropdown = document.getElementById('notif-dropdown');
      if (btnRef.current && !btnRef.current.contains(target) && dropdown && !dropdown.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropPos({ top: rect.bottom + 6, left: rect.left });
    }
    setOpen(v => !v);
  };

  const count = notifs.length;

  return (
    <div style={{ flexShrink: 0 }}>
      <button
        ref={btnRef}
        onClick={toggle}
        title="Notifications"
        style={{
          width: 26, height: 26, borderRadius: 7,
          border: `1px solid ${count > 0 ? 'var(--accent-border)' : 'var(--border)'}`,
          background: count > 0 ? 'var(--accent-light)' : 'var(--surface-2)',
          color: count > 0 ? 'var(--accent)' : 'var(--text-3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.15s', position: 'relative',
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {count > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            minWidth: 14, height: 14, borderRadius: 'var(--r-full)',
            background: 'var(--accent)', color: '#fff',
            fontSize: '0.56rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px', lineHeight: 1,
            border: '1.5px solid var(--surface)',
          }}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && dropPos && (
        <div id="notif-dropdown" style={{
          position: 'fixed', top: dropPos.top, left: dropPos.left,
          width: 280, zIndex: 9999,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14, boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 14px 10px',
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
              Notifications
            </span>
            {count > 0 && (
              <span style={{
                fontSize: '0.62rem', fontWeight: 600, padding: '1px 7px',
                borderRadius: 'var(--r-full)', background: 'var(--accent-light)', color: 'var(--accent)',
              }}>
                {count} non lu{count > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {notifs.length === 0 ? (
              <div style={{
                padding: '28px 14px', textAlign: 'center',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-4)' }}>Tout est à jour !</p>
              </div>
            ) : (
              notifs.map(f => (
                <a
                  key={f.id}
                  href={`/team/${slug}/folder/${f.id}`}
                  onClick={() => setOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '10px 14px', textDecoration: 'none',
                    borderBottom: '1px solid var(--border)',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: f.stepColor ?? 'var(--accent)',
                    flexShrink: 0, marginTop: 5,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      lineHeight: 1.4,
                    }}>
                      {f.title}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-4)' }}>
                        {f.ref}
                      </span>
                      {f.stepName && (
                        <span style={{
                          fontSize: '0.6rem', fontWeight: 600,
                          color: f.stepColor ?? 'var(--text-3)',
                          background: f.stepColor
                            ? `color-mix(in srgb, ${f.stepColor} 12%, var(--surface))`
                            : 'var(--surface-2)',
                          padding: '1px 5px', borderRadius: 4,
                        }}>
                          {f.stepName}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="unread-dot" style={{ flexShrink: 0, marginTop: 4 }} />
                </a>
              ))
            )}
          </div>

          {/* Footer */}
          {notifs.length > 0 && (
            <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)' }}>
              <a
                href={`/team/${slug}`}
                onClick={() => setOpen(false)}
                style={{
                  display: 'block', textAlign: 'center',
                  fontSize: '0.72rem', fontWeight: 600, color: 'var(--accent)',
                  textDecoration: 'none', padding: '4px 0',
                }}
              >
                Voir tous les dossiers →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ slug, active, members = [], teamName: initialName, accentColor }: SidebarProps) {
  const router = useRouter();
  const [teamName, setTeamName] = useState(initialName ?? slug);
  const [dark, setDark] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('wd-theme');
    if (saved === 'dark') { setDark(true); document.documentElement.setAttribute('data-theme', 'dark'); }
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('wd-theme', next ? 'dark' : 'light');
  };

  useEffect(() => {
    if (initialName && accentColor) return;
    fetch(`/api/teams/${slug}`)
      .then(r => r.json())
      .then(({ team }) => {
        if (!team) return;
        if (team.name) setTeamName(team.name);
        if (team.accentColor) document.documentElement.style.setProperty('--accent', team.accentColor);
      })
      .catch(() => {});
  }, [slug, initialName, accentColor]);

  useEffect(() => {
    if (accentColor) document.documentElement.style.setProperty('--accent', accentColor);
  }, [accentColor]);

  const logout = async () => {
    await fetch(`/api/teams/${slug}/auth`, { method: 'DELETE' });
    router.push('/');
  };

  const revokeAll = async () => {
    setRevoking(true);
    await fetch(`/api/teams/${slug}/me/sessions`, { method: 'DELETE' });
    setRevoking(false);
    setShowRevokeConfirm(false);
  };

  const navItems = [
    {
      key: 'folders' as const,
      href: `/team/${slug}`,
      label: 'Dossiers',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" /></svg>,
    },
    {
      key: 'archives' as const,
      href: `/team/${slug}/archives`,
      label: 'Archives',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" /></svg>,
    },
    {
      key: 'admin' as const,
      href: `/team/${slug}/admin`,
      label: 'Administration',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>,
    },
  ];

  const isActive = (key: string) => key === active || (active === 'folder' && key === 'folders');

  return (
    <aside className="sidebar">
      <div style={{ height: 3, background: 'var(--accent)', flexShrink: 0 }} />

      <div style={{ padding: '14px 14px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Link href={`/team/${slug}`} style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 7, flex: 1 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M3 12h12M3 18h7" /></svg>
          </div>
          <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em' }}>
            Work<span style={{ color: 'var(--accent)' }}>Dash</span>
          </span>
        </Link>
        <NotifBell slug={slug} />
        <button onClick={toggleDark} title={dark ? 'Mode clair' : 'Mode sombre'}
          style={{ width: 26, height: 26, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0 }}>
          {dark
            ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
            : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          }
        </button>
      </div>

      <div style={{ padding: '0 10px 14px' }}>
        <div style={{ padding: '9px 11px', borderRadius: 10, background: 'var(--accent-light)', border: '1px solid var(--accent-border)' }}>
          <p style={{ fontSize: '0.58rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Équipe active</p>
          <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>{teamName}</p>
          <p style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--text-3)', marginTop: 3 }}>/team/{slug}</p>
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--border)', margin: '0 14px 10px' }} />

      <nav style={{ padding: '0 8px', flex: 1 }}>
        <p style={{ fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--text-4)', padding: '0 8px 7px' }}>Navigation</p>
        {navItems.map(item => {
          const on = isActive(item.key);
          return (
            <Link key={item.key} href={item.href}
              style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', borderRadius: 9, marginBottom: 2, textDecoration: 'none', background: on ? 'var(--accent-light)' : 'transparent', color: on ? 'var(--accent)' : 'var(--text-3)', fontWeight: on ? 600 : 400, fontSize: '0.82rem', transition: 'background 0.15s, color 0.15s' }}
              onMouseEnter={e => { if (!on) { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text)'; } }}
              onMouseLeave={e => { if (!on) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)'; } }}
            >
              {item.icon}{item.label}
            </Link>
          );
        })}

        {members.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <div style={{ height: 1, background: 'var(--border)', margin: '0 4px 12px' }} />
            <p style={{ fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--text-4)', padding: '0 8px 7px' }}>Membres · {members.length}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {members.slice(0, 7).map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 7 }}>
                  <div className="avatar" style={{ width: 22, height: 22, fontSize: '0.6rem', borderRadius: 5 }}>{m.name.slice(0, 1).toUpperCase()}</div>
                  <p style={{ flex: 1, fontSize: '0.76rem', fontWeight: 500, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</p>
                  <span style={{ fontSize: '0.54rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', padding: '1px 5px', borderRadius: 4, background: m.role === 'admin' ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'var(--surface-2)', color: m.role === 'admin' ? 'var(--accent)' : 'var(--text-4)' }}>
                    {m.role === 'admin' ? 'ADM' : m.role === 'operator' ? 'OPE' : 'VUE'}
                  </span>
                </div>
              ))}
              {members.length > 7 && <p style={{ fontSize: '0.7rem', color: 'var(--text-4)', padding: '3px 8px' }}>+{members.length - 7} autres membres</p>}
            </div>
          </div>
        )}
      </nav>

      <div style={{ padding: '10px 8px', borderTop: '1px solid var(--border)', marginTop: 'auto', flexShrink: 0 }}>
        {showRevokeConfirm ? (
          <div style={{ padding: '10px', borderRadius: 9, marginBottom: 4, background: '#fef2f2', border: '1px solid #fca5a5' }}>
            <p style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 600, marginBottom: 8 }}>Déconnecter tous les appareils ?</p>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={revokeAll} disabled={revoking}
                style={{ flex: 1, padding: '4px 0', borderRadius: 6, border: 'none', background: '#dc2626', color: 'white', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', opacity: revoking ? 0.6 : 1 }}>
                {revoking ? '…' : 'Confirmer'}
              </button>
              <button onClick={() => setShowRevokeConfirm(false)}
                style={{ flex: 1, padding: '4px 0', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-3)', fontSize: '0.72rem', cursor: 'pointer' }}>
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowRevokeConfirm(true)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 9, background: 'none', border: 'none', color: 'var(--text-4)', fontSize: '0.72rem', transition: 'all 0.15s', textAlign: 'left', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = '#dc2626'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-4)'; }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
            Révoquer tous les appareils
          </button>
        )}
        <button onClick={logout}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 9, background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '0.78rem', transition: 'background 0.15s, color 0.15s', textAlign: 'left', cursor: 'pointer' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-3)'; }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}
