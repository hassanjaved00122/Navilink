import React, { useState } from 'react';
import { UserProfile } from '../../types';
import { NaviLinkLogo } from '../Common/NaviLinkLogo';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import {
  Users,
  Ghost,
  MapPinOff,
  RefreshCw,
  Terminal,
  Play,
  Pause,
  Shield,
  ShieldAlert,
  Lock,
  Compass,
  CheckCircle2,
  Footprints,
  Car,
  BatteryCharging,
  Battery,
  Radio,
  Sliders,
  UserPlus,
  Crosshair,
  AlertCircle,
  Trash2,
  AlertTriangle,
  LogOut,
  Download,
  Smartphone,
  Check,
} from 'lucide-react';

interface ControlCenterTabProps {
  currentUser: UserProfile;
  users: UserProfile[];
  onSwitchUser: (userId: string) => void;
  isSimulating: boolean;
  onToggleSimulate: () => void;
  isE2EEEnabled: boolean;
  onToggleE2EE: () => void;
  onToggleMasterLocation: () => void;
  onToggleGhostMode: () => void;
  onResetDemo: () => void;
  onOpenSocketLogs: () => void;
  socketLogsCount: number;
  onOpenTestGuide: () => void;
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
  users,
  onSwitchUser,
  isSimulating,
  onToggleSimulate,
  isE2EEEnabled,
  onToggleE2EE,
  onToggleMasterLocation,
  onToggleGhostMode,
  onResetDemo,
  onOpenSocketLogs,
  socketLogsCount,
  onOpenTestGuide,
  onOpenAR,
  onOpenAddModal,
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
  const pwa = usePWAInstall();
  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-4 text-zinc-100 bg-black custom-scrollbar">
      {/* Tab Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
        <div className="flex items-center gap-2.5">
          <NaviLinkLogo size="xs" showText={true} showTagline={false} />
          <div className="h-4 w-[1px] bg-zinc-800" />
          <div>
            <h2 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">Control Center</h2>
            <p className="text-[10px] text-zinc-400">Settings & Mesh Options</p>
          </div>
        </div>
        <button
          onClick={onResetDemo}
          title="Reset sample data to original state"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* 1. Persona Switcher Section */}
      <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-900 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-cyan-400" />
            Switch Active Persona (Profile)
          </span>
          <span className="text-[10px] font-mono text-zinc-400">5 Profiles Available</span>
        </div>

