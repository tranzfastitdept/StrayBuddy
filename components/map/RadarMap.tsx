"use client";

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import StrayMarker from './StrayMarker';
import MeMarker from './MeMarker';
import StrayDrawer from './StrayDrawer';
import TagStrayModal from '../capture/TagStrayModal';
import AuthModal from '../auth/AuthModal';
import CampaignPopupModal from '../campaign/CampaignPopupModal';
import { Stray } from '../../types/stray';
import { detectCity } from '../../lib/geo/detectCity';
import { useDeviceLocation } from '../../lib/geo/useDeviceLocation';
import { useAuth } from '../../context/AuthContext';
import { distanceMetres, boundingRadiusDegrees } from '../../lib/geo/distance';
import { useRouter } from 'next/navigation';
import {
  Crosshair,
  Plus,
  Filter,
  RefreshCw,
  MapPin,
  Layers,
  ZoomIn,
  ZoomOut,
  Search,
  ShieldAlert,
  X,
  Check,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* Map helpers                                                                */
/* -------------------------------------------------------------------------- */

function MapController({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom || map.getZoom(), { duration: 1.1 });
  }, [center, zoom, map]);
  return null;
}

function ViewportListener({ onMoveEnd }: { onMoveEnd: (center: L.LatLng) => void }) {
  const map = useMapEvents({ moveend: () => onMoveEnd(map.getCenter()) });
  return null;
}

/** Hands the live map instance to the floating controls, and keeps it sized. */
function MapBridge({ onReady }: { onReady: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    onReady(map);
    const resize = () => map.invalidateSize({ animate: false });
    // The container is fullscreen, but rotations and browser chrome changes still need a nudge.
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);
    const t = setTimeout(resize, 120);
    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('orientationchange', resize);
      clearTimeout(t);
    };
  }, [map, onReady]);
  return null;
}

const DEFAULT_CENTER: [number, number] = [14.5995, 120.9842];

