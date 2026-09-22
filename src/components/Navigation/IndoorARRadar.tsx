import React, { useState, useEffect } from 'react';
import { ShieldedFriendLocation, UserLocation } from '../../types';
import { Compass, X, ArrowUp, Navigation, Signal, Layers, Camera, ShieldAlert } from 'lucide-react';

interface IndoorARRadarProps {
  friend: ShieldedFriendLocation;
  currentLocation: UserLocation;
  onClose: () => void;
}

export const IndoorARRadar: React.FC<IndoorARRadarProps> = ({ friend, currentLocation, onClose }) => {
  const [headingOffset, setHeadingOffset] = useState(0);

  // Gentle compass fluctuation simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setHeadingOffset((prev) => (prev + (Math.random() * 2 - 1)) % 360);
    }, 400);
    return () => clearInterval(interval);
  }, []);

  const { user, isShielded, formattedDistance, distanceMeters, bearing = 0, location } = friend;

  // Calculate relative angle between user heading and target bearing
  const userHeading = (currentLocation.heading || 0) + headingOffset;
  const relativeAngle = (bearing - userHeading + 360) % 360;

  // Floor difference
  const userFloor = currentLocation.currentFloor || 1;
  const friendFloor = location?.currentFloor || 1;
  const floorDiff = friendFloor - userFloor;

  return (
    <div
      id="indoor-ar-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-xl bg-slate-900 border border-cyan-500/40 rounded-3xl overflow-hidden shadow-2xl shadow-cyan-950/50 flex flex-col">
        {/* Top Header Bar */}
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Compass className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base leading-tight flex items-center gap-2">
                AR & Indoor Radar
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  UWB / BLE Precision
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Tracking target: <span className="text-slate-200 font-semibold">{user.name}</span>
              </p>
            </div>
          </div>

          <button
            id="btn-close-ar"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AR Viewport HUD (Simulated AR Overlay) */}
        <div className="relative h-80 bg-slate-950 flex items-center justify-center overflow-hidden">
          {/* Background Grid Pattern & Scanning Sweep */}
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:16px_16px]"></div>
          <div className="absolute inset-0 pointer-events-none border border-cyan-500/20 m-4 rounded-2xl"></div>

          {/* Radar Circles */}
          <div className="absolute w-64 h-64 rounded-full border border-cyan-500/20"></div>
          <div className="absolute w-44 h-44 rounded-full border border-cyan-500/30"></div>
          <div className="absolute w-24 h-24 rounded-full border border-cyan-500/40 animate-ping"></div>

          {/* Rotating Radar Sweep Line */}
          <div className="absolute w-64 h-64 rounded-full overflow-hidden pointer-events-none">
            <div className="w-full h-full animate-radar-sweep origin-center bg-[conic-gradient(from_0deg,transparent_0deg,transparent_270deg,rgba(6,182,212,0.3)_360deg)]"></div>
          </div>

          {/* Crosshair Reticle */}
          <div className="absolute pointer-events-none w-16 h-16 border border-cyan-400/40 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
            <div className="absolute top-0 w-px h-3 bg-cyan-400"></div>
            <div className="absolute bottom-0 w-px h-3 bg-cyan-400"></div>
            <div className="absolute left-0 h-px w-3 bg-cyan-400"></div>
            <div className="absolute right-0 h-px w-3 bg-cyan-400"></div>
          </div>

          {isShielded ? (
            /* Privacy Shield Notice in AR */
            <div className="relative z-10 p-4 max-w-sm rounded-2xl bg-slate-900/90 border border-amber-500/40 text-center space-y-2 backdrop-blur-md shadow-2xl">
              <ShieldAlert className="w-8 h-8 text-amber-400 mx-auto" />
              <h4 className="text-sm font-bold text-amber-300">Target Coordinates Hidden</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                This user has activated their privacy shield or ghost mode. Real-time AR beacons cannot be rendered
                until authorized by the friend.
              </p>
            </div>
          ) : (
            /* Live AR Friend Reticle */
            <div
              className="absolute z-10 transition-all duration-500 flex flex-col items-center"
              style={{
                transform: `rotate(${relativeAngle}deg) translateY(-85px) rotate(-${relativeAngle}deg)`,
              }}
            >
              <div className="relative group cursor-pointer animate-bounce">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/95 border-2 border-cyan-400 shadow-xl shadow-cyan-500/50 text-xs font-bold text-cyan-300 mb-1">
                  <Camera className="w-3 h-3 text-cyan-400" />
                  <span>{user.name.split(' ')[0]}</span>
                  <span className="text-[10px] text-slate-300 font-mono">({formattedDistance})</span>
                </div>
                <div className="w-12 h-12 rounded-full border-2 border-cyan-400 overflow-hidden bg-slate-800 mx-auto shadow-lg shadow-cyan-400/50">
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          )}

          {/* Compass Degrees Ribbon */}
          <div className="absolute top-3 left-4 right-4 flex items-center justify-between text-[11px] font-mono text-cyan-400 bg-slate-950/80 px-3 py-1 rounded-lg border border-cyan-500/20">
            <span>HEADING: {Math.round(userHeading)}&deg;</span>
            <span>BEARING: {bearing}&deg;</span>
            <span>OFFSET: {Math.round(relativeAngle)}&deg;</span>
          </div>

          {/* Directional Arrow Guide */}
          {!isShielded && (
            <div className="absolute bottom-3 flex items-center gap-2 bg-slate-900/90 border border-slate-700 px-3 py-1.5 rounded-full text-xs text-slate-200">
              <ArrowUp
                className="w-4 h-4 text-cyan-400 transition-transform duration-300"
                style={{ transform: `rotate(${relativeAngle}deg)` }}
              />
              <span>
                {Math.abs(relativeAngle) < 20
                  ? 'Target is directly ahead'
                  : relativeAngle < 180
                  ? `Turn right ${Math.round(relativeAngle)}&deg;`
                  : `Turn left ${Math.round(360 - relativeAngle)}&deg;`}
              </span>
            </div>
          )}
        </div>

        {/* Indoor Floor & Zone Navigation Card */}
        <div className="p-4 md:p-5 bg-slate-950 border-t border-slate-800 space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            {/* Distance */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="block text-[10px] text-slate-400 uppercase font-mono">Radial Range</span>
              <span className="font-mono font-bold text-cyan-400 text-sm md:text-base">
                {isShielded ? 'SHIELDED' : formattedDistance}
              </span>
            </div>

            {/* Vertical Floor Level */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="block text-[10px] text-slate-400 uppercase font-mono">Floor Level</span>
              <span className="font-mono font-bold text-purple-300 text-sm md:text-base flex items-center justify-center gap-1">
                <Layers className="w-3.5 h-3.5" />
                Floor {friendFloor}
              </span>
              <span className="block text-[10px] text-slate-500 mt-0.5">
                {floorDiff === 0 ? 'Same Floor' : floorDiff > 0 ? `+${floorDiff} floors up` : `${floorDiff} floors down`}
              </span>
            </div>

            {/* BLE Signal RSSI */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="block text-[10px] text-slate-400 uppercase font-mono">Beacon Signal</span>
              <span className="font-mono font-bold text-emerald-400 text-sm md:text-base flex items-center justify-center gap-1">
                <Signal className="w-3.5 h-3.5" />
                {!isShielded && distanceMeters && distanceMeters < 500 ? '-58 dBm' : '-82 dBm'}
              </span>
              <span className="block text-[10px] text-slate-500 mt-0.5">High Quality</span>
            </div>
          </div>

          {location?.indoorZone && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Navigation className="w-4 h-4 text-cyan-400" />
                <span>Indoor Landmark / Zone:</span>
                <span className="font-semibold text-slate-100">{location.indoorZone}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
