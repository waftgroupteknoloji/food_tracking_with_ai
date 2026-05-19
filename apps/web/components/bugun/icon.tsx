'use client';

import type { SVGProps } from 'react';

export type IconName =
  | 'flame'
  | 'drop'
  | 'scale'
  | 'activity'
  | 'plus'
  | 'camera'
  | 'sparkles'
  | 'home'
  | 'clock'
  | 'user'
  | 'logout'
  | 'check'
  | 'arrow'
  | 'arrow-dn'
  | 'bolt'
  | 'dumbbell'
  | 'mic'
  | 'edit'
  | 'target'
  | 'fire'
  | 'trend'
  | 'water'
  | 'utensils'
  | 'logo';

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name' | 'stroke'> {
  name: IconName;
  size?: number;
  stroke?: number;
  color?: string;
}

export function Icon({ name, size = 18, stroke = 1.7, color = 'currentColor', style, ...rest }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: stroke,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    style,
    ...rest,
  };

  switch (name) {
    case 'flame':
    case 'fire':
      return (
        <svg {...common}>
          <path d="M12 3c1 4 4 5 4 9a5 5 0 1 1-10 0c0-2 .5-3 2-4-.2 2 .5 3 2 3 0-3 1-5 2-8z" />
        </svg>
      );
    case 'drop':
      return (
        <svg {...common}>
          <path d="M12 3s6 6.5 6 11a6 6 0 1 1-12 0c0-4.5 6-11 6-11z" />
        </svg>
      );
    case 'scale':
      return (
        <svg {...common}>
          <path d="M5 7h14M7 7l-2 7a3 3 0 0 0 6 0L9 7M17 7l-2 7a3 3 0 0 0 6 0l-2-7M12 7v13M8 20h8" />
        </svg>
      );
    case 'activity':
      return (
        <svg {...common}>
          <polyline points="3 12 7 12 10 5 14 19 17 12 21 12" />
        </svg>
      );
    case 'plus':
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case 'camera':
      return (
        <svg {...common}>
          <path d="M3 8h4l2-3h6l2 3h4v11H3z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      );
    case 'sparkles':
      return (
        <svg {...common}>
          <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" />
          <path d="M19 14l.7 1.8L21.5 16.5 19.7 17.2 19 19l-.7-1.8L16.5 16.5 18.3 15.8z" />
        </svg>
      );
    case 'home':
      return (
        <svg {...common}>
          <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case 'user':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
        </svg>
      );
    case 'logout':
      return (
        <svg {...common}>
          <path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l-5-5 5-5M5 12h12" />
        </svg>
      );
    case 'check':
      return (
        <svg {...common}>
          <polyline points="5 12 10 17 19 8" />
        </svg>
      );
    case 'arrow':
      return (
        <svg {...common}>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      );
    case 'arrow-dn':
      return (
        <svg {...common}>
          <path d="M12 5v14M6 13l6 6 6-6" />
        </svg>
      );
    case 'bolt':
      return (
        <svg {...common}>
          <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
        </svg>
      );
    case 'dumbbell':
      return (
        <svg {...common}>
          <path d="M2 12h2M20 12h2M6 8v8M18 8v8M9 7v10M15 7v10M9 12h6" />
        </svg>
      );
    case 'mic':
      return (
        <svg {...common}>
          <rect x="9" y="3" width="6" height="12" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
        </svg>
      );
    case 'edit':
      return (
        <svg {...common}>
          <path d="M4 20h4l10-10-4-4L4 16v4z" />
          <path d="M14 6l4 4" />
        </svg>
      );
    case 'target':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.2" fill={color as string} />
        </svg>
      );
    case 'trend':
      return (
        <svg {...common}>
          <polyline points="3 17 9 11 13 15 21 7" />
          <polyline points="14 7 21 7 21 14" />
        </svg>
      );
    case 'water':
      return (
        <svg {...common}>
          <path d="M12 3s7 7 7 12a7 7 0 0 1-14 0c0-5 7-12 7-12z" />
          <path d="M8 14a4 4 0 0 0 4 4" />
        </svg>
      );
    case 'utensils':
      return (
        <svg {...common}>
          <path d="M4 3v8a2 2 0 0 0 2 2v8M6 3v8M8 3v8M16 3c-2 0-3 3-3 6s1 4 3 4v8" />
        </svg>
      );
    case 'logo':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" style={style}>
          <path
            d="M4 12c0-4 3-7 8-7s8 3 8 7v3a5 5 0 0 1-5 5h-6a5 5 0 0 1-5-5z"
            fill={color as string}
            opacity={0.18}
          />
          <path
            d="M8 11c1.5 0 2.5 1 2.5 2.5S9.5 16 8 16M16 11c-1.5 0-2.5 1-2.5 2.5S14.5 16 16 16"
            stroke={color as string}
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="12" cy="9" r="1" fill={color as string} />
        </svg>
      );
    default:
      return null;
  }
}