        {/* Current User Pill Card */}
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-black border border-zinc-900">
          <div className="relative">
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.name}
              className="w-10 h-10 rounded-full object-cover border-2 border-cyan-400"
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
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-black"></span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                currentUser.appLocationStatus
                  ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/60'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-700'
              }`}>
                {currentUser.appLocationStatus ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-mono">{currentUser.uniqueAppId}</p>
          </div>
        </div>

        {onOpenEditProfile && (
          <button
            type="button"
            onClick={onOpenEditProfile}
            className="w-full py-2 rounded-xl bg-black hover:bg-zinc-900 border border-sky-400 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>✏️ Edit My Profile & Radar ID</span>
          </button>
        )}

        {/* Persona Buttons */}
        <div className="grid grid-cols-2 gap-2">
          {Array.from(new Map(users.map((u) => [u.userId, u])).values()).map((user, idx) => {
            const isSelected = user.userId === currentUser.userId;
            return (
              <button
                key={`user-persona-${user.userId}-${idx}`}
                onClick={() => onSwitchUser(user.userId)}
                className={`flex items-center gap-2 p-2 rounded-xl text-xs transition-all border text-left cursor-pointer ${
                  isSelected
                    ? 'bg-white text-black border-white font-bold shadow-md'
                    : 'bg-black text-white border-sky-400/60 hover:bg-zinc-900'
                }`}
              >
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-6 h-6 rounded-full object-cover shrink-0 border border-sky-400"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold">{user.name.split(' ')[0]}</p>
                  <p className={`text-[9px] truncate font-mono ${isSelected ? 'text-zinc-600' : 'text-zinc-400'}`}>
                    {user.appLocationStatus ? 'Online' : 'Offline'}
                  </p>
                </div>
                {user.ghostMode && <Ghost className="w-3 h-3 text-purple-400 shrink-0" />}
                {!user.appLocationStatus && <MapPinOff className="w-3 h-3 text-amber-400 shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Add New Contact / Number Button */}
        {onOpenAddModal && (
          <button
            onClick={onOpenAddModal}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-black hover:bg-zinc-900 border border-sky-400 text-white text-xs font-semibold transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-sky-400" />
            <span>+ Add New Friend / Registered Contact</span>
          </button>
        )}
      </div>

      {/* 2. Live GPS & Routing */}
      <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-900 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Radio className="w-4 h-4 text-sky-400" />
            Live Movement & Route
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              isSimulating ? 'bg-white text-black border-white' : 'bg-black text-zinc-400 border-zinc-700'
            }`}
          >
            {isSimulating ? 'SIMULATING' : 'PAUSED'}
          </span>
        </div>

        <div className="flex flex-col gap-2">
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
                <span>Use My Real Device GPS</span>
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

          <button
            onClick={onToggleSimulate}
            className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              isSimulating
                ? 'bg-white text-black border-white shadow-md'
                : 'bg-black text-white border-sky-400 hover:bg-zinc-900'
            }`}
          >
            {isSimulating ? (
              <>
                <Pause className="w-4 h-4" />
                <span>Pause Background Wander</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current text-sky-400" />
                <span>Start Live GPS Wander</span>
              </>
            )}
          </button>
        </div>

        {/* Travel Mode: Walk vs Drive */}
        <div className="pt-2 border-t border-zinc-900">
          <span className="text-[11px] text-zinc-400 block mb-1.5">Route Navigation Mode:</span>
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
              <span>Walk (Streets)</span>
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
      </div>

      {/* 3. Privacy & Location Controls (Default ON, with Off Option) */}
      <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-900 space-y-3">
        <span className="text-xs font-bold text-white flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-sky-400" />
          Privacy & Location Sharing
        </span>

        {/* Master In-App Tracking Switch */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-black border border-sky-400/50">
          <div>
            <p className="text-xs font-semibold text-white">Live Location Sharing</p>
            <p className="text-[10px] text-zinc-400">
              {currentUser.appLocationStatus
                ? 'Status: Online (Friends see your live pin on map)'
                : 'Status: Offline (Your location is completely private)'}
            </p>
          </div>
          <button
            onClick={onToggleMasterLocation}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              currentUser.appLocationStatus
                ? 'bg-white text-black border border-white shadow-md'
                : 'bg-black text-white border border-sky-400 hover:bg-zinc-900'
            }`}
          >
            {currentUser.appLocationStatus ? 'LOCATION: ON' : 'LOCATION: OFF'}
          </button>
        </div>

        {/* Ghost Mode Toggle */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-black border border-zinc-800">
          <div>
            <p className="text-xs font-semibold text-white flex items-center gap-1">
              <span>Ghost Mode</span>
              <span className="text-[10px] text-purple-400">👻</span>
            </p>
            <p className="text-[10px] text-zinc-400">Freeze coordinates at current spot</p>
          </div>
          <button
            onClick={onToggleGhostMode}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              currentUser.ghostMode
                ? 'bg-white text-black border border-white font-bold'
                : 'bg-black text-white border border-sky-400 hover:bg-zinc-900'
            }`}
          >
            {currentUser.ghostMode ? 'GHOST: ON' : 'GHOST: OFF'}
          </button>
        </div>

        {/* E2EE Encryption Toggle */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-black border border-zinc-800">
          <div>
            <p className="text-xs font-semibold text-white flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-sky-400" />
              <span>AES-256 E2EE</span>
            </p>
            <p className="text-[10px] text-zinc-400">End-to-end encrypted payloads</p>
          </div>
          <button
            onClick={onToggleE2EE}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isE2EEEnabled
                ? 'bg-white text-black border border-white font-bold'
                : 'bg-black text-white border border-sky-400 hover:bg-zinc-900'
            }`}
          >
            {isE2EEEnabled ? 'E2EE: ON' : 'E2EE: OFF'}
          </button>
        </div>
      </div>

      {/* 4. Diagnostics & Quick Tools */}
      <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-900 space-y-2.5">
        <span className="text-xs font-bold text-white flex items-center gap-1.5">
          <Terminal className="w-4 h-4 text-sky-400" />
          Diagnostics & Tools
        </span>

        <button
          onClick={onOpenSocketLogs}
          className="w-full flex items-center justify-between p-2.5 rounded-xl bg-black hover:bg-zinc-900 border border-sky-400 text-xs text-white transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-sky-400" />
            <span>WebSocket Live Stream</span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-white text-black font-mono text-[10px] font-bold">
            {socketLogsCount} events
          </span>
        </button>

        <button
          onClick={onOpenTestGuide}
          className="w-full flex items-center justify-between p-2.5 rounded-xl bg-black hover:bg-zinc-900 border border-sky-400 text-xs text-white transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-sky-400" />
            <span>Run Test & Verify Suite</span>
          </div>
          <span className="text-[10px] text-sky-300 font-mono">10 Tests</span>
        </button>

        {onOpenAR && (
          <button
            onClick={onOpenAR}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-black hover:bg-zinc-900 border border-sky-400 text-xs text-white transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-sky-400" />
              <span>Launch Indoor AR Radar</span>
            </div>
            <span className="text-[10px] text-sky-300 font-mono">Compass 3D</span>
          </button>
        )}
      </div>

      {/* 5. Progressive Web App (PWA) Mobile Installation */}
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
          Install NaviLink directly to your mobile home screen. Includes background live GPS tracking, instant offline cache, and seamless automatic updates when code is pushed to GitHub.
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

      {/* 6. Account & Profile Management */}
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
