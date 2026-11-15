// app/strays/page.tsx
'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { MapPin, Search, RefreshCw } from 'lucide-react';
import { PageShell } from '@/components/layout/AppNav';
import { useStrays } from '@/lib/hooks/useStrays';
import { PawIcon } from '@/components/icons/PetIcons';

const HEALTH_LABEL: Record<string, { text: string; className: string }> = {
  healthy: { text: 'Healthy', className: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300' },
  needs_food: { text: 'Hungry', className: 'border-amber-500/40 bg-amber-500/15 text-amber-300' },
  injured: { text: 'Urgent', className: 'border-red-500/40 bg-red-500/15 text-red-300' },
  pregnant_nursing: { text: 'Nursing', className: 'border-pink-500/40 bg-pink-500/15 text-pink-300' },
  collared: { text: 'Collared', className: 'border-purple-500/40 bg-purple-500/15 text-purple-300' },
};

/** The stray list has its own page — the map stays focused on the map. */
export default function StraysPage() {
  const { strays, loading, reload } = useStrays({ radius: 0.6 });
  const [query, setQuery] = useState('');
  const [species, setSpecies] = useState<'all' | 'cat' | 'dog'>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return strays.filter((s) => {
      if (species !== 'all' && s.species !== species) return false;
      if (!q) return true;
      return (
        s.name?.toLowerCase().includes(q) ||
        s.city?.toLowerCase().includes(q) ||
        s.coat_description?.toLowerCase().includes(q)
      );
    });
  }, [strays, query, species]);

  return (
    <PageShell
      title="Discover strays"
      subtitle={`${filtered.length} buddy${filtered.length === 1 ? '' : 's'} on record`}
      actions={
        <button
          onClick={() => reload(true)}
          className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-bold text-slate-300 transition hover:text-white active:scale-95"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          <span>Refresh</span>
        </button>
      }
    >
      {/* Filters */}
      <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-2.5 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, city or markings…"
            className="w-full rounded-xl border border-white/10 bg-black/25 py-2 pl-8 pr-3 text-[12px] text-white placeholder-slate-500 focus:border-emerald-500/70 focus:outline-none"
          />
        </div>
        <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-black/20 p-1 sm:w-64">
          {(['all', 'cat', 'dog'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSpecies(s)}
              className={`rounded-lg py-1.5 text-[11px] font-bold capitalize transition ${
                species === s ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              {s === 'all' ? 'All' : `${s}s`}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-[12px] text-slate-400">
          Loading strays…
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/10 bg-white/5 p-10 text-center">
          <PawIcon size={26} className="text-slate-600" />
          <p className="text-[13px] font-black text-white">No strays here yet</p>
          <p className="text-[11px] text-slate-400">Tag one from the map with the Report a stray button.</p>
          <Link
            href="/"
            className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-white"
          >
            <MapPin className="h-3.5 w-3.5 text-emerald-400" /> Back to the map
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((stray) => {
          const health = HEALTH_LABEL[stray.health_status] || HEALTH_LABEL.healthy;
          return (
            <article
              key={stray.id}
              className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:shadow-[var(--sb-shadow)]"
            >
              <div className="relative h-36 w-full bg-slate-800">
                <img
                  src={stray.identifier_photo_url || '/icon.svg'}
                  alt={stray.name}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                <span
                  className={`absolute left-2 top-2 rounded-full border px-2 py-0.5 text-[10px] font-bold ${health.className}`}
                >
                  {health.text}
                </span>
                {stray.is_tnr && (
                  <span className="absolute right-2 top-2 rounded-full border border-teal-500/40 bg-teal-500/20 px-2 py-0.5 text-[10px] font-black text-teal-300">
                    TNR
                  </span>
                )}
              </div>
              <div className="space-y-1.5 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="truncate text-[13px] font-black text-white">{stray.name || 'Unnamed Buddy'}</h2>
                  <span className="shrink-0 text-[11px] font-bold text-emerald-400">🍖 {stray.fed_count || 0}</span>
                </div>
                <p className="flex items-center gap-1 text-[11px] text-slate-400">
                  <MapPin className="h-3 w-3 text-[color:var(--sb-accent-2)]" />
                  {stray.city}
                  <span className="mx-1 opacity-40">·</span>
                  <span className="capitalize">{stray.species}</span>
                </p>
                {stray.coat_description && (
                  <p className="line-clamp-2 text-[11px] leading-relaxed text-slate-400">{stray.coat_description}</p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </PageShell>
  );
}
