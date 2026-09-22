import React from 'react';
import navilinkLogoImg from '../../assets/images/navilink_3d_logo_solid_dark_gray_v2.png';

interface NaviLinkArrowProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'hero';
  className?: string;
  animate?: boolean;
}

export const NaviLink3DArrow: React.FC<NaviLinkArrowProps> = ({
  size = 'md',
  className = '',
  animate = true,
}) => {
  const containerSizes = {
    xs: 'w-5 h-5',
    sm: 'w-7 h-7',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    hero: 'w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40',
  }[size];

  return (
    <div
      className={`relative shrink-0 flex items-center justify-center select-none bg-transparent ${containerSizes} ${className}`}
    >
      {/* 
        The exact previous 3D monolithic navigation logo, fully uniformly dark gray across all sides.
        Zero white box, zero black fade side, seamless transparent background.
      */}
      <img
        src={navilinkLogoImg}
        alt="NaviLink 3D Logo"
        referrerPolicy="no-referrer"
        className={`w-full h-full object-contain pointer-events-none select-none drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)] ${
          animate ? 'hover:scale-105 transition-transform duration-300' : ''
        }`}
      />
    </div>
  );
};

export const NaviLinkArrow = NaviLink3DArrow;




