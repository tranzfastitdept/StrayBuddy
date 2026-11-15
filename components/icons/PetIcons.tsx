/**
 * Pet-themed SVG icons written as small TypeScript components.
 * They share one prop shape so they can be dropped in wherever a lucide icon sits.
 */

import React from 'react';

export type PetIconProps = {
  className?: string;
  size?: number;
  /** Fill opacity for the solid shapes; keeps the set consistent. */
  strokeWidth?: number;
};

const base = (size?: number) => ({
  width: size ?? 24,
  height: size ?? 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
  'aria-hidden': true as const,
});

/** Cat face with pointed ears. */
export function CatIcon({ className, size, strokeWidth = 1.8 }: PetIconProps) {
  return (
    <svg {...base(size)} className={className} stroke="currentColor" strokeWidth={strokeWidth}>
      <path d="M4 10.5 4.6 4.2l5 3.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 10.5 19.4 4.2l-5 3.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 11a8 8 0 0 0 16 0" strokeLinecap="round" />
      <circle cx="9" cy="11" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="15" cy="11" r="0.9" fill="currentColor" stroke="none" />
      <path d="M12 13.6l1.4 1.3H10.6z" fill="currentColor" stroke="none" />
      <path d="M12 15v1.6M12 15l-2.4.9M12 15l2.4.9" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

/** Dog face with a floppy ear. */
export function DogIcon({ className, size, strokeWidth = 1.8 }: PetIconProps) {
  return (
    <svg {...base(size)} className={className} stroke="currentColor" strokeWidth={strokeWidth}>
      <path
        d="M7.4 6.6C4.8 7.2 3.4 10 4 12.4c.5 2.2 2.8 3.2 4.6 2.2 1.6-.9 2-3.2 1.4-5.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M20 6.4 20.5 3l3 2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.4 13.4a7 7 0 0 0 12.2.6" strokeLinecap="round" />
      <circle cx="9.4" cy="11.6" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="15.2" cy="11.4" r="0.9" fill="currentColor" stroke="none" />
      <ellipse cx="12.2" cy="16.4" rx="2.6" ry="2" />
      <ellipse cx="12.2" cy="15.2" rx="1.3" ry="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Paw print — the main brand accent. */
export function PawIcon({ className, size }: PetIconProps) {
  return (
    <svg {...base(size)} className={className} fill="currentColor">
      <ellipse cx="12" cy="16.2" rx="5.1" ry="4.2" />
      <ellipse cx="5.4" cy="11.6" rx="2.1" ry="1.8" transform="rotate(-18 5.4 11.6)" />
      <ellipse cx="9" cy="7.8" rx="2" ry="1.9" />
      <ellipse cx="15" cy="7.8" rx="2" ry="1.9" />
      <ellipse cx="18.6" cy="11.6" rx="2.1" ry="1.8" transform="rotate(18 18.6 11.6)" />
    </svg>
  );
}

/** Heart with a paw inside — used for care and donation actions. */
export function HeartPawIcon({ className, size, strokeWidth = 1.8 }: PetIconProps) {
  return (
    <svg {...base(size)} className={className} stroke="currentColor" strokeWidth={strokeWidth}>
      <path
        d="M12 20.2s-8-4.6-8-9.7A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 8 3.1c0 5.1-8 9.7-8 9.7Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <ellipse cx="12" cy="13.4" rx="1.9" ry="1.5" fill="currentColor" stroke="none" />
      <circle cx="10" cy="10.7" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="12" cy="10.1" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="14" cy="10.7" r="0.7" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Bowl with steam — feeding logs. */
export function BowlIcon({ className, size, strokeWidth = 1.8 }: PetIconProps) {
  return (
    <svg {...base(size)} className={className} stroke="currentColor" strokeWidth={strokeWidth}>
      <path d="M3.4 13.4h17.2l-1.6 5.2a2 2 0 0 1-1.9 1.4H6.9a2 2 0 0 1-1.9-1.4L3.4 13.4Z" strokeLinejoin="round" />
      <path d="M6.6 13.4c0-2.4 2.4-3 5.4-3s5.4.6 5.4 3" strokeLinecap="round" />
      <path d="M9.4 7.4c-.6-1.2.6-2 .2-3.2M13.6 7.4c-.6-1.2.6-2 .2-3.2" strokeLinecap="round" />
    </svg>
  );
}

/** Water drop — hydration care. */
export function DropIcon({ className, size, strokeWidth = 1.8 }: PetIconProps) {
  return (
    <svg {...base(size)} className={className} stroke="currentColor" strokeWidth={strokeWidth}>
      <path d="M12 3.6c3.2 3.6 5.6 6.4 5.6 9.6a5.6 5.6 0 0 1-11.2 0c0-3.2 2.4-6 5.6-9.6Z" strokeLinejoin="round" />
      <path d="M9.6 14.2a2.6 2.6 0 0 0 2.6 2.6" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

/** Location pin made of a paw. */
export function PawPinIcon({ className, size, strokeWidth = 1.8 }: PetIconProps) {
  return (
    <svg {...base(size)} className={className} stroke="currentColor" strokeWidth={strokeWidth}>
      <path d="M12 21s7-6.4 7-11a7 7 0 1 0-14 0c0 4.6 7 11 7 11Z" strokeLinejoin="round" />
      <ellipse cx="12" cy="11.4" rx="2.2" ry="1.8" fill="currentColor" stroke="none" />
      <circle cx="9.6" cy="8.4" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="12" cy="7.7" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="14.4" cy="8.4" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Shield with a paw — admin / trust. */
export function ShieldPawIcon({ className, size, strokeWidth = 1.8 }: PetIconProps) {
  return (
    <svg {...base(size)} className={className} stroke="currentColor" strokeWidth={strokeWidth}>
      <path d="M12 3 5 6v5.4c0 4.4 3 8 7 9.6 4-1.6 7-5.2 7-9.6V6l-7-3Z" strokeLinejoin="round" />
      <ellipse cx="12" cy="12.6" rx="1.8" ry="1.5" fill="currentColor" stroke="none" />
      <circle cx="9.9" cy="10" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="12" cy="9.4" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="14.1" cy="10" r="0.7" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Megaphone with a paw badge — announcements. */
export function MegaphonePawIcon({ className, size, strokeWidth = 1.8 }: PetIconProps) {
  return (
    <svg {...base(size)} className={className} stroke="currentColor" strokeWidth={strokeWidth}>
      <path d="M4 10.4v3.2l11.4 5.2V5.2L4 10.4Z" strokeLinejoin="round" />
      <path d="M7.4 14.6v3.4a1.8 1.8 0 0 0 3.6 0v-2.2M19.4 9.2a4 4 0 0 1 0 5.6" strokeLinecap="round" />
    </svg>
  );
}

/** Two overlapping people/pets — community. */
export function PackIcon({ className, size, strokeWidth = 1.8 }: PetIconProps) {
  return (
    <svg {...base(size)} className={className} stroke="currentColor" strokeWidth={strokeWidth}>
      <circle cx="9" cy="8.6" r="3.2" />
      <path d="M3.4 19.4a5.6 5.6 0 0 1 11.2 0" strokeLinecap="round" />
      <circle cx="17.4" cy="9.6" r="2.6" />
      <path d="M14.4 19.4a4.6 4.6 0 0 1 6.8-3.2" strokeLinecap="round" />
    </svg>
  );
}
