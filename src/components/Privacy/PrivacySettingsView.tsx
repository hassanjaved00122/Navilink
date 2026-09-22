import React from 'react';
import { UserProfile, ShieldedFriendLocation } from '../../types';
import { Shield, ShieldAlert, Ghost, Lock, MapPinOff, Eye, EyeOff, KeyRound, Info } from 'lucide-react';

interface PrivacySettingsViewProps {
  currentUser: UserProfile;
  friends: ShieldedFriendLocation[];
  onToggleMasterLocation: () => void;
  onToggleGhostMode: () => void;
  isE2EEEnabled: boolean;
  onToggleE2EE: () => void;
}

export const PrivacySettingsView: React.FC<PrivacySettingsViewProps> = ({
  currentUser,
  friends,
  onToggleMasterLocation,
  onToggleGhostMode,
  isE2EEEnabled,
  onToggleE2EE,
}) => {
  return (
    <div id="privacy-settings-container" className="flex flex-col h-full bg-slate-900/90 rounded-2xl border border-slate-800 p-4 md:p-6 overflow-y-auto space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Shield className="w-5 h-5 text-cyan-400" />
          Privacy & Security Shield
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Zero-leakage location controls. Control exactly when and how your coordinates are broadcasted.
        </p>
      </div>

      {/* Main Privacy Controls Grid */}
      <div className="space-y-4">
        {/* Master In-App Location Toggle Card */}
        <div
          id="card-master-location-toggle"
          className={`p-5 rounded-2xl border transition-all ${
            currentUser.appLocationStatus
              ? 'bg-slate-950/70 border-cyan-500/40 shadow-lg shadow-cyan-950/30'
              : 'bg-amber-950/20 border-amber-500/40 shadow-lg shadow-amber-950/30'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <MapPinOff className={`w-5 h-5 ${currentUser.appLocationStatus ? 'text-cyan-400' : 'text-amber-400'}`} />
                <h4 className="text-sm font-bold text-slate-100">
                  Master App Location Toggle
                </h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed pr-2">
                Instantly shuts down all in-app GPS tracking and broadcasting to friends{' '}
                <span className="text-cyan-300 font-medium">without changing your device OS permissions</span>.
              </p>
            </div>

            {/* Toggle Switch */}
            <button
              id="switch-master-location"
              onClick={onToggleMasterLocation}
              role="switch"
              aria-checked={currentUser.appLocationStatus}
              className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                currentUser.appLocationStatus ? 'bg-cyan-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-slate-950 shadow-lg ring-0 transition duration-200 ease-in-out ${
                  currentUser.appLocationStatus ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center gap-2 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                currentUser.appLocationStatus ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="font-mono text-slate-300 text-[11px]">
              {currentUser.appLocationStatus
                ? 'Current Status: ACTIVE (Broadcasting to authorized mutual friends)'
                : 'Current Status: MUTED (Friends receive "Location Hidden by User")'}
            </span>
          </div>
        </div>

        {/* Ghost Mode Card */}
        <div
          id="card-ghost-mode-toggle"
          className={`p-5 rounded-2xl border transition-all ${
            currentUser.ghostMode
              ? 'bg-purple-950/20 border-purple-500/40 shadow-lg shadow-purple-950/30'
              : 'bg-slate-950/70 border-slate-800'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Ghost className={`w-5 h-5 ${currentUser.ghostMode ? 'text-purple-400' : 'text-slate-400'}`} />
                <h4 className="text-sm font-bold text-slate-100">Ghost Mode (Stealth Radar)</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed pr-2">
                Completely hides your pinpoint location from friends while still allowing you to see their active
                locations on the map.
              </p>
            </div>

            {/* Ghost Toggle Switch */}
            <button
              id="switch-ghost-mode"
              onClick={onToggleGhostMode}
              role="switch"
              aria-checked={currentUser.ghostMode}
              className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                currentUser.ghostMode ? 'bg-purple-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-slate-950 shadow-lg ring-0 transition duration-200 ease-in-out ${
                  currentUser.ghostMode ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center gap-2 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                currentUser.ghostMode ? 'bg-purple-400 animate-pulse' : 'bg-slate-600'
              }`}
            />
            <span className="font-mono text-slate-300 text-[11px]">
              {currentUser.ghostMode
                ? 'Ghost Mode: ENGAGED (You are invisible to everyone on radar)'
                : 'Ghost Mode: DISABLED (Normal mutual sharing)'}
            </span>
          </div>
        </div>

        {/* Client-Side AES-256-GCM E2EE Toggle Card */}
        <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-cyan-400" />
                <h4 className="text-sm font-bold text-slate-100">End-to-End Coordinate Encryption</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed pr-2">
                Client-side AES-256 encryption encrypts latitude and longitude on your device before transmission.
                Intermediate servers and WebSockets only route encrypted ciphertexts.
              </p>
            </div>

            <button
              id="switch-e2ee"
              onClick={onToggleE2EE}
              role="switch"
              aria-checked={isE2EEEnabled}
              className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                isE2EEEnabled ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-slate-950 shadow-lg ring-0 transition duration-200 ease-in-out ${
                  isE2EEEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center gap-2 text-[11px] font-mono text-cyan-400">
            <KeyRound className="w-3.5 h-3.5" />
            <span>Algorithm: AES-256-GCM / Ephemeral Session Keys</span>
          </div>
        </div>
      </div>

      {/* Mutual Privacy Status Breakdown */}
      <div className="space-y-3 pt-2">
        <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Eye className="w-4 h-4 text-cyan-400" />
          Active Friend Permissions Matrix
        </h4>
        <div className="rounded-xl border border-slate-800 overflow-hidden divide-y divide-slate-800/70 bg-slate-950/50">
          {Array.from(new Map(friends.map((f) => [f.userId, f])).values()).map((friend, idx) => {
            const canTheySeeMe = currentUser.appLocationStatus && !currentUser.ghostMode;
            const canISeeThem = !friend.isShielded;

            return (
              <div key={`friend-perm-${friend.userId}-${idx}`} className="p-3 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <img
                    src={friend.user.avatarUrl}
                    alt={friend.user.name}
                    className="w-8 h-8 rounded-full object-cover border border-slate-700"
                  />
                  <div>
                    <p className="font-semibold text-slate-100">{friend.user.name}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{friend.user.uniqueAppId}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="block text-[10px] text-slate-400">Can See You</span>
                    <span
                      className={`font-mono text-[11px] font-bold ${
                        canTheySeeMe ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {canTheySeeMe ? 'AUTHORIZED' : 'SHIELDED'}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="block text-[10px] text-slate-400">You Can See</span>
                    <span
                      className={`font-mono text-[11px] font-bold ${
                        canISeeThem ? 'text-cyan-400' : 'text-rose-400'
                      }`}
                    >
                      {canISeeThem ? 'LIVE' : 'HIDDEN'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Security Architecture Explainer Note */}
      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400 space-y-2">
        <div className="flex items-center gap-2 text-cyan-300 font-medium">
          <Info className="w-4 h-4" />
          <span>Server-Side Privacy Shield Guarantee</span>
        </div>
        <p className="leading-relaxed">
          Before any WebSocket coordinate packet is pushed across the network, the backend validates both mutual
          friendship and the target user's in-app toggle flag. If either condition fails, the coordinate packet is
          dropped at the server gateway and replaced with <code className="text-amber-300 bg-slate-900 px-1.5 py-0.5 rounded">"Location Hidden by User"</code>.
        </p>
      </div>
    </div>
  );
};
