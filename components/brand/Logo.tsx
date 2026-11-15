/**
 * StrayBuddy brand mark.
 * A single badge split down the middle: cat face on the left, dog face on the right.
 * Drawn as inline SVG so it stays crisp at every size and needs no image files.
 */

type LogoProps = {
  /** Pixel size of the square mark. */
  size?: number;
  /** 'badge' shows the round tile behind the faces, 'bare' shows only the faces. */
  variant?: 'badge' | 'bare';
  className?: string;
  /** Accessible label. Pass an empty string when the logo sits next to the word StrayBuddy. */
  title?: string;
};

export default function Logo({
  size = 40,
  variant = 'badge',
  className = '',
  title = 'StrayBuddy logo',
}: LogoProps) {
  const labelled = title.length > 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      role={labelled ? 'img' : undefined}
      aria-label={labelled ? title : undefined}
      aria-hidden={labelled ? undefined : true}
    >
      {labelled && <title>{title}</title>}

      <defs>
        <linearGradient id="sb-cat" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>
        <linearGradient id="sb-dog" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
        <clipPath id="sb-face-clip">
          <circle cx="32" cy="32" r="26" />
        </clipPath>
      </defs>

      {variant === 'badge' && (
        <circle cx="32" cy="32" r="30" fill="#0b1220" stroke="#1e293b" strokeWidth="2" />
      )}

      {/* Two halves of one face tile: cyan for the cat side, amber for the dog side */}
      <g clipPath="url(#sb-face-clip)">
        <rect x="6" y="6" width="26" height="52" fill="url(#sb-cat)" opacity="0.18" />
        <rect x="32" y="6" width="26" height="52" fill="url(#sb-dog)" opacity="0.18" />
      </g>

      {/* Cat face — left half */}
      <g>
        {/* Ears */}
        <path
          d="M15 22 L14.5 10.5 L24.5 17 Z"
          fill="url(#sb-cat)"
          stroke="#0b1220"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Head */}
        <circle cx="24" cy="33" r="12" fill="url(#sb-cat)" stroke="#0b1220" strokeWidth="1.2" />
        {/* Eyes */}
        <ellipse cx="20" cy="31.5" rx="1.6" ry="2.4" fill="#0b1220" />
        <ellipse cx="28" cy="31.5" rx="1.6" ry="2.4" fill="#0b1220" />
        {/* Nose + whiskers */}
        <path d="M24 35.4 l1.7 1.6 -3.4 0 Z" fill="#0b1220" />
        <path
          d="M24 37 v2.2 M24 37 l-4 1 M24 37 l4 1"
          stroke="#0b1220"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.65"
        />
      </g>

      {/* Dog face — right half */}
      <g>
        {/* Floppy ear */}
        <path
          d="M51.5 21.5 c3.6 1.2 3.4 7.6 0.6 10.4 -2.4 2.2 -5.4 1.2 -5.8 -1.6 -0.6 -3 1.4 -9.8 5.2 -8.8 Z"
          fill="#c2410c"
          stroke="#0b1220"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Head */}
        <circle cx="41" cy="33.5" r="11.5" fill="url(#sb-dog)" stroke="#0b1220" strokeWidth="1.2" />
        {/* Eyes */}
        <circle cx="37.5" cy="32" r="1.7" fill="#0b1220" />
        <circle cx="45" cy="32" r="1.7" fill="#0b1220" />
        {/* Snout + nose */}
        <ellipse cx="41" cy="38" rx="4.2" ry="3.2" fill="#fed7aa" opacity="0.9" />
        <ellipse cx="41" cy="36.8" rx="2.1" ry="1.6" fill="#0b1220" />
        <path
          d="M41 38.6 v1.4 M41 40 l-2 1.2 M41 40 l2 1.2"
          stroke="#0b1220"
          strokeWidth="0.9"
          strokeLinecap="round"
        />
      </g>

      {/* The seam that makes the two faces read as one mark */}
      <path d="M32 7 V57" stroke="#0b1220" strokeWidth="1.4" opacity="0.35" />

      {/* Paw charm under the seam */}
      <g transform="translate(32 58.5)" opacity="0.9">
        <ellipse cx="0" cy="1.4" rx="2.6" ry="2.1" fill="#e2e8f0" />
        <circle cx="-3.1" cy="-1.2" r="1.1" fill="#e2e8f0" />
        <circle cx="-1" cy="-2.1" r="1.1" fill="#e2e8f0" />
        <circle cx="1.2" cy="-2.1" r="1.1" fill="#e2e8f0" />
        <circle cx="3.2" cy="-1.2" r="1.1" fill="#e2e8f0" />
      </g>
    </svg>
  );
}

/** Logo plus the StrayBuddy wordmark, used in headers. */
export function LogoWordmark({
  size = 34,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Logo size={size} title="" />
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-black tracking-tight text-white">
          Stray<span className="text-emerald-400">Buddy</span>
        </span>
        <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-400">
          Pet radar network
        </span>
      </span>
    </span>
  );
}
