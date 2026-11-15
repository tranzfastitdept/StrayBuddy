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

export default function StrayMarker({ stray, isSelected, onClick }: StrayMarkerProps) {
  // Determine color and status badge
  const statusConfig = useMemo(() => {
    switch (stray.health_status) {
      case 'injured':
        return {
          color: '#ef4444', // Red
          bgBadge: 'bg-red-500',
          badgeText: 'Urgent',
          isUrgent: true,
        };
      case 'needs_food':
        return {
          color: '#f59e0b', // Amber
          bgBadge: 'bg-amber-500',
          badgeText: 'Hungry',
          isUrgent: false,
        };
      case 'pregnant_nursing':
        return {
          color: '#ec4899', // Pink
          bgBadge: 'bg-pink-500',
          badgeText: 'Nursing',
          isUrgent: false,
        };
      case 'collared':
        return {
          color: '#8b5cf6', // Purple
          bgBadge: 'bg-purple-500',
          badgeText: 'Lost?',
          isUrgent: false,
        };
      case 'healthy':
      default:
        return {
          color: '#10b981', // Emerald
          bgBadge: 'bg-emerald-500',
          badgeText: 'Safe',
          isUrgent: false,
        };
    }
  }, [stray.health_status]);

  // Check feeding status (< 4 hours is well-fed)
  const isRecentlyFed = useMemo(() => {
    if (!stray.last_fed_at) return false;
    const diffHours = (Date.now() - new Date(stray.last_fed_at).getTime()) / (1000 * 60 * 60);
    return diffHours < 4;
  }, [stray.last_fed_at]);

  // Construct Life360 box pin icon
  const customIcon = useMemo(() => {
    const isCat = stray.species === 'cat';
    const speciesEmoji = isCat ? '🐱' : '🐶';
    const photoUrl = stray.identifier_photo_url || stray.photo_url || '';

    const avatarHtml = photoUrl
      ? `<img src="${photoUrl}" alt="${stray.name}" class="w-full h-full object-cover select-none pointer-events-none" onerror="this.src='https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=300'" />`
      : `<div class="w-full h-full flex items-center justify-center text-xl bg-slate-800 text-white font-bold select-none">${speciesEmoji}</div>`;

    const html = `
      <div class="relative group cursor-pointer transition-all duration-300 ease-out select-none ${
        isSelected ? 'scale-115 z-50' : 'hover:scale-105 z-20'
      }">
        <!-- Pulsing radar wave for selected or urgent status -->
        ${
          statusConfig.isUrgent || isSelected
            ? `<div class="absolute -inset-2 rounded-2xl opacity-75 animate-radar-ping pointer-events-none" style="background-color: ${statusConfig.color};"></div>`
            : ''
        }

        <!-- Life360 Pin Box Architecture:
             |---------|
             |  PHOTO  |
             |---------|
                  ▼
          { Name of Animal } 🍖x
        -->
        <div class="relative flex flex-col items-center drop-shadow-xl">
          
          <!-- Box Top Photo Card Frame -->
          <div class="relative w-[52px] h-[52px] rounded-2xl p-[3px] bg-slate-900 shadow-2xl flex items-center justify-center transition-all"
               style="box-shadow: 0 4px 16px rgba(0,0,0,0.45), 0 0 0 2.5px ${
                 isSelected ? '#0284c7' : statusConfig.color
               };">
            
            <div class="w-full h-full rounded-[13px] overflow-hidden bg-slate-800 flex items-center justify-center">
              ${avatarHtml}
            </div>

            <!-- Species mini badge at bottom-right corner -->
            <div class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-900 border border-slate-700/80 flex items-center justify-center text-[10px] shadow-md">
              ${speciesEmoji}
            </div>

            <!-- TNR tag at top-left corner -->
            ${
              stray.is_tnr
                ? `<div class="absolute -top-1.5 -left-1.5 px-1.5 py-0.2 bg-teal-500 text-slate-950 font-black text-[8px] rounded-full shadow border border-slate-900">TNR</div>`
                : ''
            }
          </div>

          <!-- Pointer Beak (Tail) pointing to map coordinates -->
          <div class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] -mt-[1px] transition-colors"
               style="border-t-color: ${isSelected ? '#0284c7' : statusConfig.color};">
          </div>

          <!-- Name & Meal Pill: { name of the animal here } -->
          <div class="mt-1 px-2.5 py-0.5 rounded-full backdrop-blur-md text-[11px] font-bold tracking-tight shadow-md whitespace-nowrap transition-all duration-200 border flex items-center gap-1.5 ${
            isSelected
              ? 'bg-sky-500 text-white border-sky-400 font-extrabold shadow-sky-500/30'
              : 'bg-slate-900/95 text-slate-100 border-slate-700/80'
          }">
            <span class="w-2 h-2 rounded-full ${isRecentlyFed ? 'bg-emerald-400' : 'bg-amber-400'} flex-shrink-0"></span>
            <span class="truncate max-w-[95px]">{ ${stray.name || 'Buddy'} }</span>
            <span class="text-[9px] opacity-85 font-semibold text-emerald-400">🍖${stray.fed_count || 0}</span>
          </div>

        </div>
      </div>
    `;

    return L.divIcon({
      html,
      className: 'stray-custom-marker',
      iconSize: [64, 86],
      iconAnchor: [32, 54],
    });
  }, [stray, isSelected, statusConfig, isRecentlyFed]);

  return (
    <Marker
      position={[stray.public_lat, stray.public_lng]}
      icon={customIcon}
      eventHandlers={{
        click: (e) => {
          L.DomEvent.stopPropagation(e);
          onClick(stray);
        },
      }}
    />
  );
}
