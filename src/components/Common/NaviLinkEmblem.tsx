import React from 'react';

interface NaviLinkEmblemProps {
  className?: string;
  size?: number | string;
}

export const NaviLinkEmblem: React.FC<NaviLinkEmblemProps> = ({
  className = 'w-16 h-16',
}) => {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} transition-transform duration-300 drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]`}
    >
      <defs>
        {/* Crisp White to Metallic Silver Gradient */}
        <linearGradient id="emblemWhiteGrad" x1="50" y1="8" x2="50" y2="92" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="60%" stopColor="#F1F5F9" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>

        {/* Brushed Metallic Silver to Light Blue Gradient */}
        <linearGradient id="emblemAccentGrad" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="45%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>

        {/* Light Blue Subtle Glow Gradient */}
        <linearGradient id="skyBlueGlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="50%" stopColor="#0EA5E9" />
          <stop offset="100%" stopColor="#BAE6FD" />
        </linearGradient>

        {/* Subtle Drop Shadow Glow */}
        <filter id="softEmblemGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* --- Ambient Fluid Connecting Rings (Symbolizing Seamless Link) --- */}
      {/* Outer Precision Compass Orbit */}
      <circle
        cx="50"
        cy="52"
        r="38"
        stroke="url(#emblemWhiteGrad)"
        strokeWidth="1.75"
        strokeDasharray="40 5 12 5 28 5"
        strokeLinecap="round"
        opacity="0.85"
      />

      {/* Outer Secondary Fluid Orbit Loop */}
      <path
        d="M 18 52 C 18 34, 32 20, 50 20 C 68 20, 82 34, 82 52 C 82 70, 68 84, 50 84 C 36 84, 25 74, 20 62"
        stroke="url(#emblemAccentGrad)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="90 8 30 6"
        opacity="0.7"
      />

      {/* Inner Concentric Link Ring */}
      <circle
        cx="50"
        cy="52"
        r="25"
        stroke="#FFFFFF"
        strokeWidth="1.25"
        strokeDasharray="18 4 6 4"
        opacity="0.5"
      />

      {/* Interconnecting Fluid S-Curve Waves (Link Flow) */}
      <path
        d="M 27 63 C 34 72, 43 75, 50 75 C 57 75, 66 72, 73 63"
        stroke="url(#skyBlueGlowGrad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.9"
      />

      {/* Left (West) Compass Pointer */}
      <path
        d="M 14 52 L 26 48.5 L 23 52 L 26 55.5 Z"
        fill="#FFFFFF"
        opacity="0.9"
      />

      {/* Right (East) Compass Pointer */}
      <path
        d="M 86 52 L 74 48.5 L 77 52 L 74 55.5 Z"
        fill="#FFFFFF"
        opacity="0.9"
      />

      {/* Bottom (South) Needle Point */}
      <path
        d="M 50 88 L 47 74 L 50 77 L 53 74 Z"
        fill="#FFFFFF"
        opacity="0.95"
      />

      {/* --- Upward-Pointing Modern Navigation Arrow (Replacing North Needle) --- */}
      {/* Left Facet of Upward Navigation Arrow */}
      <path
        d="M 50 8 L 31 46 L 47.5 40.5 L 50 42 Z"
        fill="url(#emblemWhiteGrad)"
        filter="url(#softEmblemGlow)"
      />

      {/* Right Facet of Upward Navigation Arrow (Brushed Metallic with Sky-Blue Glow) */}
      <path
        d="M 50 8 L 50 42 L 52.5 40.5 L 69 46 Z"
        fill="url(#emblemAccentGrad)"
        filter="url(#softEmblemGlow)"
      />

      {/* Crisp Center Spine Divider */}
      <line
        x1="50"
        y1="9"
        x2="50"
        y2="41.5"
        stroke="#38BDF8"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Fluid Sweeping Connecting Arcs from Arrow Base into Outer Rings */}
      <path
        d="M 33 46 C 26 48, 22 50, 18 52"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M 67 46 C 74 48, 78 50, 82 52"
        stroke="#38BDF8"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Central Nexus / Core Node */}
      <circle
        cx="50"
        cy="52"
        r="4.5"
        fill="#FFFFFF"
        stroke="#0EA5E9"
        strokeWidth="1.5"
      />
      <circle
        cx="50"
        cy="52"
        r="1.75"
        fill="#38BDF8"
      />

      {/* Subtle Micro Coordinate Crosshair Ticks */}
      <line x1="50" y1="4" x2="50" y2="0" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
      <line x1="96" y1="52" x2="100" y2="52" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
      <line x1="0" y1="52" x2="4" y2="52" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
      <line x1="50" y1="96" x2="50" y2="100" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
    </svg>
  );
};
