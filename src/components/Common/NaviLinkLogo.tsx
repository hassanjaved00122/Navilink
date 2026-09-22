import React from 'react';
import { NaviLink3DArrow } from './NaviLink3DArrow';

interface NaviLinkLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'hero';
  showText?: boolean;
  showTagline?: boolean;
  className?: string;
  animate?: boolean;
}

export const NaviLinkLogo: React.FC<NaviLinkLogoProps> = ({
  size = 'md',
  showText = true,
  showTagline = false,
  className = '',
  animate = true,
}) => {
  const titleSizes = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base sm:text-lg',
    lg: 'text-xl sm:text-2xl',
    hero: 'text-3xl sm:text-5xl lg:text-6xl',
  }[size];

  const taglineSizes = {
    xs: 'text-[8px]',
    sm: 'text-[9px]',
    md: 'text-[10px]',
    lg: 'text-xs',
    hero: 'text-[11px] sm:text-xs tracking-[0.25em]',
  }[size];

  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 ${className}`}>
      {/* 3D Animated Navigation Arrow: White Fill, Sky-Blue outline, No box */}
      <NaviLink3DArrow size={size} animate={animate} />

      {showText && (
        <div className="flex flex-col">
          <div className={`font-sans tracking-tight leading-none ${titleSizes}`}>
            <span className="text-white font-bold">Navi</span>
            <span className="text-sky-400 font-extrabold ml-0.5 drop-shadow-[0_0_14px_rgba(56,189,248,0.5)]">
              Link
            </span>
          </div>

          {showTagline && (
            <p
              className={`mt-1 font-mono uppercase text-sky-300/85 font-semibold tracking-[0.2em] leading-tight ${taglineSizes}`}
            >
              CONNECT. TRACK. NAVIGATE.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