/* Tile layers. Both are free OpenStreetMap-derived tiles; attribution stays on. */
const LAYERS = {
  standard: {
    label: 'Standard',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  dark: {
    label: 'Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
} as const;

/* Filters anyone can stack on top of the species switcher. */
const TAGS = [
  { id: 'urgent', label: 'Urgent' },
  { id: 'hungry', label: 'Hungry' },
  { id: 'recent', label: 'Recently reported' },
  { id: 'fed_today', label: 'Fed today' },
  { id: 'nursing', label: 'Nursing' },
  { id: 'collared', label: 'Collared' },
] as const;

type TagId = (typeof TAGS)[number]['id'];

export default function RadarMap() {
  const router = useRouter();
  const { user } = useAuth();

  const { coords: deviceLocation, status: locationStatus, request: requestLocation } = useDeviceLocation();
  const hasCenteredOnUser = useRef(false);

  const [mapRef, setMapRef] = useState<L.Map | null>(null);
  const [showLocationHint, setShowLocationHint] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [rawStrays, setRawStrays] = useState<Stray[]>([]);
  const [selectedStray, setSelectedStray] = useState<Stray | null>(null);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCampaignPopupOpen, setIsCampaignPopupOpen] = useState(false);

  const [filterSpecies, setFilterSpecies] = useState<'all' | 'cat' | 'dog'>('all');
  const [activeTags, setActiveTags] = useState<TagId[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentCity, setCurrentCity] = useState<string>('Manila');
  const [isLocating, setIsLocating] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [layer, setLayer] = useState<keyof typeof LAYERS>('standard');
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The map shows ONLY strays within 15 km of the device, refreshed every second.
  const NEARBY_KM = 15;
  const POLL_MS = 1000;
  const nearbyAnchor = useRef<{ lat: number; lng: number } | null>(null);

  const loadStrays = useCallback(async (lat: number, lng: number) => {
    try {
      const box = boundingRadiusDegrees(NEARBY_KM, lat);
      const res = await fetch(`/api/strays?lat=${lat}&lng=${lng}&radius=${box.lat}`, { cache: 'no-store' });
      if (res.ok) {
        const liveData = await res.json();
        if (Array.isArray(liveData)) {
          setRawStrays(liveData);
          setLoadError(false);
        } else {
          setLoadError(true);
        }
      } else {
        setLoadError(true);
      }
    } catch (err) {
      console.warn('API fetch error:', err);
      setLoadError(true);
    }
  }, []);

  /* ------------------------------ first paint ----------------------------- */

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

  useEffect(() => {
    nearbyAnchor.current = { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] };
    loadStrays(DEFAULT_CENTER[0], DEFAULT_CENTER[1]);
  }, [loadStrays]);

  /* ----------------------------- device location -------------------------- */

  useEffect(() => {
    if (!deviceLocation) return;
    const here = { lat: deviceLocation.lat, lng: deviceLocation.lng };
    nearbyAnchor.current = here;
    setUserCoords(here);
    setIsLocating(false);

    if (!hasCenteredOnUser.current) {
      hasCenteredOnUser.current = true;
      setMapCenter([here.lat, here.lng]);
      setCurrentCity(detectCity(here.lat, here.lng));
      loadStrays(here.lat, here.lng);
    }
  }, [deviceLocation, loadStrays]);

  useEffect(() => {
    if (locationStatus === 'denied' || locationStatus === 'unavailable') {
      setIsLocating(false);
      setShowLocationHint(true);
    }
    if (locationStatus === 'ready') setShowLocationHint(false);
  }, [locationStatus]);

  const handleLocateMe = useCallback(() => {
    if (deviceLocation) {
      const here = { lat: deviceLocation.lat, lng: deviceLocation.lng };
      nearbyAnchor.current = here;
      setMapCenter([here.lat, here.lng]);
      mapRef?.flyTo([here.lat, here.lng], Math.max(mapRef.getZoom(), 15), { duration: 1.1 });
      setCurrentCity(detectCity(here.lat, here.lng));
      loadStrays(here.lat, here.lng);
      return;
    }
    setIsLocating(true);
    setShowLocationHint(true);
    requestLocation();
  }, [deviceLocation, loadStrays, requestLocation, mapRef]);

  const refreshMarkers = useCallback(async () => {
    const anchor = userCoords ?? nearbyAnchor.current;
    if (!anchor) return;
    setIsFetching(true);
    await loadStrays(anchor.lat, anchor.lng);
    setIsFetching(false);
  }, [userCoords, loadStrays]);

  /* -------------------------------- polling ------------------------------- */

  useEffect(() => {
    const timer = setInterval(() => {
      const anchor = userCoords ?? nearbyAnchor.current;
      if (!anchor) return;
      if (typeof document !== 'undefined' && document.hidden) return;
      loadStrays(anchor.lat, anchor.lng);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [userCoords, loadStrays]);

  const handleMapMoveEnd = (center: L.LatLng) => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => setCurrentCity(detectCity(center.lat, center.lng)), 400);
  };

  /* ------------------------------- filtering ------------------------------ */

  // Only the strays inside the 15 km circle around the anchor point are drawn.
  const nearbyStrays = useMemo(() => {
    const anchor = userCoords ?? nearbyAnchor.current;
    if (!anchor) return rawStrays;
    return rawStrays.filter(
      (s) =>
        Number.isFinite(Number(s.public_lat)) &&
        distanceMetres(anchor, { lat: Number(s.public_lat), lng: Number(s.public_lng) }) <= NEARBY_KM * 1000
    );
  }, [rawStrays, userCoords]);

  const filteredStrays = useMemo(() => {
    const now = Date.now();
    const q = searchQuery.trim().toLowerCase();
    return nearbyStrays.filter((stray) => {
      if (filterSpecies !== 'all' && stray.species !== filterSpecies) return false;

      for (const tag of activeTags) {
        if (tag === 'urgent' && stray.health_status !== 'injured') return false;
        if (tag === 'hungry' && stray.health_status !== 'needs_food') return false;
        if (tag === 'nursing' && stray.health_status !== 'pregnant_nursing') return false;
        if (tag === 'collared' && stray.health_status !== 'collared') return false;
        if (tag === 'fed_today' && !(stray.last_fed_at && now - new Date(stray.last_fed_at).getTime() < 12 * 60 * 60 * 1000))
          return false;
        if (tag === 'recent' && !(stray.last_seen_at && now - new Date(stray.last_seen_at).getTime() < 24 * 60 * 60 * 1000))
          return false;
      }

      if (q) {
        const hit =
          stray.name?.toLowerCase().includes(q) ||
          stray.coat_description?.toLowerCase().includes(q) ||
          stray.city?.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [nearbyStrays, filterSpecies, activeTags, searchQuery]);

  const { hungryCount, injuredCount, fedTodayCount } = useMemo(() => {
    const now = Date.now();
    return {
      hungryCount: nearbyStrays.filter((s) => s.health_status === 'needs_food' || !s.last_fed_at).length,
      injuredCount: nearbyStrays.filter((s) => s.health_status === 'injured').length,
      fedTodayCount: nearbyStrays.filter(
        (s) => s.last_fed_at && now - new Date(s.last_fed_at).getTime() < 12 * 60 * 60 * 1000
      ).length,
    };
  }, [nearbyStrays]);

  const toggleTag = (tag: TagId) =>
    setActiveTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  const resetFilters = () => {
    setFilterSpecies('all');
    setActiveTags([]);
    setSearchQuery('');
  };

  const filtersActive = filterSpecies !== 'all' || activeTags.length > 0 || searchQuery.trim().length > 0;
  const activeCount = activeTags.length + (filterSpecies !== 'all' ? 1 : 0) + (searchQuery.trim() ? 1 : 0);

  return (
    <div className="relative h-[100dvh] w-[100vw] overflow-hidden bg-[color:var(--sb-bg)] font-sans">
      {/* The map is the page: it fills the viewport edge to edge. */}
      <MapContainer center={DEFAULT_CENTER} zoom={14} zoomControl={false} className="!absolute inset-0 h-full w-full">
        <MapBridge onReady={setMapRef} />
        <MapController center={mapCenter} />
        <ViewportListener onMoveEnd={handleMapMoveEnd} />

        <TileLayer
          key={layer}
          attribution={LAYERS[layer].attribution}
          url={LAYERS[layer].url}
          maxZoom={19}
        />

        {deviceLocation && <MeMarker location={deviceLocation} />}

        {filteredStrays.map((stray) => (
          <StrayMarker
            key={stray.id}
            stray={stray}
            isSelected={selectedStray?.id === stray.id}
            onClick={(s) => setSelectedStray(s)}
          />
        ))}
      </MapContainer>

      {/* =====================================================================
          TOP CENTER: where you are, plus a compact live status
         ===================================================================== */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-col items-center gap-2 px-14 pt-[calc(0.85rem+env(safe-area-inset-top))]">
        <div className="sb-glass pointer-events-auto flex items-center gap-1.5 px-3 py-1.5">
          <MapPin className="h-3.5 w-3.5 text-[color:var(--sb-accent-2)]" />
          <span className="text-[12px] font-bold text-white">{currentCity}</span>
          <span
            className={`ml-0.5 h-1.5 w-1.5 rounded-full ${
              loadError ? 'bg-red-500' : 'bg-emerald-400 animate-pulse'
            }`}
          />
        </div>

        {/* Live care snapshot — real numbers from the nearby set */}
        <div className="pointer-events-auto w-full max-w-md">
          <div className="sb-glass grid grid-cols-3 divide-x divide-white/10 px-1 py-1.5">
            <button
              onClick={() => toggleTag('hungry')}
              className={`flex flex-col items-center rounded-xl px-1 py-0.5 transition ${
                activeTags.includes('hungry') ? 'bg-amber-500/15' : ''
              }`}
            >
              <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-amber-300">Hungry</span>
              <span className="text-lg font-black leading-tight text-white">{hungryCount}</span>
            </button>
            <button
              onClick={() => toggleTag('urgent')}
              className={`flex flex-col items-center rounded-xl px-1 py-0.5 transition ${
                activeTags.includes('urgent') ? 'bg-red-500/15' : ''
              }`}
            >
              <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-red-300">Urgent</span>
              <span className="text-lg font-black leading-tight text-white">{injuredCount}</span>
            </button>
            <button
              onClick={() => toggleTag('fed_today')}
              className={`flex flex-col items-center rounded-xl px-1 py-0.5 transition ${
                activeTags.includes('fed_today') ? 'bg-emerald-500/15' : ''
              }`}
            >
              <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-emerald-300">Fed today</span>
              <span className="text-lg font-black leading-tight text-white">{fedTodayCount}</span>
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          TOP RIGHT: filter button (sits under the account avatar)
         ===================================================================== */}
      <div className="absolute right-3 top-[calc(4.5rem+env(safe-area-inset-top))] z-40 sm:right-4">
        <button
          onClick={() => setIsFilterOpen((v) => !v)}
          aria-label="Open filters"
          aria-expanded={isFilterOpen}
          className={`sb-map-btn !h-12 !w-12 !rounded-2xl ${
            filtersActive ? '!border-emerald-400/60 !bg-emerald-500/20 !text-emerald-200' : ''
          }`}
        >
          <Filter className="h-5 w-5" />
          {activeCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-black text-slate-950">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* =====================================================================
          FILTER PANEL
         ===================================================================== */}
      {isFilterOpen && (
        <div className="absolute inset-x-0 top-[calc(8.2rem+env(safe-area-inset-top))] z-40 px-3 sm:inset-x-auto sm:right-4 sm:w-80 sm:px-0">
          <div className="sb-glass animate-pop-in space-y-3 p-3.5">
            {/* Species */}
            <div>
              <div className="sb-label mb-1.5">Species</div>
              <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-black/20 p-1">
                {(['all', 'cat', 'dog'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterSpecies(s)}
                    className={`rounded-lg py-1.5 text-[11px] font-bold transition ${
                      filterSpecies === s ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {s === 'all' ? 'All' : s === 'cat' ? 'Cats' : 'Dogs'}
                  </button>
                ))}
              </div>
            </div>

            {/* Condition chips */}
            <div>
              <div className="sb-label mb-1.5">Condition</div>
              <div className="flex flex-wrap gap-1.5">
                {TAGS.map((tag) => {
                  const on = activeTags.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      aria-pressed={on}
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
                        on
                          ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:text-white'
                      }`}
                    >
                      {on && <Check className="h-3 w-3" />}
                      {tag.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Name, markings or street…"
                className="w-full rounded-xl border border-white/10 bg-black/25 py-2 pl-8 pr-3 text-[12px] text-white placeholder-slate-500 focus:border-emerald-500/70 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between border-t border-white/10 pt-2.5 text-[11px]">
              <span className="font-semibold text-slate-400">
                <b className="text-white">{filteredStrays.length}</b> of {nearbyStrays.length} nearby
              </span>
              <button
                onClick={resetFilters}
                disabled={!filtersActive}
                className="font-bold text-emerald-400 transition hover:text-emerald-300 disabled:opacity-40"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MAP CONTROLS: one tidy stack, bottom right
         ===================================================================== */}
      <div className="pointer-events-none absolute bottom-[calc(6rem+env(safe-area-inset-bottom))] right-3 z-40 flex flex-col gap-2 sm:right-4">
        <button onClick={handleLocateMe} aria-label="Centre on my location" className="sb-map-btn pointer-events-auto">
          <Crosshair
            className={`h-5 w-5 ${
              isLocating || locationStatus === 'loading'
                ? 'animate-spin text-emerald-400'
                : deviceLocation
                  ? 'text-[color:var(--sb-accent-2)]'
                  : 'text-slate-200'
            }`}
          />
        </button>
        <div className="sb-glass pointer-events-auto flex flex-col overflow-hidden !rounded-2xl">
          <button
            onClick={() => mapRef?.zoomIn()}
            aria-label="Zoom in"
            className="flex h-11 w-12 items-center justify-center text-slate-200 transition hover:bg-white/5 active:scale-95"
          >
            <ZoomIn className="h-5 w-5" />
          </button>
          <div className="h-px w-full bg-white/10" />
          <button
            onClick={() => mapRef?.zoomOut()}
            aria-label="Zoom out"
            className="flex h-11 w-12 items-center justify-center text-slate-200 transition hover:bg-white/5 active:scale-95"
          >
            <ZoomOut className="h-5 w-5" />
          </button>
        </div>
        <button
          onClick={() => setIsLayerMenuOpen((v) => !v)}
          aria-label="Map layers"
          aria-expanded={isLayerMenuOpen}
          className={`sb-map-btn pointer-events-auto ${isLayerMenuOpen ? '!bg-emerald-500/20 !text-emerald-200' : ''}`}
        >
          <Layers className="h-5 w-5" />
        </button>
        <button
          onClick={refreshMarkers}
          aria-label="Refresh markers"
          className="sb-map-btn pointer-events-auto"
        >
          <RefreshCw className={`h-5 w-5 ${isFetching ? 'animate-spin text-emerald-400' : 'text-slate-200'}`} />
        </button>

        {isLayerMenuOpen && (
          <div className="sb-glass animate-pop-in pointer-events-auto !absolute bottom-0 right-14 w-36 p-1">
            {(Object.keys(LAYERS) as Array<keyof typeof LAYERS>).map((key) => (
              <button
                key={key}
                onClick={() => {
                  setLayer(key);
                  setIsLayerMenuOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-[11px] font-bold transition ${
                  layer === key ? 'bg-emerald-500/20 text-emerald-200' : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                {LAYERS[key].label}
                {layer === key && <Check className="h-3 w-3" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* =====================================================================
          LOCATION PERMISSION / LOADING NOTICE
         ===================================================================== */}
      {showLocationHint && locationStatus !== 'ready' && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[calc(11rem+env(safe-area-inset-bottom))] z-30 px-3.5">
          <div className="sb-glass pointer-events-auto mx-auto flex max-w-md items-start gap-2 px-3 py-2">
            {locationStatus === 'loading' ? (
              <RefreshCw className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-[color:var(--sb-accent-2)]" />
            ) : (
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
            )}
            <p className="flex-1 text-[11px] leading-snug text-slate-300">
              {locationStatus === 'loading'
                ? 'Finding your location so we can place your ME bubble…'
                : 'Location is blocked, so your ME bubble is hidden. Allow location for this site to turn it on.'}
            </p>
            {locationStatus !== 'loading' && (
              <button
                onClick={handleLocateMe}
                className="shrink-0 rounded-lg border border-emerald-400/50 bg-emerald-500/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-200"
              >
                Retry
              </button>
            )}
            <button
              onClick={() => setShowLocationHint(false)}
              aria-label="Dismiss location notice"
              className="shrink-0 rounded-lg p-0.5 text-slate-400 transition hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Markers could not load */}
      {loadError && (
        <div className="absolute inset-x-0 top-[calc(10.6rem+env(safe-area-inset-top))] z-30 flex justify-center px-3.5">
          <button
            onClick={refreshMarkers}
            className="sb-glass flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold text-red-300"
          >
            <ShieldAlert className="h-3.5 w-3.5" /> Could not load strays — tap to retry
          </button>
        </div>
      )}

      {/* Nothing matches the current filters */}
      {!loadError && filteredStrays.length === 0 && nearbyStrays.length > 0 && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-6">
          <div className="sb-glass pointer-events-auto max-w-xs p-4 text-center">
            <p className="text-[13px] font-black text-white">No buddies match those filters</p>
            <p className="mt-1 text-[11px] text-slate-400">Widen the filter or reset it to see nearby strays.</p>
            <button
              onClick={resetFilters}
              className="mt-2.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-white"
            >
              Reset filters
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          BOTTOM ACTION BAR
         ===================================================================== */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 px-3.5 pb-[calc(0.85rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-md items-center justify-center">
          <button
            onClick={() => (user ? setIsTagModalOpen(true) : setIsAuthModalOpen(true))}
            className="sb-primary pointer-events-auto w-full max-w-[280px] py-3 text-[13px]"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-950/90 text-emerald-300">
              <Plus className="h-3.5 w-3.5 stroke-[3]" />
            </span>
            Report a stray
          </button>
        </div>
      </div>

      {/* -------- overlays ------------------------------------------------ */}

      <StrayDrawer
        stray={selectedStray}
        onClose={() => setSelectedStray(null)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onActionSuccess={(updated) => {
          if (updated) {
            setSelectedStray(updated);
            setRawStrays((prev: Stray[]) => prev.map((s: Stray) => (s.id === updated.id ? updated : s)));
          } else {
            refreshMarkers();
          }
        }}
      />

      {isTagModalOpen && (
        <TagStrayModal
          userCoords={userCoords}
          onClose={() => setIsTagModalOpen(false)}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onSuccess={() => refreshMarkers()}
        />
      )}

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      {isCampaignPopupOpen && (
        <CampaignPopupModal
          onClose={() => setIsCampaignPopupOpen(false)}
          onOpenAnnouncements={() => router.push('/campaigns')}
        />
      )}
    </div>
  );
}
