"use client";

/**
 * Admin console.
 *
 * Two screens in one file:
 *   1. a sign-in card that only admin accounts can pass
 *   2. the console itself: overview counters, a table browser for every
 *      database table with create / edit / delete, and maintenance tools
 *
 * Every request sends the admin token, so the API can refuse a normal
 * guardian even if they somehow reach this page.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ShieldAlert,
  LogOut,
  Loader2,
  Search,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Database,
  RefreshCw,
  Users,
  MapPin,
  HeartHandshake,
  Wrench,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageShell } from '@/components/layout/AppNav';
import { PawIcon, ShieldPawIcon } from '@/components/icons/PetIcons';

const TOKEN_KEY = 'straybuddy_admin_token';

type Tab = { id: string; label: string; hint: string };

const TABS: Tab[] = [
  { id: '__overview', label: 'Overview', hint: 'Counters & health' },
  { id: 'strays', label: 'Strays', hint: 'Every pinned buddy' },
  { id: 'users', label: 'Accounts', hint: 'Accounts & roles' },
  { id: 'cities', label: 'Cities', hint: 'Coverage map' },
  { id: 'care_logs', label: 'Care logs', hint: 'Feed, water, alerts' },
  { id: 'stray_reviews', label: 'Reviews', hint: 'Ratings & notes' },
  { id: 'campaigns', label: 'Campaigns', hint: 'Charity drives' },
  { id: 'notifications', label: 'Notifications', hint: 'Urgent pings' },
  { id: 'stray_photos', label: 'Photos', hint: 'Animal uploads' },
  { id: 'campaign_photos', label: 'Event photos', hint: 'Campaign uploads' },
  { id: 'site_settings', label: 'Settings', hint: 'App switches' },
  { id: 'server_logs', label: 'Server log', hint: 'Runtime events' },
  { id: 'activity_logs', label: 'Audit trail', hint: 'Who changed what' },
  { id: '__tools', label: 'Maintenance', hint: 'Rebuild & reset' },
];

/** Admin token helper — kept in one place so every call sends it. */
function adminFetch(path: string, init: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  return fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'x-admin-token': token } : {}),
      ...(init.headers || {}),
    },
  });
}

