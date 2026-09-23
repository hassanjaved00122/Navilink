import React, { useState } from 'react';
import { UserProfile } from '../../types';
import { NaviLinkLogo } from '../Common/NaviLinkLogo';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import {
  Shield,
  Ghost,
  Lock,
  Compass,
  Footprints,
  Car,
  Crosshair,
  AlertCircle,
  Trash2,
  AlertTriangle,
  LogOut,
  Download,
  Smartphone,
  Check,
  EyeOff,
  BatteryCharging,
  Sliders,
  Radio,
} from 'lucide-react';

interface ControlCenterTabProps {
  currentUser: UserProfile;
  users?: UserProfile[];
  onSwitchUser?: (userId: string) => void;
  isSimulating?: boolean;
  onToggleSimulate?: () => void;
  isE2EEEnabled: boolean;
  onToggleE2EE: () => void;
  onToggleMasterLocation: () => void;
  onToggleGhostMode: () => void;
  onResetDemo?: () => void;
  onOpenSocketLogs?: () => void;
  socketLogsCount?: number;
  onOpenTestGuide?: () => void;
  onOpenAR?: () => void;
  onOpenAddModal?: () => void;
  onOpenEditProfile?: () => void;
  onDeleteProfile?: () => void;
  onSignOut?: () => void;
  routeMode: 'walking' | 'driving';
  onChangeRouteMode: (mode: 'walking' | 'driving') => void;
  isLiveGPSActive?: boolean;
  onToggleLiveGPS?: () => void;
  gpsError?: string | null;
}

