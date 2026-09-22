import React from 'react';
import { SocketLogEntry } from '../../types';
import { Activity, ShieldCheck, ShieldAlert, Lock, ArrowUpRight, ArrowDownLeft, X, Terminal } from 'lucide-react';

interface SocketInspectorModalProps {
  logs: SocketLogEntry[];
  isOpen: boolean;
  onClose: () => void;
  onClear: () => void;
}

export const SocketInspectorModal: React.FC<SocketInspectorModalProps> = ({
  logs,
  isOpen,
  onClose,
  onClear,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="socket-inspector-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-slate-900 border border-slate-700/80 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 md:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base leading-tight flex items-center gap-2">
                WebSocket & Privacy Shield Telemetry
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Socket.io Live
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Inspect raw WebSocket packets, client-side AES encryption, and server privacy interceptor logs.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClear}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors"
            >
              Clear Logs
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Logs Stream List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs bg-slate-950/60">
          {logs.length === 0 ? (
            <div className="text-center py-16 text-slate-500 font-sans">
              No socket events recorded yet. Toggle privacy settings or move around the map to generate packets!
            </div>
          ) : (
            logs.map((log) => {
              const isBlocked = log.direction === 'BLOCKED';
              const isOutgoing = log.direction === 'OUTGOING';

              return (
                <div
                  key={log.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isBlocked
                      ? 'bg-amber-950/20 border-amber-500/30'
                      : isOutgoing
                      ? 'bg-slate-900/90 border-cyan-500/30'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                    <div className="flex items-center gap-2">
                      {isBlocked ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                          <ShieldAlert className="w-3 h-3" />
                          SHIELD INTERCEPTED
                        </span>
                      ) : isOutgoing ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold text-[10px]">
                          <ArrowUpRight className="w-3 h-3" />
                          EMITTED
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                          <ArrowDownLeft className="w-3 h-3" />
                          RECEIVED
                        </span>
                      )}

                      <span className="font-bold text-slate-200">{log.event}</span>
                    </div>

                    <span className="text-[10px] text-slate-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  {/* Shield Check Decision */}
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-slate-400 bg-slate-950/70 p-2 rounded-lg border border-slate-800/60">
                    <div>
                      <span>Mutual Friends: </span>
                      <strong className={log.privacyShieldCheck.isMutual ? 'text-emerald-400' : 'text-rose-400'}>
                        {log.privacyShieldCheck.isMutual ? 'YES' : 'NO'}
                      </strong>
                    </div>
                    <div>
                      <span>In-App Toggle: </span>
                      <strong className={log.privacyShieldCheck.isLocationOn ? 'text-emerald-400' : 'text-amber-400'}>
                        {log.privacyShieldCheck.isLocationOn ? 'ENABLED' : 'MUTED'}
                      </strong>
                    </div>
                    <div>
                      <span>Ghost Mode: </span>
                      <strong className={log.privacyShieldCheck.isGhostMode ? 'text-purple-400' : 'text-slate-300'}>
                        {log.privacyShieldCheck.isGhostMode ? 'ACTIVE' : 'OFF'}
                      </strong>
                    </div>
                    <div>
                      <span>Verdict: </span>
                      <strong
                        className={
                          log.privacyShieldCheck.verdict === 'BROADCAST_ALLOWED'
                            ? 'text-emerald-400'
                            : 'text-amber-400'
                        }
                      >
                        {log.privacyShieldCheck.verdict}
                      </strong>
                    </div>
                  </div>

                  {/* Raw Payload */}
                  <div className="mt-2 text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 overflow-x-auto text-[11px] leading-relaxed break-all">
                    {log.payload}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
