import React from 'react';
import { ShieldedFriendLocation, UserProfile } from '../../types';
import { DirectionStep } from '../../services/googleDirectionsService';
import {
  Navigation,
  Footprints,
  Car,
  CornerUpLeft,
  CornerUpRight,
  ArrowUp,
  MapPin,
  Clock,
  Compass,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Route as RouteIcon,
  Sparkles,
} from 'lucide-react';

interface DirectionsTabProps {
  currentUser: UserProfile;
  activeFriend: ShieldedFriendLocation | null;
  routeMode: 'walking' | 'driving';
  onChangeRouteMode: (mode: 'walking' | 'driving') => void;
  directionSteps: DirectionStep[];
  routeSummary?: string;
  distanceFormatted?: string;
  durationFormatted?: string;
  startAddress?: string;
  endAddress?: string;
  onFocusRoute: () => void;
  onTriggerAR?: () => void;
  routeSource?: 'google' | 'osrm' | 'fallback';
}

export const DirectionsTab: React.FC<DirectionsTabProps> = ({
  currentUser,
  activeFriend,
  routeMode,
  onChangeRouteMode,
  directionSteps,
  routeSummary,
  distanceFormatted,
  durationFormatted,
  startAddress,
  endAddress,
  onFocusRoute,
  onTriggerAR,
  routeSource = 'google',
}) => {
  const getStepIcon = (instruction: string, maneuver?: string) => {
    const text = instruction.toLowerCase();
    const man = (maneuver || '').toLowerCase();

    if (man.includes('left') || text.includes('turn left') || text.includes('slight left')) {
      return <CornerUpLeft className="w-4 h-4 text-cyan-400 shrink-0" />;
    }
    if (man.includes('right') || text.includes('turn right') || text.includes('slight right')) {
      return <CornerUpRight className="w-4 h-4 text-cyan-400 shrink-0" />;
    }
    if (text.includes('arrive') || text.includes('destination')) {
      return <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />;
    }
    return <ArrowUp className="w-4 h-4 text-blue-400 shrink-0" />;
  };

  return (
    <div className="flex flex-col h-full bg-[#0f172a] text-slate-100 overflow-y-auto">
      {/* Top Header Card with Origin -> Destination */}
      <div className="p-4 bg-gradient-to-b from-[#1e293b] to-[#0f172a] border-b border-slate-800 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight">Turn-by-Turn Navigation</h3>
              <p className="text-[10px] text-cyan-400 font-mono">
                {routeSource === 'google' ? 'Google Maps Platform API' : 'High-Precision Road Router'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-700/80">
            <button
              onClick={() => onChangeRouteMode('walking')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                routeMode === 'walking'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Walking Directions along road sidewalks"
            >
              <Footprints className="w-3.5 h-3.5" />
              <span>Walk</span>
            </button>
            <button
              onClick={() => onChangeRouteMode('driving')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                routeMode === 'driving'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Driving Directions along vehicle lanes"
            >
              <Car className="w-3.5 h-3.5" />
              <span>Drive</span>
            </button>
          </div>
        </div>

        {/* Origin & Destination Addresses */}
        <div className="space-y-2 bg-slate-900/80 rounded-xl p-3 border border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-900 shrink-0"></div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase font-bold text-slate-400">Start (Your GPS)</p>
              <p className="text-xs text-slate-200 truncate font-medium">
                {startAddress || 'Your Live Current Location'}
              </p>
            </div>
          </div>

          <div className="border-l-2 border-dashed border-slate-700 ml-1.5 h-3"></div>

          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-slate-900 shrink-0"></div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase font-bold text-slate-400">Destination</p>
              <p className="text-xs text-slate-200 truncate font-medium">
                {activeFriend ? `${activeFriend.user.name} (${activeFriend.user.uniqueAppId})` : 'Target Friend'}
              </p>
            </div>
          </div>
        </div>

        {/* Route Stats Ribbon */}
        {distanceFormatted && durationFormatted && (
          <div className="mt-3 flex items-center justify-between p-2.5 rounded-xl bg-blue-950/40 border border-blue-500/30 text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <div>
                <span className="text-base font-extrabold text-blue-300 font-mono">
                  {durationFormatted}
                </span>
                <span className="text-slate-400 ml-2 font-mono">({distanceFormatted})</span>
              </div>
            </div>

            <button
              onClick={onFocusRoute}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-sm active:scale-95"
            >
              <RouteIcon className="w-3.5 h-3.5" />
              <span>Center</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Steps Content */}
      <div className="p-4 flex-1 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Directions Steps ({directionSteps.length})
          </h4>
          {routeSummary && (
            <span className="text-[11px] text-cyan-400 font-medium px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/60">
              via {routeSummary}
            </span>
          )}
        </div>

        {directionSteps.length === 0 ? (
          <div className="p-6 text-center rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-2">
            <Navigation className="w-8 h-8 text-slate-500 mx-auto animate-pulse" />
            <p className="text-xs text-slate-300 font-medium">Calculating road directions...</p>
            <p className="text-[11px] text-slate-500">
              Ensure friend is selected and broadcasting active coordinates.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {directionSteps.map((step, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                  {getStepIcon(step.instruction, step.maneuver)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-100 font-medium leading-snug">
                    {step.instruction}
                  </p>
                  {(step.distance || step.duration) && (
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {step.distance} {step.duration ? `• ${step.duration}` : ''}
                    </p>
                  )}
                </div>
                <span className="text-[10px] font-mono text-slate-500 shrink-0">
                  #{idx + 1}
                </span>
              </div>
            ))}

            {/* Arrival Destination Banner */}
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold">
                You will arrive at {activeFriend?.user.name || 'Friend'}
              </span>
            </div>
          </div>
        )}

        {/* Action Button: AR Compass Radar */}
        {onTriggerAR && activeFriend && !activeFriend.isShielded && (
          <button
            onClick={onTriggerAR}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all cursor-pointer active:scale-98"
          >
            <Compass className="w-4 h-4" />
            <span>Launch Live AR 3D Compass Radar</span>
          </button>
        )}
      </div>
    </div>
  );
};
