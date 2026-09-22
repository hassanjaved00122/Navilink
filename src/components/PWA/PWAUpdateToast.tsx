import React from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export const PWAUpdateToast: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('✅ NaviLink PWA Service Worker registered:', r);
      // Periodically check for updates every 1 hour or when tab gets focused
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.warn('NaviLink PWA Service Worker registration error:', error);
    },
  });

  if (!needRefresh) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-3 right-3 sm:bottom-6 sm:right-6 sm:left-auto sm:max-w-sm z-[9999] animate-in fade-in slide-in-from-bottom-5">
      <div className="p-3.5 rounded-2xl bg-black border-2 border-sky-400 shadow-2xl shadow-sky-500/30 text-white flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-sky-400/20 text-sky-300 border border-sky-400/50 shrink-0">
            <Sparkles className="w-4 h-4 animate-spin text-sky-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">New Update Ready</p>
            <p className="text-[10px] text-zinc-300 truncate">
              New features deployed! Click to reload.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => updateServiceWorker(true)}
            className="px-3 py-1.5 rounded-xl bg-black hover:bg-white text-white hover:text-black border border-sky-400 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-md"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Update</span>
          </button>
          <button
            type="button"
            onClick={() => setNeedRefresh(false)}
            className="px-2 py-1.5 rounded-xl bg-black hover:bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 text-xs transition-colors"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
};
