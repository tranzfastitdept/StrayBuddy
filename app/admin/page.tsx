"use client";

import React, { useEffect, useState } from 'react';
import { 
  Building2, 
  Users, 
  HeartHandshake, 
  ShieldAlert, 
  Filter, 
  ArrowLeft, 
  Sparkles,
  ExternalLink,
  Server,
  Activity,
  Layers
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import AuthModal from '@/components/auth/AuthModal';

const CITIES = [
  'All Cities',
  'Manila',
  'Makati',
  'Quezon City',
  'Taguig',
  'Pasig',
  'Mandaluyong',
  'Pasay',
  'Parañaque',
  'Caloocan',
  'Las Piñas',
];

export default function AdminPage() {
  const { user, isSuperAdmin } = useAuth();
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [selectedSpecies, setSelectedSpecies] = useState<'all' | 'cat' | 'dog'>('all');
  const [selectedHealth, setSelectedHealth] = useState('all');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [backendHealth, setBackendHealth] = useState<string>('Checking...');

  const [stats, setStats] = useState({
    totalStrays: 4,
    totalUsers: 3,
    totalCareLogs: 3,
    cities: [] as any[],
    allStrays: [] as any[],
  });

  // Check standalone backend health
  useEffect(() => {
    fetch('http://localhost:5000/api/health')
      .then((r) => r.json())
      .then((d) => setBackendHealth(`Connected (Port 5000)`))
      .catch(() => setBackendHealth('Integrated Fallback'));

    fetch('/api/admin/aggregate')
      .then((r) => r.json())
      .then((data) => {
        if (data.totalStrays !== undefined) {
          setStats(data);
        }
      })
      .catch((err) => console.warn(err));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                StrayBuddy Admin Dashboard
              </h1>
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Layer 3 Dedicated Admin
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Community telemetry, rescuer coordination & multi-city spatial management
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!user ? (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="px-3 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs"
            >
              Sign In as Superadmin
            </button>
          ) : (
            <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300">Logged in: <b>@{user.username}</b></span>
            </div>
          )}

          <Link
            href="/"
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-xs font-bold text-white flex items-center gap-1.5"
          >
            <span>Radar Map</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Layer Architecture Status Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <Server className="w-4 h-4 text-sky-400" />
          <span className="text-slate-300 font-semibold">System Architecture:</span>
          <span className="px-2 py-0.5 bg-sky-500/20 text-sky-300 rounded-full font-bold border border-sky-500/30">
            Option B (3-Layer Scalable Engine)
          </span>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            Backend: <b className="text-white">{backendHealth}</b>
          </span>
          <span className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            Database: <b className="text-white">CSV (Dev) / Supabase (Prod)</b>
          </span>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Pinned Strays</span>
            <span className="text-emerald-400">🐾</span>
          </div>
          <div className="text-2xl font-extrabold text-white">{stats.totalStrays}</div>
          <div className="text-[10px] text-slate-500 mt-1">Across Metro Manila</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Total Feeds</span>
            <HeartHandshake className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{stats.totalCareLogs}</div>
          <div className="text-[10px] text-slate-500 mt-1">Meals logged by passersby</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Registered Guardians</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{stats.totalUsers}</div>
          <div className="text-[10px] text-slate-500 mt-1">Spotters & Rescuers</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Active Shards</span>
            <Building2 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">10</div>
          <div className="text-[10px] text-slate-500 mt-1">Zero-cost multi-city router</div>
        </div>
      </div>

      {/* City Shards Table */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <span>Multi-City Administrative Telemetry</span>
          <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
            Real-time Sighting Polygons
          </span>
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="pb-2.5">Target City</th>
                <th className="pb-2.5">Sighting Pins</th>
                <th className="pb-2.5">Shard Status</th>
                <th className="pb-2.5">Execution Engine</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {CITIES.filter((c) => c !== 'All Cities').map((city) => (
                <tr key={city} className="hover:bg-slate-800/40">
                  <td className="py-2.5 font-bold text-white">{city}</td>
                  <td className="py-2.5">
                    <span className="font-semibold text-emerald-400">
                      {stats.allStrays?.filter((s: any) => s.city === city).length || 0} strays
                    </span>
                  </td>
                  <td className="py-2.5">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Active / Bounded
                    </span>
                  </td>
                  <td className="py-2.5 text-slate-400">Layer 2 Standalone Driver</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

    </div>
  );
}
