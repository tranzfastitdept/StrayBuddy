"use client";

import React, { useMemo } from 'react';
import { Marker } from 'react-leaflet';
import L from 'leaflet';
import { DeviceLocation } from '../../lib/geo/useDeviceLocation';

interface MeMarkerProps {
  location: DeviceLocation;
  isStale?: boolean;
}

/**
 * The user's own position: a blue bubble labelled "ME" with a soft accuracy halo.
 */
export default function MeMarker({ location, isStale }: MeMarkerProps) {
  const icon = useMemo(() => {
    const html = `
      <div class="relative flex flex-col items-center select-none pointer-events-none">
        <div class="absolute top-0 w-14 h-14 rounded-full bg-sky-400/25 animate-radar-ping"></div>
        <div class="relative w-11 h-11 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 border-[3px] border-white shadow-[0_6px_18px_rgba(2,132,199,0.55)] flex items-center justify-center">
          <span class="text-[11px] font-black tracking-wide text-white">ME</span>
        </div>
        <div class="mt-1 px-2 py-0.5 rounded-full bg-slate-900/95 border border-sky-400/60 text-[9px] font-bold tracking-wider text-sky-300 shadow-lg whitespace-nowrap">
          ${isStale ? 'YOU · last seen' : 'YOU'}
        </div>
      </div>
    `;

    return L.divIcon({
      html,
      className: 'me-custom-marker',
      iconSize: [56, 74],
      iconAnchor: [28, 26],
    });
  }, [isStale]);

  return <Marker position={[location.lat, location.lng]} icon={icon} zIndexOffset={1000} />;
}
