"use client";

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from '@/components/brand/Logo';
import { PawPinIcon, PawIcon, MegaphonePawIcon, ShieldPawIcon } from '@/components/icons/PetIcons';
import { useAuth } from '@/context/AuthContext';
import AuthModal from '@/components/auth/AuthModal';
import {
  Menu,
  X,
  LogOut,
  ChevronRight,
  User as UserIcon,
  MapPin,
} from 'lucide-react';

type NavItem = {
  href: string;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  adminOnly?: boolean;
};

const NAV: NavItem[] = [
  { href: '/', label: 'Explore map', hint: 'Live strays near you', icon: PawPinIcon },
  { href: '/strays', label: 'Discover strays', hint: 'Every buddy on record', icon: PawIcon },
  { href: '/campaigns', label: 'Community', hint: 'Charity drives & events', icon: MegaphonePawIcon },
  { href: '/admin', label: 'Admin console', hint: 'Telemetry & health', icon: ShieldPawIcon, adminOnly: true },
];

const APP_VERSION = 'v1.4.0';

/**
 * The whole app chrome: a floating menu button plus an overlay drawer.
 *
 * Nothing is reserved for navigation — the map (or any page) fills the screen
 * and the drawer is drawn on top of it only while it is open.
 */
export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout, isSuperAdmin } = useAuth();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const accountRef = useRef<HTMLDivElement | null>(null);

  // Escape closes the drawer or the account menu, whichever is open.
  useEffect(() => {
    if (!drawerOpen && !accountOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawerOpen(false);
        setAccountOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen, accountOpen]);

  // Close the account popover when tapping anywhere outside it.
  useEffect(() => {
    if (!accountOpen) return;
    const onDown = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [accountOpen]);

  // Route change closes every overlay.
  useEffect(() => {
    setDrawerOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  const items = NAV.filter((item) => !item.adminOnly || isSuperAdmin);

  return (
    <>
      {children}

      {/* ---- Floating menu button: the only persistent navigation control --- */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[900] flex items-start justify-between gap-2 px-3 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-4">
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation"
          aria-expanded={drawerOpen}
          aria-controls="sb-drawer"
          className="sb-map-btn pointer-events-auto !h-12 !w-12 !rounded-2xl"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* ---- Account avatar / sign in ------------------------------------ */}
        <div ref={accountRef} className="pointer-events-auto relative">
          {user ? (
            <button
              onClick={() => setAccountOpen((v) => !v)}
              aria-label="Account menu"
              aria-expanded={accountOpen}
              className="sb-map-btn !h-12 !w-12 !rounded-2xl !bg-emerald-500/15 !text-emerald-200"
            >
              <span className="text-[13px] font-black">{user.username?.slice(0, 1).toUpperCase()}</span>
            </button>
          ) : (
            <button
              onClick={() => setAuthOpen(true)}
              aria-label="Sign in"
              className="sb-map-btn !h-12 !w-12 !rounded-2xl"
            >
              <UserIcon className="h-5 w-5" />
            </button>
          )}

          {accountOpen && user && (
            <div className="sb-glass absolute right-0 top-14 w-56 animate-pop-in overflow-hidden p-2">
              <div className="flex items-center gap-2 rounded-xl px-2 py-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-xs font-black text-emerald-300">
                  {user.username?.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-[12px] font-black text-white">@{user.username}</div>
                  <div className="text-[10px] font-semibold text-emerald-400">
                    {isSuperAdmin ? 'Superadmin' : `${user.xp_points || 10} XP`}
                  </div>
                </div>
              </div>
              <div className="my-1 h-px bg-white/10" />
              <Link
                href="/strays"
                className="flex items-center gap-2 rounded-xl px-2 py-2 text-[12px] font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                <PawIcon size={14} /> My strays
              </Link>
              <button
                onClick={logout}
                className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-[12px] font-semibold text-red-300 transition hover:bg-red-500/10"
              >
                <LogOut size={14} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ---- Overlay drawer ------------------------------------------------ */}
      <div
        className={`fixed inset-0 z-[950] transition-opacity duration-300 ${
          drawerOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden={!drawerOpen}
      >
        {/* backdrop */}
        <button
          aria-label="Close navigation"
          onClick={() => setDrawerOpen(false)}
          className="absolute inset-0 h-full w-full cursor-default bg-slate-950/55 backdrop-blur-[2px]"
        />

        <aside
          id="sb-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Main navigation"
          className={`absolute inset-y-0 left-0 flex w-[85%] max-w-[320px] flex-col border-r border-white/10 bg-[color:var(--sb-bg)] shadow-[var(--sb-shadow-lg)] transition-transform duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] ${
            drawerOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Brand */}
          <div className="flex items-center justify-between gap-2 px-4 pb-3 pt-[calc(1rem+env(safe-area-inset-top))]">
            <Link href="/" className="flex items-center gap-2.5" onClick={() => setDrawerOpen(false)}>
              <Logo size={34} title="" />
              <div className="leading-none">
                <div className="text-[15px] font-black tracking-tight text-white">
                  Stray<span className="text-emerald-400">Buddy</span>
                </div>
                <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  Pet radar network
                </div>
              </div>
            </Link>
            <button
              onClick={() => setDrawerOpen(false)}
              aria-label="Close navigation"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:text-white active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Account block */}
          <div className="px-4">
            {user ? (
              <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-xs font-black text-emerald-300">
                  {user.username?.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-[12px] font-black text-white">@{user.username}</div>
                  <div className="text-[10px] font-semibold text-emerald-400">
                    {isSuperAdmin ? 'Superadmin' : `Guardian · ${user.xp_points || 10} XP`}
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setDrawerOpen(false);
                  setAuthOpen(true);
                }}
                className="sb-primary w-full py-2.5 text-[12px]"
              >
                Sign in to the pack
              </button>
            )}
          </div>

          {/* Destinations */}
          <nav className="mt-4 flex-1 space-y-1 overflow-y-auto px-2.5">
            <div className="sb-label px-2 pb-1">Navigate</div>
            {items.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setDrawerOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={`group flex items-center gap-3 rounded-2xl px-2.5 py-2.5 transition ${
                    active
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
                      active ? 'bg-emerald-500 text-slate-950' : 'bg-white/5 text-slate-400 group-hover:text-white'
                    }`}
                  >
                    <Icon size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-bold">{item.label}</span>
                    <span className="block truncate text-[10px] font-medium text-slate-500">{item.hint}</span>
                  </span>
                  <ChevronRight className={`h-3.5 w-3.5 ${active ? 'text-emerald-400' : 'text-slate-600'}`} />
                </Link>
              );
            })}
          </nav>

          {/* Bottom block */}
          <div className="border-t border-white/10 px-2.5 py-3">
            {user && (
              <button
                onClick={() => {
                  logout();
                  setDrawerOpen(false);
                }}
                className="flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-[12px] font-bold text-red-300 transition hover:bg-red-500/10"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10">
                  <LogOut size={16} />
                </span>
                Sign out
              </button>
            )}
            <div className="mt-1 flex items-center justify-between px-2.5 pt-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={10} /> Metro Manila · Cavite
              </span>
              <span>{APP_VERSION}</span>
            </div>
          </div>
        </aside>
      </div>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}

/**
 * Page wrapper for the content screens (registry, events, admin).
 * The map page uses the shell without padding so the map fills the screen.
 */
export function PageShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="h-[100dvh] w-full overflow-y-auto bg-[color:var(--sb-bg)] text-[color:var(--sb-text)]">
      <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-[calc(4.75rem+env(safe-area-inset-top))] sm:px-6">
        {(title || actions) && (
          <header className="mb-4 flex items-end justify-between gap-3">
            <div className="min-w-0">
              {title && <h1 className="truncate text-lg font-black tracking-tight text-white">{title}</h1>}
              {subtitle && <p className="truncate text-[11px] font-semibold text-slate-400">{subtitle}</p>}
            </div>
            {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
          </header>
        )}
        <div className="animate-rise space-y-5">{children}</div>
        <footer className="mt-10 border-t border-white/10 pt-4 text-center text-[10px] font-semibold text-slate-500">
          <span className="inline-flex items-center gap-1.5 text-slate-400">
            <PawIcon size={12} /> StrayBuddy
          </span>
          <span className="mx-1.5 opacity-40">·</span>
          Community-run stray care network
        </footer>
      </div>
    </div>
  );
}

export default PageShell;