export default function AdminConsole() {
  const { login } = useAuth();

  const [token, setToken] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  // sign-in form
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState('');

  // console state
  const [tab, setTab] = useState<string>('__overview');
  const [search, setSearch] = useState('');
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // editor
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);

  // overview + tools
  const [overview, setOverview] = useState<any>(null);
  const [busyTool, setBusyTool] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) setToken(stored);
    setChecking(false);
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setSigningIn(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.token) throw new Error(data.error || 'Sign-in failed');

      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      if (data.user) login(data.user);
      setUsername('');
      setPassword('');
    } catch (err: any) {
      setAuthError(err.message || 'Sign-in failed');
    } finally {
      setSigningIn(false);
    }
  };

  const signOut = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setRows([]);
    setOverview(null);
  };

  const loadOverview = useCallback(async () => {
    try {
      const res = await adminFetch('/api/admin/aggregate');
      const data = await res.json();
      if (res.ok) setOverview(data);
    } catch {
      /* the overview is optional chrome, never block the console on it */
    }
  }, []);

  const loadTable = useCallback(async (resource: string, q: string) => {
    setLoadingRows(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      const res = await adminFetch(`/api/admin/crud/${resource}?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load the table');
      setColumns(data.columns || []);
      setRows(data.rows || []);
    } catch (err: any) {
      setError(err.message || 'Could not load the table');
      setColumns([]);
      setRows([]);
    } finally {
      setLoadingRows(false);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    if (tab === '__overview') {
      loadOverview();
      return;
    }
    if (tab === '__tools') return;
    loadTable(tab, search);
  }, [token, tab, loadOverview, loadTable]);

  const startEdit = (row: any) => {
    setCreating(false);
    setEditing(row);
    const values: Record<string, string> = {};
    Object.entries(row).forEach(([key, value]) => {
      if (value === null || value === undefined) values[key] = '';
      else if (typeof value === 'object') values[key] = JSON.stringify(value);
      else values[key] = String(value);
    });
    setFormValues(values);
  };

  const startCreate = () => {
    setCreating(true);
    setEditing({});
    const values: Record<string, string> = {};
    columns.forEach((column) => (values[column] = ''));
    setFormValues(values);
  };

  const saveEditor = async () => {
    if (!editing) return;
    setSaving(true);
    setError('');
    try {
      if (creating) {
        const res = await adminFetch(`/api/admin/crud/${tab}`, {
          method: 'POST',
          body: JSON.stringify(cleanPayload(formValues)),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Insert failed');
        setNotice('Row created.');
      } else {
        const res = await adminFetch(`/api/admin/crud/${tab}/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(cleanPayload(formValues)),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Update failed');
        setNotice('Row updated.');
      }
      setEditing(null);
      await loadTable(tab, search);
      setTimeout(() => setNotice(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const removeRow = async (row: any) => {
    setError('');
    try {
      const res = await adminFetch(`/api/admin/crud/${tab}/${row.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      setConfirmDelete(null);
      setNotice('Row deleted.');
      await loadTable(tab, search);
      setTimeout(() => setNotice(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Delete failed');
    }
  };

  const runTool = async (action: string, confirm?: string) => {
    setBusyTool(action);
    setError('');
    try {
      const res = await adminFetch('/api/admin/tools', {
        method: 'POST',
        body: JSON.stringify({ action, confirm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Tool failed');
      setNotice(data.message || 'Done.');
      setTimeout(() => setNotice(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Tool failed');
    } finally {
      setBusyTool(null);
    }
  };

  const stats = useMemo(
    () => ({
      strays: overview?.totalStrays ?? 0,
      guardians: overview?.totalUsers ?? 0,
      feeds: overview?.totalCareLogs ?? 0,
      cities: (overview?.cities || []).length,
    }),
    [overview]
  );

  // ---------- sign-in screen ------------------------------------------------
  if (checking) {
    return (
      <PageShell title="Admin console" subtitle="Checking your session">
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
        </div>
      </PageShell>
    );
  }

  if (!token) {
    return (
      <PageShell title="Admin console" subtitle="Restricted area">
        <div className="mx-auto w-full max-w-sm animate-rise">
          <div className="sb-card p-6">
            <div className="mb-4 flex flex-col items-center gap-2 text-center">
              <span className="sb-icon-tile bg-amber-500/15 text-amber-300">
                <ShieldPawIcon size={22} />
              </span>
              <h2 className="text-[15px] font-black text-white">Admins only</h2>
              <p className="text-[12px] leading-relaxed text-slate-400">
                Sign in with an admin account to manage the network. Guardians keep using the map, the
                registry and the community pages.
              </p>
            </div>

            {authError && (
              <div className="mb-3 rounded-xl border border-red-500/40 bg-red-500/10 p-2.5 text-[11px] font-semibold text-red-300">
                {authError}
              </div>
            )}

            <form onSubmit={handleSignIn} className="space-y-3">
              <div>
                <label className="sb-label mb-1 block">Username</label>
                <input
                  className="sb-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin username"
                  required
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="sb-label mb-1 block">Password</label>
                <input
                  className="sb-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
              <button type="submit" disabled={signingIn} className="sb-primary w-full py-2.5 text-[12px]">
                {signingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldPawIcon size={16} />}
                Sign in to the console
              </button>
            </form>
          </div>
        </div>
      </PageShell>
    );
  }

  // ---------- console -------------------------------------------------------
  return (
    <PageShell
      title="Admin console"
      subtitle="Full database control"
      actions={
        <button onClick={signOut} className="sb-chip text-red-300 hover:border-red-400/40 hover:text-red-200">
          <LogOut size={12} /> Sign out
        </button>
      }
    >
      {/* section switcher */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 sb-no-scrollbar">
        {TABS.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setTab(item.id);
                setSearch('');
                setEditing(null);
              }}
              className={`shrink-0 rounded-xl border px-3 py-1.5 text-[11px] font-bold transition ${
                active
                  ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:text-white'
              }`}
              title={item.hint}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-[11px] font-semibold text-red-300">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-[11px] font-semibold text-emerald-300">
          {notice}
        </div>
      )}

      {/* ---- overview ---- */}
      {tab === '__overview' && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Pinned strays', value: stats.strays, icon: <PawIcon size={15} className="text-emerald-400" /> },
              { label: 'Guardians', value: stats.guardians, icon: <Users className="h-4 w-4 text-sky-400" /> },
              { label: 'Care taps', value: stats.feeds, icon: <HeartHandshake className="h-4 w-4 text-amber-400" /> },
              { label: 'Cities', value: stats.cities, icon: <MapPin className="h-4 w-4 text-purple-400" /> },
            ].map((kpi) => (
              <div key={kpi.label} className="sb-card p-3.5">
                <div className="mb-1.5 flex items-center justify-between gap-1">
                  <span className="sb-label truncate">{kpi.label}</span>
                  {kpi.icon}
                </div>
                <div className="text-2xl font-extrabold leading-none text-white">{kpi.value}</div>
              </div>
            ))}
          </div>

          <div className="sb-card p-4">
            <h3 className="mb-3 flex items-center gap-2 text-[13px] font-bold text-white">
              <Database className="h-4 w-4 text-sky-400" /> Strays per city
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-[11px]">
                <thead className="border-b border-white/10">
                  <tr className="sb-label">
                    <th className="pb-2 pr-3">City</th>
                    <th className="pb-2 pr-3">Strays</th>
                    <th className="pb-2 pr-3">Care taps</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {(overview?.cities || []).map((city: any) => (
                    <tr key={city.city} className="transition-colors hover:bg-white/5">
                      <td className="py-2.5 pr-3 font-bold text-white">{city.city}</td>
                      <td className="py-2.5 pr-3 font-semibold text-emerald-400">{city.strayCount}</td>
                      <td className="py-2.5 pr-3">{city.careLogCount}</td>
                      <td className="py-2.5">
                        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                          {city.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!overview?.cities?.length && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-500">
                        No city rows yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ---- maintenance ---- */}
      {tab === '__tools' && (
        <div className="space-y-3">
          {[
            {
              action: 'rebuild-counters',
              title: 'Rebuild fed counters',
              body: 'Recounts every fed total from the care log, so the map badges and statistics match reality again.',
              danger: false,
            },
            {
              action: 'optimize',
              title: 'Optimize tables',
              body: 'Asks MySQL to compact the tables. Useful after a big cleanup; harmless when it is already tidy.',
              danger: false,
            },
            {
              action: 'ensure-superadmin',
              title: 'Re-check the superadmin',
              body: 'Confirms a superadmin account exists, in case the console was set up before the seed was applied.',
              danger: false,
            },
          ].map((tool) => (
            <div key={tool.action} className="sb-card flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-bold text-white">{tool.title}</div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">{tool.body}</p>
              </div>
              <button
                onClick={() => runTool(tool.action)}
                disabled={busyTool === tool.action}
                className="sb-chip shrink-0"
              >
                {busyTool === tool.action ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Wrench className="h-3.5 w-3.5" />
                )}
                Run
              </button>
            </div>
          ))}

          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
            <div className="mb-1 flex items-center gap-2 text-[13px] font-bold text-red-300">
              <ShieldAlert className="h-4 w-4" /> Wipe operational data
            </div>
            <p className="mb-3 text-[11px] leading-relaxed text-slate-400">
              Deletes every stray, campaign, care log, review and notification. Accounts are kept. This cannot
              be undone.
            </p>
            <button
              onClick={() => runTool('reset', 'RESET')}
              disabled={busyTool === 'reset'}
              className="rounded-xl border border-red-500/40 bg-red-500/15 px-3 py-2 text-[11px] font-black text-red-200 transition hover:bg-red-500/25 active:scale-95"
            >
              {busyTool === 'reset' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Reset data'}
            </button>
          </div>
        </div>
      )}

      {/* ---- table browser ---- */}
      {tab !== '__overview' && tab !== '__tools' && (
        <div className="sb-card overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-white/10 p-3">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
                className="sb-input pl-9"
                placeholder="Search this table…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') loadTable(tab, search);
                }}
              />
            </div>
            <button onClick={() => loadTable(tab, search)} className="sb-chip" title="Reload">
              <RefreshCw className={`h-3.5 w-3.5 ${loadingRows ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={startCreate} className="sb-primary px-3 py-2 text-[11px]">
              <Plus className="h-3.5 w-3.5" /> New row
            </button>
          </div>

          <div className="max-h-[62vh] overflow-auto">
            <table className="w-full min-w-[560px] text-left text-[11px]">
              <thead className="sticky top-0 z-10 bg-[color:var(--sb-surface)]">
                <tr className="sb-label">
                  {columns.map((column) => (
                    <th key={column} className="whitespace-nowrap px-3 py-2">
                      {column}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {rows.map((row) => (
                  <tr key={String(row.id)} className="transition-colors hover:bg-white/5">
                    {columns.map((column) => (
                      <td key={column} className="max-w-[220px] truncate px-3 py-2">
                        {formatCell(row[column])}
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => startEdit(row)}
                          className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-300 transition hover:text-white"
                          title="Edit"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(row)}
                          className="rounded-lg border border-red-500/30 bg-red-500/10 p-1.5 text-red-300 transition hover:bg-red-500/20"
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!rows.length && !loadingRows && (
                  <tr>
                    <td colSpan={Math.max(columns.length + 1, 2)} className="py-10 text-center text-slate-500">
                      Nothing here yet. Use “New row” to add the first entry.
                    </td>
                  </tr>
                )}
                {loadingRows && (
                  <tr>
                    <td colSpan={Math.max(columns.length + 1, 2)} className="py-10 text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-emerald-400" />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---- editor dialog ---- */}
      {editing && (
        <div className="fixed inset-0 z-[980] flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[color:var(--sb-surface)] shadow-[var(--sb-shadow-lg)] sm:rounded-3xl">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
              <h3 className="text-[13px] font-black text-white">
                {creating ? `New ${tab} row` : `Edit ${tab} ${editing.id ?? ''}`}
              </h3>
              <button onClick={() => setEditing(null)} className="rounded-lg p-1.5 text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
              {Object.keys(formValues)
                .filter((key) => !(editing.id !== undefined && key === 'id') || creating)
                .map((key) => {
                  const long = /description|comment|notes|body|details|value/i.test(key);
                  return (
                    <div key={key}>
                      <label className="sb-label mb-1 block">{key}</label>
                      {long ? (
                        <textarea
                          className="sb-input min-h-[70px] resize-y"
                          value={formValues[key] || ''}
                          onChange={(e) => setFormValues((v) => ({ ...v, [key]: e.target.value }))}
                        />
                      ) : (
                        <input
                          className="sb-input"
                          value={formValues[key] ?? ''}
                          onChange={(e) => setFormValues((v) => ({ ...v, [key]: e.target.value }))}
                        />
                      )}
                    </div>
                  );
                })}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-white/10 px-4 py-3">
              <button onClick={() => setEditing(null)} className="sb-chip">
                Cancel
              </button>
              <button onClick={saveEditor} disabled={saving} className="sb-primary px-4 py-2 text-[11px]">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- delete confirm ---- */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[985] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[color:var(--sb-surface)] p-5 text-center">
            <span className="sb-icon-tile mx-auto mb-3 bg-red-500/15 text-red-300">
              <Trash2 size={18} />
            </span>
            <h3 className="text-[14px] font-black text-white">Delete this row?</h3>
            <p className="mb-4 mt-1 text-[11px] leading-relaxed text-slate-400">
              {confirmDelete.name || confirmDelete.title || confirmDelete.id} will be removed from{" "}
              {tab}. Related rows that point at it are removed too.
            </p>
            <div className="flex justify-center gap-2">
              <button onClick={() => setConfirmDelete(null)} className="sb-chip">
                Keep it
              </button>
              <button
                onClick={() => removeRow(confirmDelete)}
                className="rounded-xl border border-red-500/40 bg-red-500/20 px-3 py-2 text-[11px] font-black text-red-200 transition hover:bg-red-500/30 active:scale-95"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="flex items-center justify-center gap-1 text-[10px] font-semibold text-slate-500">
        <ChevronRight className="h-3 w-3" /> Every edit is written to the audit trail.
      </p>
    </PageShell>
  );
}

/** Format a cell for the table view. */
function formatCell(value: any): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'object') return JSON.stringify(value).slice(0, 60);
  const text = String(value);
  return text.length > 60 ? `${text.slice(0, 60)}…` : text;
}

/** Turn the dialog strings back into typed values the database accepts. */
function cleanPayload(values: Record<string, string>): Record<string, any> {
  const out: Record<string, any> = {};
  Object.entries(values).forEach(([key, raw]) => {
    if (key === 'id' && !raw.trim()) return; // let the database pick its own key
    const value = (raw ?? '').trim();
    if (value === '') {
      out[key] = null;
      return;
    }
    if (value === 'true' || value === 'yes') out[key] = 1;
    else if (value === 'false' || value === 'no') out[key] = 0;
    else if (/^-?\d+(\.\d+)?$/.test(value) && /count|points|amount|order|lat|lng|rating|xp/i.test(key)) {
      out[key] = Number(value);
    } else if ((value.startsWith('{') || value.startsWith('[')) && /photos|reactions|details/i.test(key)) {
      try {
        out[key] = JSON.parse(value);
      } catch {
        out[key] = value;
      }
    } else out[key] = value;
  });
  return out;
}
