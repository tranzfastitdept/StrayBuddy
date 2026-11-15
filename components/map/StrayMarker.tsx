"use client";

import React, { useMemo } from 'react';
import { Marker } from 'react-leaflet';
import L from 'leaflet';
import { Stray } from '../../types/stray';

interface StrayMarkerProps {
  stray: Stray;
  isSelected: boolean;
  onClick: (stray: Stray) => void;
}

/** Status colour + label used by both the ring and the badge. */
const STATUS: Record<string, { color: string; label: string }> = {
  injured: { color: '#ef4444', label: 'Urgent' },
  needs_food: { color: '#f59e0b', label: 'Hungry' },
  pregnant_nursing: { color: '#ec4899', label: 'Nursing' },
  collared: { color: '#8b5cf6', label: 'Collared' },
  healthy: { color: '#22c55e', label: 'Safe' },
};

const FALLBACK_PHOTO = '/icon.svg';

/**
 * Map pin: a small rounded avatar card over a name pill.
 * Status lives in the ring colour and a dot — no constant flashing.
 */
export default function StrayMarker({ stray, isSelected, onClick }: StrayMarkerProps) {
  const status = STATUS[stray.health_status] || STATUS.healthy;

  const isRecentlyFed = useMemo(() => {
    if (!stray.last_fed_at) return false;
    return (Date.now() - new Date(stray.last_fed_at).getTime()) / 3_600_000 < 4;
  }, [stray.last_fed_at]);

  const isNew = useMemo(() => {
    if (!stray.created_at) return false;
    return (Date.now() - new Date(stray.created_at).getTime()) / 3_600_000 < 24;
  }, [stray.created_at]);

  const icon = useMemo(() => {
    const isCat = stray.species === 'cat';
    const photo = stray.identifier_photo_url || stray.photo_url || FALLBACK_PHOTO;
    const ring = isSelected ? '#22d3ee' : status.color;

    const html = `
      <div class="relative flex flex-col items-center pointer-events-auto cursor-pointer transition-transform duration-200 ${
        isSelected ? 'scale-110' : 'hover:scale-105'
      }">
        ${isNew ? `<span class="absolute -top-1 left-1/2 -translate-x-1/2 rounded-full bg-sky-500 px-1.5 py-[1px] text-[8px] font-black uppercase tracking-wide text-white shadow">New</span>` : ''}

        <div class="relative h-[50px] w-[50px] rounded-[16px] bg-slate-900 p-[2.5px] shadow-[0_6px_18px_rgba(2,6,23,0.5)] ${
          stray.health_status === 'injured' ? 'animate-soft-pulse' : ''
        }" style="box-shadow:0 0 0 2.5px ${ring}, 0 6px 18px rgba(2,6,23,0.5)">
          <div class="h-full w-full overflow-hidden rounded-[13px] bg-slate-800">
            <img src="${photo}" alt="" class="h-full w-full object-cover" loading="lazy"
              onerror="this.style.display='none'" />
          </div>
          <span class="absolute -bottom-1 -right-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-slate-900 text-[9px] shadow ring-1 ring-white/15">
            ${isCat ? '🐱' : '🐶'}
          </span>
          ${
            stray.is_tnr
              ? `<span class="absolute -left-1 -top-1 rounded-full bg-teal-500 px-1 text-[7px] font-black text-slate-950 ring-1 ring-slate-900">TNR</span>`
              : ''
          }
        </div>

        <div class="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] -mt-px" style="border-top-color:${ring}"></div>

        <div class="mt-0.5 flex items-center gap-1 rounded-full border px-2 py-[2px] text-[10px] font-bold shadow-md backdrop-blur-md whitespace-nowrap ${
          isSelected
            ? 'border-cyan-300 bg-cyan-500 text-white'
            : 'border-white/15 bg-slate-900/92 text-slate-100'
        }">
          <span class="h-1.5 w-1.5 rounded-full" style="background:${isRecentlyFed ? '#34d399' : status.color}"></span>
          <span class="max-w-[92px] truncate">${stray.name || 'Buddy'}</span>
          <span class="text-[9px] font-semibold text-emerald-400">🍖${stray.fed_count || 0}</span>
        </div>
      </div>
    `;

    return L.divIcon({
      html,
      className: 'stray-custom-marker',
      iconSize: [70, 86],
      iconAnchor: [35, 55],
    });
  }, [stray, isSelected, status, isRecentlyFed, isNew]);

  return (
    <Marker
      position={[Number(stray.public_lat), Number(stray.public_lng)]}
      icon={icon}
      zIndexOffset={isSelected ? 1000 : 0}
      eventHandlers={{
        click: (e) => {
          L.DomEvent.stopPropagation(e);
          onClick(stray);
        },
      }}
    />
  );
}