export const ControlCenterTab: React.FC<ControlCenterTabProps> = ({
  currentUser,
  isE2EEEnabled,
  onToggleE2EE,
  onToggleMasterLocation,
  onToggleGhostMode,
  onOpenAR,
  onOpenEditProfile,
  onDeleteProfile,
  onSignOut,
  routeMode,
  onChangeRouteMode,
  isLiveGPSActive = false,
  onToggleLiveGPS,
  gpsError,
}) => {
  const [isDeletingProfile, setIsDeletingProfile] = useState<boolean>(false);
  const [precisionMode, setPrecisionMode] = useState<'exact' | 'approximate' | 'invisible'>('exact');
  const [autoPauseInactive, setAutoPauseInactive] = useState<boolean>(true);
  const pwa = usePWAInstall();

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-4 text-zinc-100 bg-black custom-scrollbar">
      {/* Tab Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
        <div className="flex items-center gap-2.5">
          <NaviLinkLogo size="xs" showText={true} showTagline={false} />
          <div className="h-4 w-[1px] bg-zinc-800" />
          <div>
            <h2 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">Settings & Privacy</h2>
            <p className="text-[10px] text-zinc-400">Security, Navigation & Preferences</p>
          </div>
        </div>
      </div>

      {/* 1. Current User Profile Card */}
      <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-900 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-sky-400" />
            My Active Account
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
              currentUser.appLocationStatus
                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/60'
                : 'bg-zinc-900 text-zinc-400 border-zinc-700'
            }`}
          >
            {currentUser.appLocationStatus ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>

        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-black border border-zinc-800">
          <div className="relative">
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.name}
              className="w-11 h-11 rounded-full object-cover border-2 border-sky-400"
            />
            {currentUser.ghostMode ? (
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-purple-600 flex items-center justify-center text-[9px]">
                👻
              </span>
            ) : !currentUser.appLocationStatus ? (
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center text-[9px] text-black font-bold">
                ✕
              </span>
            ) : (
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-black" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
            </div>
            <p className="text-[11px] text-sky-300 font-mono mt-0.5">{currentUser.uniqueAppId}</p>
            <p className="text-[10px] text-zinc-500 font-mono">{currentUser.phoneNumber}</p>
          </div>
        </div>

        {onOpenEditProfile && (
          <button
            type="button"
            onClick={onOpenEditProfile}
            className="w-full py-2 rounded-xl bg-black hover:bg-white text-white hover:text-black border border-sky-400 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
          >
            <span>✏️ Edit Profile & Display Name</span>
          </button>
        )}
      </div>

      {/* 2. Privacy & Security Center (Major Feature) */}
      <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-900 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-sky-400" />
            <span>Privacy & Location Controls</span>
          </span>
          <span className="text-[10px] font-mono text-zinc-400">ENCRYPTED</span>
        </div>

        {/* Master In-App Tracking Switch */}
        <div className="p-3 rounded-xl bg-black border border-sky-400/60 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Location Sharing</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    currentUser.appLocationStatus ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'
                  }`}
                />
              </p>
              <p className="text-[10px] text-zinc-400 mt-0.5">
                {currentUser.appLocationStatus
                  ? 'Active: Saved contacts see you as ONLINE with live location.'
                  : 'Disabled: Contacts see you as OFFLINE. No location is transmitted.'}
              </p>
            </div>
            <button
              id="btn-toggle-location-sharing"
              onClick={onToggleMasterLocation}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                currentUser.appLocationStatus
                  ? 'bg-white text-black border border-white shadow-md'
                  : 'bg-black text-white border border-sky-400 hover:bg-zinc-900'
              }`}
            >
              {currentUser.appLocationStatus ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Ghost Mode Toggle */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-black border border-zinc-800">
          <div>
            <p className="text-xs font-semibold text-white flex items-center gap-1.5">
              <span>Ghost Mode (Freeze Location)</span>
              <span className="text-[10px] text-purple-400">👻</span>
            </p>
            <p className="text-[10px] text-zinc-400">
              {currentUser.ghostMode
                ? 'Ghost active: Freezes your coordinates at current spot.'
                : 'Broadcasts real moving coordinates.'}
            </p>
          </div>
          <button
            onClick={onToggleGhostMode}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
              currentUser.ghostMode
                ? 'bg-white text-black border border-white shadow-md font-bold'
                : 'bg-black text-white border border-sky-400 hover:bg-zinc-900'
            }`}
          >
            {currentUser.ghostMode ? 'GHOST: ON' : 'GHOST: OFF'}
          </button>
        </div>

        {/* E2EE Military-Grade Encryption Toggle */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-black border border-zinc-800">
          <div>
            <p className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-sky-400" />
              <span>AES-256 E2EE End-to-End Encryption</span>
            </p>
            <p className="text-[10px] text-zinc-400">
              Encrypts GPS telemetry before broadcasting to mesh network.
            </p>
          </div>
          <button
            onClick={onToggleE2EE}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
              isE2EEEnabled
                ? 'bg-white text-black border border-white shadow-md font-bold'
                : 'bg-black text-white border border-sky-400 hover:bg-zinc-900'
            }`}
          >
            {isE2EEEnabled ? 'E2EE: ON' : 'E2EE: OFF'}
          </button>
        </div>

        {/* Precision Shield Selector */}
        <div className="p-2.5 rounded-xl bg-black border border-zinc-800 space-y-2">
          <p className="text-xs font-semibold text-white flex items-center gap-1.5">
            <EyeOff className="w-3.5 h-3.5 text-sky-400" />
            <span>Proximity Shield Precision</span>
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => setPrecisionMode('exact')}
              className={`py-1.5 px-2 rounded-lg text-[10px] font-semibold text-center transition-all border cursor-pointer ${
                precisionMode === 'exact'
                  ? 'bg-white text-black border-white font-bold shadow'
                  : 'bg-black text-white border-zinc-800 hover:border-zinc-700'
              }`}
            >
              Exact GPS
            </button>
            <button
              type="button"
              onClick={() => setPrecisionMode('approximate')}
              className={`py-1.5 px-2 rounded-lg text-[10px] font-semibold text-center transition-all border cursor-pointer ${
                precisionMode === 'approximate'
                  ? 'bg-white text-black border-white font-bold shadow'
                  : 'bg-black text-white border-zinc-800 hover:border-zinc-700'
              }`}
            >
              500m Area
            </button>
            <button
              type="button"
              onClick={() => setPrecisionMode('invisible')}
              className={`py-1.5 px-2 rounded-lg text-[10px] font-semibold text-center transition-all border cursor-pointer ${
                precisionMode === 'invisible'
                  ? 'bg-white text-black border-white font-bold shadow'
                  : 'bg-black text-white border-zinc-800 hover:border-zinc-700'
              }`}
            >
              Stealth
            </button>
          </div>
        </div>

        {/* Battery & Auto-Pause Privacy Feature */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-black border border-zinc-800">
          <div>
            <p className="text-xs font-semibold text-white flex items-center gap-1.5">
              <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
              <span>Auto-Pause When Inactive</span>
            </p>
            <p className="text-[10px] text-zinc-400">Halt background GPS when idle to save battery & data.</p>
          </div>
          <button
            type="button"
            onClick={() => setAutoPauseInactive(!autoPauseInactive)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
              autoPauseInactive
                ? 'bg-white text-black border border-white shadow-md font-bold'
                : 'bg-black text-white border border-sky-400 hover:bg-zinc-900'
            }`}
          >
            {autoPauseInactive ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* 3. Navigation & Device Hardware Preferences */}
      <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-900 space-y-3">
        <span className="text-xs font-bold text-white flex items-center gap-1.5">
          <Radio className="w-4 h-4 text-sky-400" />
          Hardware GPS & Route Mode
        </span>

        {/* Real Device Location Toggle */}
        {onToggleLiveGPS && (
          <button
            onClick={onToggleLiveGPS}
            className={`w-full flex items-center justify-between py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              isLiveGPSActive
                ? 'bg-white text-black border-white shadow-md'
                : 'bg-black text-white border-sky-400 hover:bg-zinc-900'
            }`}
          >
            <span className="flex items-center gap-2">
              <Crosshair className={`w-4 h-4 ${isLiveGPSActive ? 'text-black animate-pulse' : 'text-sky-400'}`} />
              <span>Use Real Device GPS Hardware</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                isLiveGPSActive ? 'bg-black text-white border-black font-bold' : 'bg-black border-sky-400 text-sky-300'
              }`}
            >
              {isLiveGPSActive ? 'LIVE ACTIVE' : 'ENABLE'}
            </span>
          </button>
        )}

        {gpsError && (
          <div className="flex items-center gap-1.5 p-2 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px]">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{gpsError}</span>
          </div>
        )}

        {/* Travel Mode: Walk vs Drive */}
        <div className="pt-2 border-t border-zinc-900">
          <span className="text-[11px] text-zinc-400 block mb-1.5">Preferred Route Mode:</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onChangeRouteMode('walking')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                routeMode === 'walking'
                  ? 'bg-white text-black border-white shadow-sm font-bold'
                  : 'bg-black text-white border-sky-400 hover:bg-zinc-900'
              }`}
            >
              <Footprints className="w-3.5 h-3.5" />
              <span>Walk (Pedestrian)</span>
            </button>
            <button
              onClick={() => onChangeRouteMode('driving')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                routeMode === 'driving'
                  ? 'bg-white text-black border-white shadow-sm font-bold'
                  : 'bg-black text-white border-sky-400 hover:bg-zinc-900'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>Drive (Roads)</span>
            </button>
          </div>
        </div>

        {onOpenAR && (
          <button
            onClick={onOpenAR}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-black hover:bg-zinc-900 border border-sky-400 text-xs text-white transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-sky-400" />
              <span>Launch 3D AR Compass Radar</span>
            </div>
            <span className="text-[10px] text-sky-300 font-mono">Compass 3D</span>
          </button>
        )}
      </div>

      {/* 4. Progressive Web App (PWA) Mobile Installation */}
      <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-900 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-sky-400" />
            <span>Mobile App & PWA Status</span>
          </span>
          <span className="px-2 py-0.5 rounded-full bg-sky-400/20 text-sky-300 font-mono text-[9px] font-bold border border-sky-400/40">
            AUTO-UPDATE
          </span>
        </div>

        <p className="text-[11px] text-zinc-400">
          Install NaviLink to your home screen for full background GPS tracking, offline cache, and automatic instant updates when pushed to GitHub.
        </p>

        {pwa.isInstalled ? (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-black border border-emerald-500/50 text-emerald-300 text-xs font-semibold">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>App Installed on Home Screen (Standalone PWA)</span>
          </div>
        ) : (
          <button
            id="btn-settings-install-pwa"
            type="button"
            onClick={async () => {
              if (pwa.isIOS) {
                alert('On iPhone/iPad: Tap the Share button in Safari, then select "Add to Home Screen".');
              } else {
                await pwa.install();
              }
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-black hover:bg-white text-white hover:text-black border border-sky-400 text-xs font-bold transition-all cursor-pointer shadow-md active:scale-98"
          >
            <Download className="w-4 h-4" />
            <span>Install NaviLink App (PWA)</span>
          </button>
        )}
      </div>

      {/* 5. Account & Profile Management */}
      <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-900 space-y-3">
        <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
          <Trash2 className="w-4 h-4 text-rose-500" />
          <span>Account & Profile Actions</span>
        </span>

        {isDeletingProfile ? (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 space-y-2.5">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-rose-200">Confirm Deleting Profile?</p>
                <p className="text-[11px] text-rose-300/80">
                  This will remove &apos;{currentUser.name}&apos; and reset your current session.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsDeletingProfile(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteProfile) {
                    onDeleteProfile();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 shadow-sm border border-rose-500 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Delete Profile</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {onSignOut && (
              <button
                id="btn-control-center-signout"
                type="button"
                onClick={onSignOut}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-black hover:bg-zinc-900 border border-sky-400 text-white text-xs font-semibold transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-sky-400" />
                <span>Switch / Sign Out Firebase Account</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsDeletingProfile(true)}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-black hover:bg-rose-950/40 border border-rose-500/50 hover:border-rose-500 text-rose-400 hover:text-rose-300 text-xs font-semibold transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete My Profile</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

