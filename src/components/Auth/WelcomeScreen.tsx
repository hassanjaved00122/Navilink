import React from 'react';
import { ArrowRight, ShieldCheck, Radio } from 'lucide-react';
import { NaviLink3DArrow } from '../Common/NaviLink3DArrow';

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onGetStarted }) => {
  return (
    <div className="relative h-screen h-[100dvh] max-h-[100dvh] w-screen bg-[#000000] text-slate-100 flex flex-col justify-between items-center overflow-hidden font-sans select-none px-4 py-3 sm:py-6">
      {/* 3D Vector Map Background with Pure Black Canvas */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-25">
        {/* Subtle coordinate dot matrix */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:28px_28px]" />

        {/* Ambient Lighting Glows - Pure Sky Blue on Pitch Black */}
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[140px]" />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-sky-600/12 rounded-full blur-[160px]" />

        {/* Animated 3D Road Grid and Vectors */}
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <line x1="0" y1="20%" x2="100%" y2="20%" stroke="#131926" strokeWidth="1.5" />
          <line x1="0" y1="45%" x2="100%" y2="45%" stroke="#1c2538" strokeWidth="2" />
          <line x1="0" y1="75%" x2="100%" y2="75%" stroke="#131926" strokeWidth="1.5" />

          <line x1="15%" y1="0" x2="15%" y2="100%" stroke="#131926" strokeWidth="1.5" />
          <line x1="38%" y1="0" x2="38%" y2="100%" stroke="#1a2336" strokeWidth="2" />
          <line x1="62%" y1="0" x2="62%" y2="100%" stroke="#1a2336" strokeWidth="2" />
          <line x1="85%" y1="0" x2="85%" y2="100%" stroke="#131926" strokeWidth="1.5" />

          {/* Expressway */}
          <path
            d="M -50 400 C 300 350, 600 200, 950 220 S 1400 120, 1800 80"
            fill="none"
            stroke="#1a273f"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Clean Vector Route */}
          <path
            d="M 120 500 C 350 480, 520 280, 780 290 S 1100 180, 1400 210"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2"
            strokeDasharray="8 6"
            strokeOpacity="0.4"
          />
        </svg>

        {/* Static Clean Location Pins */}
        <div className="absolute top-[26%] left-[22%] -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#000000] border border-slate-700 p-0.5 flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
          </div>
          <div className="bg-[#000000]/95 border border-slate-800 px-2 py-0.5 rounded text-[9px] sm:text-[10px] text-slate-400 font-mono">
            Node #104
          </div>
        </div>

        <div className="absolute top-[52%] left-[72%] -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#000000] border border-slate-700 p-0.5 flex items-center justify-center">
            <Radio className="w-3 h-3 text-slate-400" />
          </div>
          <div className="bg-[#000000]/95 border border-slate-800 px-2 py-0.5 rounded text-[9px] sm:text-[10px] text-slate-400 font-mono">
            Mesh Linked
          </div>
        </div>
      </div>

      {/* Top Status Bar */}
      <header className="relative z-10 w-full max-w-5xl flex items-center justify-between py-1 sm:py-2">
        <div className="flex items-center gap-2">
          {/* Arrow only: no box, simple gray color, static */}
          <NaviLink3DArrow size="sm" />
          <div className="text-xs sm:text-sm tracking-wider uppercase font-semibold">
            <span className="text-white">Navi</span>
            <span className="text-sky-400 ml-0.5">Link</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#000000]/80 border border-slate-800 text-slate-400 text-[10px] sm:text-xs font-mono shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          <span>v2.8 Live Mesh</span>
        </div>
      </header>

      {/* Center Hero Content Area */}
      <main className="relative z-10 w-full max-w-md my-auto flex flex-col items-center text-center py-2 sm:py-6">
        {/* Simple Gray Navigation Arrow: No Box, No Movement */}
        <div className="relative mb-4 sm:mb-6 flex items-center justify-center">
          <NaviLink3DArrow size="hero" />
        </div>

        {/* App Title: Half White, Half Blue */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-1.5 sm:mb-3">
          <span className="text-white">Navi</span>
          <span className="text-sky-400 ml-0.5 drop-shadow-[0_0_20px_rgba(56,189,248,0.6)]">
            Link
          </span>
        </h1>

        {/* Tagline */}
        <p className="text-xs sm:text-base text-slate-400 font-medium max-w-xs sm:max-w-md mb-5 sm:mb-8 leading-relaxed">
          Connect, Track, and Navigate in Real-Time.
        </p>

        {/* Action Button */}
        <button
          onClick={onGetStarted}
          className="w-full sm:w-auto px-8 py-3.5 sm:py-4 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-black font-bold text-xs sm:text-sm tracking-wide shadow-[0_10px_25px_rgba(14,165,233,0.4)] border border-sky-300 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer group"
        >
          <span>Get Started</span>
          <ArrowRight className="w-4 h-4 text-black transition-transform group-hover:translate-x-1" />
        </button>

        {/* Subtle trust badge */}
        <div className="mt-4 sm:mt-6 flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
          <span>Encrypted location network</span>
        </div>
      </main>

      {/* Footer minimal info */}
      <footer className="relative z-10 w-full max-w-5xl text-center text-[10px] sm:text-xs text-slate-500 font-mono py-1">
        NaviLink Spatial Platform • All connections end-to-end encrypted
      </footer>
    </div>
  );
};


