import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, Sparkles, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallBanner: React.FC = () => {
  const { isInstalled, isIOS, isInstallable, install } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [showIOSModal, setShowIOSModal] = useState<boolean>(false);
  const [isInstalling, setIsInstalling] = useState<boolean>(false);

  useEffect(() => {
    // Check if dismissed in this session
    const dismissed = sessionStorage.getItem('navilink_pwa_banner_dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  if (isInstalled || isDismissed) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    setIsInstalling(true);
    const success = await install();
    setIsInstalling(false);
    if (success) {
      setIsDismissed(true);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('navilink_pwa_banner_dismissed', 'true');
  };

  return (
    <>
      {/* Floating Modern PWA Install Banner */}
      <div className="fixed top-3 left-3 right-3 z-[9999] max-w-lg mx-auto animate-in fade-in slide-in-from-top-4 duration-300">
        <div className="p-3 rounded-2xl bg-black/95 border-2 border-sky-400 shadow-2xl shadow-sky-500/20 backdrop-blur-xl flex items-center justify-between gap-3">
          {/* App Icon & Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative w-10 h-10 rounded-xl bg-zinc-900 border border-sky-400 flex items-center justify-center shrink-0 overflow-hidden">
              <img src="/icon.svg" alt="NaviLink Icon" className="w-8 h-8 object-contain" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white tracking-wide truncate">Install NaviLink App</span>
                <span className="px-1.5 py-0.2 rounded bg-sky-400/20 text-[9px] font-mono font-bold text-sky-300 border border-sky-400/40 shrink-0">
                  PWA
                </span>
              </div>
              <p className="text-[10px] text-zinc-300 truncate">
                Live background tracking & 1-tap launcher
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              id="btn-install-pwa"
              type="button"
              onClick={handleInstallClick}
              disabled={isInstalling}
              className="px-3 py-1.5 rounded-xl bg-black hover:bg-white text-white hover:text-black border border-sky-400 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isInstalling ? 'Installing...' : 'Install'}</span>
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss banner"
              className="p-1.5 rounded-lg bg-black hover:bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Safari Guided Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-black border-2 border-sky-400 p-5 shadow-2xl text-white space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-sky-400" />
                <h3 className="text-sm font-bold text-white">Install on iPhone / iPad</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg bg-zinc-900 border border-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-zinc-300">
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="p-1.5 rounded-lg bg-sky-400/20 text-sky-300 shrink-0">
                  <Share className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-white">Step 1</p>
                  <p className="text-[11px] text-zinc-400">
                    Tap the <strong className="text-sky-300">Share</strong> icon at the bottom of Safari.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="p-1.5 rounded-lg bg-sky-400/20 text-sky-300 shrink-0">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-white">Step 2</p>
                  <p className="text-[11px] text-zinc-400">
                    Scroll down and select <strong className="text-sky-300">&quot;Add to Home Screen&quot;</strong>.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2 rounded-xl bg-black hover:bg-white text-white hover:text-black border border-sky-400 text-xs font-bold transition-all"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
};
