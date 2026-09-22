import React from 'react';
import { ShieldedFriendLocation } from '../../types';
import { Battery, BatteryCharging, Compass, ShieldAlert, EyeOff, MapPin, Signal } from 'lucide-react';

interface FriendLocationCardProps {
  friend: ShieldedFriendLocation;
  isSelected: boolean;
  onSelect: () => void;
  onOpenAR: () => void;
}

export const FriendLocationCard: React.FC<FriendLocationCardProps> = ({
  friend,
  isSelected,
  onSelect,
  onOpenAR,
}) => {
  const { user, isShielded, shieldReason, formattedDistance, bearing, bearingDirection, location } = friend;

  // Battery helper
  const getBatteryColor = (level: number) => {
    if (level > 50) return 'text-emerald-400';
    if (level > 20) return 'text-amber-400';
    return 'text-rose-400';
  };

  return (
    <div
      id={`friend-card-${friend.userId}`}
      onClick={onSelect}
      className={`relative p-4 rounded-2xl border transition-all cursor-pointer group select-none ${
        isSelected
          ? 'bg-slate-800/90 border-cyan-400/80 shadow-xl shadow-cyan-950/40 ring-1 ring-cyan-400/50'
          : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/60 hover:border-slate-700/80'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Avatar & Online Dot */}
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-full border border-slate-700 overflow-hidden bg-slate-800 shrink-0">
            <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${
                user.isOnline ? 'bg-emerald-400' : 'bg-slate-500'
              }`}
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-slate-100 text-sm leading-snug group-hover:text-cyan-400 transition-colors">
                {user.name}
              </h4>
            </div>
            <p className="text-xs text-slate-400 font-mono">{user.uniqueAppId}</p>

            {/* Distance or Shield Badge */}
            <div className="mt-1 flex items-center gap-2">
              {isShielded ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-[11px] font-medium text-amber-300">
                  <EyeOff className="w-3 h-3" />
                  {shieldReason === 'location_toggle_off'
                    ? 'Location Hidden by User'
                    : shieldReason === 'ghost_mode_active'
                    ? 'Ghost Shield Active'
                    : 'Coordinates Shielded'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-[11px] font-mono font-semibold text-cyan-300">
                  <MapPin className="w-3 h-3 text-cyan-400" />
                  {formattedDistance || 'Calculating...'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Battery & Telemetry Indicators */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="flex items-center gap-1 text-xs font-mono font-medium">
            {user.isCharging ? (
              <BatteryCharging className="w-4 h-4 text-emerald-400 animate-pulse" />
            ) : (
              <Battery className={`w-4 h-4 ${getBatteryColor(user.batteryLevel)}`} />
            )}
            <span className={getBatteryColor(user.batteryLevel)}>{user.batteryLevel}%</span>
          </div>

          <span className="text-[10px] text-slate-500 font-mono">
            {user.isOnline ? 'Active Now' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Expanded Details when not shielded */}
      {!isShielded && location && (
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
            <span className="flex items-center gap-1">
              <Signal className="w-3 h-3 text-cyan-400" />
              &plusmn;{location.accuracy}m
            </span>
            <span>|</span>
            <span>
              {bearing}&deg; {bearingDirection}
            </span>
            {location.currentFloor && (
              <>
                <span>|</span>
                <span className="text-purple-300">Floor {location.currentFloor}</span>
              </>
            )}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenAR();
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[11px] font-semibold transition-colors active:scale-95"
          >
            <Compass className="w-3 h-3" />
            AR Radar
          </button>
        </div>
      )}

      {/* Notice banner if shielded */}
      {isShielded && (
        <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center gap-1.5 text-[11px] text-slate-400">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate">
            {shieldReason === 'location_toggle_off'
              ? 'Target turned off in-app location broadcast'
              : 'Target is in Ghost Mode'}
          </span>
        </div>
      )}
    </div>
  );
};
