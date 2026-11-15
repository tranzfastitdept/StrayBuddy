"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import StrayMarker from './StrayMarker';
import StrayDrawer from './StrayDrawer';
import TagStrayModal from '../capture/TagStrayModal';
import AuthModal from '../auth/AuthModal';
import CampaignPopupModal from '../campaign/CampaignPopupModal';
import { Stray } from '../../types/stray';
import { detectCity } from '../../lib/geo/detectCity';
import { useAuth } from '../../context/AuthContext';
import { 
  Crosshair, 
  Plus, 
  Filter, 
  RefreshCw, 
  MapPin,
  Megaphone,
  User,
  LogOut,
  ChevronDown,
  Sparkles,
  ShieldAlert,
  Search
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function MapController({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom || map.getZoom(), { duration: 1.1 });
  }, [center, zoom, map]);
  return null;
}

function ViewportListener({ onMoveEnd }: { onMoveEnd: (center: L.LatLng) => void }) {
  const map = useMapEvents({
    moveend: () => {
      onMoveEnd(map.getCenter());
    },
  });
  return null;
}

const DEFAULT_CENTER: [number, number] = [14.5995, 120.9842];

export default function RadarMap() {
  const router = useRouter();
  const { user, logout, isSuperAdmin } = useAuth();

  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [strays, setStrays] = useState<Stray[]>([]);
  const [selectedStray, setSelectedStray] = useState<Stray | null>(null);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCampaignPopupOpen, setIsCampaignPopupOpen] = useState(false);
  
  // Filter states
  const [filterSpecies, setFilterSpecies] = useState<'all' | 'cat' | 'dog'>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentCity, setCurrentCity] = useState<string>('Manila');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Fetch strays from backend (CSV in dev or Supabase in prod)
  const loadStrays = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(`/api/strays?lat=${lat}&lng=${lng}&radius=0.12`);
      if (res.ok) {
        const liveData = await res.json();
        if (Array.isArray(liveData)) {
          setStrays(liveData);
        }
      }
    } catch (err) {
      console.warn('API fetch error:', err);
    }
  }, []);

  // Show Shopee-style charity announcement on first open
  useEffect(() => {
    const hasSeenPopup = sessionStorage.getItem('straybuddy_campaign_seen');
    if (!hasSeenPopup) {
      const timer = setTimeout(() => {
        setIsCampaignPopupOpen(true);
        sessionStorage.setItem('straybuddy_campaign_seen', 'true');
      }, 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleMapMoveEnd = (center: L.LatLng) => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      loadStrays(center.lat, center.lng);
      setCurrentCity(detectCity(center.lat, center.lng));
    }, 400);
  };

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        setUserCoords({ lat: latitude, lng: longitude });
        setMapCenter([latitude, longitude]);
        setCurrentCity(detectCity(latitude, longitude));
        loadStrays(latitude, longitude);
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [loadStrays]);

  useEffect(() => {
    handleLocateMe();
    loadStrays(DEFAULT_CENTER[0], DEFAULT_CENTER[1]);
  }, [handleLocateMe, loadStrays]);

  // Filter & Search calculations
  const filteredStrays = strays.filter((stray) => {
    if (filterSpecies !== 'all' && stray.species !== filterSpecies) return false;
    if (filterStatus !== 'all' && stray.health_status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = stray.name?.toLowerCase().includes(q);
      const matchDesc = stray.coat_description?.toLowerCase().includes(q);
      const matchCity = stray.city?.toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchCity) return false;
    }
    return true;
  });

  // Calculate live count stats for the bottom HUD
  const hungryCount = strays.filter(s => s.health_status === 'needs_food' || !s.last_fed_at).length;
  const injuredCount = strays.filter(s => s.health_status === 'injured').length;

  return (
    <div className="relative w-full h-full bg-slate-100 overflow-hidden select-none font-sans">
      
      {/* =========================================================================
          TOP FLOATING HUD: Life360 Glassmorphic Header & Navigation
         ========================================================================= */}
      <header className="absolute top-0 inset-x-0 z-30 pt-[calc(0.75rem+env(safe-area-inset-top))] px-3.5 sm:px-6 pointer-events-none">
        <div className="max-w-lg mx-auto flex flex-col gap-2">
          
          {/* Main Top Nav Bar */}
          <div className="flex items-center justify-between gap-2">
            
            {/* Brand Logo & Radar City Pill */}
            <div className="pointer-events-auto flex items-center gap-2.5 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 px-3.5 py-2 rounded-2xl shadow-xl transition-all">
              <div className="relative w-7 h-7 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-black text-sm shadow-md shadow-emerald-500/20">
                🐾
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-xs sm:text-sm tracking-tight text-white">StrayBuddy</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Live
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                  <MapPin className="w-2.5 h-2.5 text-sky-400" />
                  <span>{currentCity}</span>
                </div>
              </div>
            </div>

            {/* Right Controls HUD: Charity, Filter, and Auth */}
            <div className="pointer-events-auto flex items-center gap-1.5">
              
              {/* Charity Events Shortcut with Flash Badge */}
              <Link
                href="/announcements"
                className="relative w-10 h-10 rounded-2xl bg-amber-500/20 backdrop-blur-xl border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 flex items-center justify-center shadow-lg transition-all active:scale-95"
                aria-label="Charity Events"
              >
                <Megaphone className="w-4 h-4" />
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              </Link>

              {/* Filter Button */}
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`w-10 h-10 rounded-2xl backdrop-blur-xl border flex items-center justify-center shadow-lg transition-all active:scale-95 ${
                  isFilterOpen || filterSpecies !== 'all' || filterStatus !== 'all' || searchQuery
                    ? 'bg-sky-500 border-sky-400 text-white font-bold'
                    : 'bg-slate-900/95 border-slate-700/80 text-slate-300 hover:text-white'
                }`}
                aria-label="Filter"
              >
                <Filter className="w-4 h-4" />
              </button>

              {/* User Profile / Login Modal Toggle */}
              {user ? (
                <div className="flex items-center gap-1 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 p-1 pl-2.5 rounded-2xl shadow-lg">
                  <div className="text-right">
                    <span className="block text-[10px] font-black text-white truncate max-w-[65px]">
                      @{user.username}
                    </span>
                    {isSuperAdmin ? (
                      <span className="text-[8px] bg-red-500/20 text-red-400 font-extrabold px-1 rounded block">
                        Admin
                      </span>
                    ) : (
                      <span className="text-[8px] text-emerald-400 font-semibold block">
                        +{user.xp_points || 10} XP
                      </span>
                    )}
                  </div>
                  <button
                    onClick={logout}
                    title="Log Out"
                    className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-slate-750 flex items-center justify-center transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-3 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
              )}

            </div>

          </div>

          {/* Quick Species Filter Pill Bar (Life360 style immediate access) */}
          <div className="pointer-events-auto flex items-center justify-between gap-1.5 bg-slate-900/90 backdrop-blur-xl border border-slate-700/70 p-1 rounded-2xl shadow-lg text-[11px] font-bold">
            <button
              onClick={() => setFilterSpecies('all')}
              className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1 ${
                filterSpecies === 'all'
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🐾 All ({strays.length})</span>
            </button>
            <button
              onClick={() => setFilterSpecies('cat')}
              className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1 ${
                filterSpecies === 'cat'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🐱 Cats</span>
            </button>
            <button
              onClick={() => setFilterSpecies('dog')}
              className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1 ${
                filterSpecies === 'dog'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🐶 Dogs</span>
            </button>
          </div>

          {/* Expandable Extended Filter Drawer */}
          {isFilterOpen && (
            <div className="pointer-events-auto bg-slate-900/98 backdrop-blur-2xl border border-slate-700/80 rounded-2xl p-3.5 shadow-2xl text-xs space-y-3 animate-slide-up">
              
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search buddy name, markings, or street..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>

              {/* Health Condition Selector */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Health & Care Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full py-2 px-2.5 bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">🌟 All Conditions</option>
                  <option value="healthy">🟢 Healthy & Stable</option>
                  <option value="needs_food">🟡 Needs Food (Hungry)</option>
                  <option value="injured">🔴 Injured / Urgent Rescue</option>
                  <option value="pregnant_nursing">🌸 Pregnant / Nursing Mothers</option>
                  <option value="collared">🟣 Collared (Suspected Lost Pet)</option>
                </select>
              </div>

              {/* Clear Filter Shortcut */}
              <div className="flex justify-between items-center pt-1 border-t border-slate-800 text-[11px]">
                <span className="text-slate-400">Showing <b>{filteredStrays.length}</b> stray pins</span>
                {(filterSpecies !== 'all' || filterStatus !== 'all' || searchQuery) && (
                  <button
                    onClick={() => {
                      setFilterSpecies('all');
                      setFilterStatus('all');
                      setSearchQuery('');
                    }}
                    className="text-emerald-400 hover:underline font-bold"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>
          )}

        </div>
      </header>

      {/* =========================================================================
          OPENSTREETMAP ENGINE: Clean, Free, Lightweight
         ========================================================================= */}
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={14}
        zoomControl={false}
        className="w-full h-full"
      >
        <MapController center={mapCenter} />
        <ViewportListener onMoveEnd={handleMapMoveEnd} />

        {/* 100% Free OpenStreetMap Standard Tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* Render Custom Life360 Box Pins */}
        {filteredStrays.map((stray) => (
          <StrayMarker
            key={stray.id}
            stray={stray}
            isSelected={selectedStray?.id === stray.id}
            onClick={(s) => setSelectedStray(s)}
          />
        ))}
      </MapContainer>

      {/* =========================================================================
          BOTTOM FLOATING HUD: Life360 Navigation & Quick-Tag Button
         ========================================================================= */}
      <div className="absolute bottom-6 inset-x-0 z-40 px-4 pointer-events-none pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          
          {/* Recenter GPS Button */}
          <button
            onClick={handleLocateMe}
            disabled={isLocating}
            aria-label="Locate My Position"
            className="pointer-events-auto w-12 h-12 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 text-white flex items-center justify-center shadow-xl active:scale-95 transition-all"
          >
            <Crosshair className={`w-5 h-5 ${isLocating ? 'animate-spin text-emerald-400' : 'text-slate-200'}`} />
          </button>

          {/* Life360 Floating "Spot Stray" Action Button */}
          <button
            onClick={() => {
              if (!user) {
                setIsAuthModalOpen(true);
              } else {
                setIsTagModalOpen(true);
              }
            }}
            className="pointer-events-auto flex-1 flex items-center justify-center gap-2 py-3.5 px-5 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 text-slate-950 font-black text-sm tracking-wide shadow-2xl shadow-emerald-500/35 hover:brightness-110 active:scale-95 transition-all border border-emerald-300/40"
          >
            <div className="w-6 h-6 rounded-full bg-slate-950 text-emerald-400 flex items-center justify-center text-xs font-black shadow-inner">
              <Plus className="w-4 h-4 stroke-[3]" />
            </div>
            <span>Spot Stray</span>
          </button>

          {/* Refresh Strays Button */}
          <button
            onClick={() => loadStrays(mapCenter[0], mapCenter[1])}
            aria-label="Refresh Sighting Pins"
            className="pointer-events-auto w-12 h-12 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 text-white flex items-center justify-center shadow-xl active:scale-95 transition-all"
          >
            <RefreshCw className="w-5 h-5 text-slate-200" />
          </button>

        </div>
      </div>

      {/* =========================================================================
          INTERACTIVE DRAWERS & MODALS
         ========================================================================= */}

      {/* Stray Profile Bottom Drawer */}
      <StrayDrawer
        stray={selectedStray}
        onClose={() => setSelectedStray(null)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onActionSuccess={(updated) => {
          if (updated) {
            setSelectedStray(updated);
            setStrays((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
          } else {
            loadStrays(mapCenter[0], mapCenter[1]);
          }
        }}
      />

      {/* 4-Photo Tag Stray Modal */}
      {isTagModalOpen && (
        <TagStrayModal
          userCoords={userCoords}
          onClose={() => setIsTagModalOpen(false)}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onSuccess={() => {
            loadStrays(mapCenter[0], mapCenter[1]);
          }}
        />
      )}

      {/* Sign In / Sign Up Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Shopee-style Charity Campaign Announcement Pop-Up */}
      {isCampaignPopupOpen && (
        <CampaignPopupModal
          onClose={() => setIsCampaignPopupOpen(false)}
          onOpenAnnouncements={() => router.push('/announcements')}
        />
      )}

    </div>
  );
}
