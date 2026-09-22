import React, { useState, useEffect, useRef } from 'react';
import { ShieldedFriendLocation, UserLocation, UserProfile } from '../../types';
import {
  Camera,
  Compass,
  X,
  Maximize2,
  Minimize2,
  Navigation,
  ArrowUp,
  CornerUpRight,
  CornerUpLeft,
  MapPin,
  Sparkles,
  Layers,
  Volume2,
  VolumeX,
  RotateCcw,
  Footprints,
  Eye,
  Sliders,
  Radio,
  CheckCircle2,
  ShieldAlert,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

interface GoogleMapsLiveViewARProps {
  friend: ShieldedFriendLocation;
  currentUser: UserProfile;
  currentLocation: UserLocation;
  onClose: () => void;
  routeMode?: 'walking' | 'driving';
}

export const GoogleMapsLiveViewAR: React.FC<GoogleMapsLiveViewARProps> = ({
  friend,
  currentUser,
  currentLocation,
  onClose,
  routeMode = 'walking',
}) => {
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isSplitView, setIsSplitView] = useState<boolean>(true);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [pitchAngle, setPitchAngle] = useState<number>(0); // Vertical tilt (-45 to 45 deg)
  const [yawAngle, setYawAngle] = useState<number>(0); // Horizontal pan (-180 to 180 deg)
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [dragStartY, setDragStartY] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvas3DRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { user, isShielded, formattedDistance, distanceMeters = 150, bearing = 45, location } = friend;

  // Initialize Real Camera Stream
  useEffect(() => {
    let active = true;

    async function startCamera() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera not supported in this environment');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (active) {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
          setIsCameraActive(true);
          setCameraError(null);
        } else {
          stream.getTracks().forEach((t) => t.stop());
        }
      } catch (err: any) {
        if (active) {
          setIsCameraActive(false);
          setCameraError(
            'Camera preview unavailable or permission denied. Using high-fidelity Live View 3D simulation.'
          );
        }
      }
    }

    startCamera();

    // Listen to real device orientation if on a mobile device with gyro
    const handleDeviceOrientation = (e: DeviceOrientationEvent) => {
      if (e.alpha !== null) {
        // alpha is compass direction (0 to 360)
        setYawAngle(e.alpha);
      }
      if (e.beta !== null) {
        // beta is pitch (-180 to 180)
        setPitchAngle(Math.max(-40, Math.min(40, e.beta - 60)));
      }
    };

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleDeviceOrientation);
    }

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (window.DeviceOrientationEvent) {
        window.removeEventListener('deviceorientation', handleDeviceOrientation);
      }
    };
  }, []);

  // Calculate relative angle to target
  const userHeading = (currentLocation.heading || 0) + yawAngle;
  const relativeAngle = ((bearing - userHeading + 540) % 360) - 180; // -180 to 180

  // Floor difference
  const userFloor = currentLocation.currentFloor || 1;
  const friendFloor = location?.currentFloor || 1;
  const floorDiff = friendFloor - userFloor;

  // Turn-by-turn guidance simulated steps for Google Live View
  const arSteps = [
    {
      instruction: `Head straight toward ${user.name.split(' ')[0]}'s location`,
      distance: `${Math.round(distanceMeters * 0.4)} m`,
      maneuver: 'straight',
      street: 'Officer Colony Road, Sharif Colony',
    },
    {
      instruction: `Continue walking along the blue AR markers`,
      distance: `${Math.round(distanceMeters * 0.3)} m`,
      maneuver: 'straight',
      street: 'Near Sir Syed Model School B#2',
    },
    {
      instruction: `Target is at destination on Floor ${friendFloor}`,
      distance: 'Destination',
      maneuver: 'arrive',
      street: `${user.name}'s Pin (${location?.indoorZone || 'Sharif Colony, Sheikhupura'})`,
    },
  ];

  // Mouse / Touch drag to look around in 3D AR space
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragStartY(e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartX;
    const deltaY = e.clientY - dragStartY;
    setYawAngle((prev) => (prev - deltaX * 0.3) % 360);
    setPitchAngle((prev) => Math.max(-35, Math.min(35, prev + deltaY * 0.2)));
    setDragStartX(e.clientX);
    setDragStartY(e.clientY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Render 3D Ground AR Arrows Canvas
  useEffect(() => {
    const canvas = canvas3DRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let frame = 0;

    const render = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const w = canvas.width;
      const h = canvas.height;
      const horizonY = h * 0.55 + pitchAngle * 3;

      // Draw AR 3D Ground Arrow Lane
      if (!isShielded) {
        const numArrows = 6;
        const targetScreenX = w / 2 + relativeAngle * 7;

        for (let i = numArrows; i >= 1; i--) {
          // Progress offset for animated flowing arrows
          const progress = ((i + (frame * 0.03) % 1) / numArrows);
          const y = horizonY + (h - horizonY) * Math.pow(progress, 1.8);
          const x = w / 2 + (targetScreenX - w / 2) * (1 - progress * 0.7);
          const scale = 0.2 + progress * 0.9;
          const alpha = Math.min(1, Math.sin(progress * Math.PI) * 1.2);

          ctx.save();
          ctx.translate(x, y);
          ctx.scale(scale, scale * 0.6); // Flatten in perspective

          // Draw Glowing 3D AR Google Maps Blue Chevron
          ctx.beginPath();
          ctx.moveTo(0, -35);
          ctx.lineTo(45, 20);
          ctx.lineTo(30, 25);
          ctx.lineTo(0, -10);
          ctx.lineTo(-30, 25);
          ctx.lineTo(-45, 20);
          ctx.closePath();

          ctx.fillStyle = `rgba(37, 99, 235, ${alpha * 0.85})`;
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 18;
          ctx.fill();

          ctx.lineWidth = 3;
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.95})`;
          ctx.stroke();

          // Inner pulsing accent
          ctx.beginPath();
          ctx.moveTo(0, -25);
          ctx.lineTo(25, 12);
          ctx.lineTo(0, -3);
          ctx.lineTo(-25, 12);
          ctx.closePath();
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.7})`;
          ctx.fill();

          ctx.restore();
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [relativeAngle, pitchAngle, isShielded]);

  const currentStep = arSteps[stepIndex] || arSteps[0];

  return (
    <div
      id="google-maps-live-view-modal"
      className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white font-sans overflow-hidden select-none animate-in fade-in duration-300"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* 1. TOP FLOATING GOOGLE LIVE VIEW INSTRUCTION BANNER */}
      <div className="absolute top-4 left-4 right-4 z-30 flex flex-col items-center pointer-events-none">
        <div className="pointer-events-auto w-full max-w-lg bg-slate-900/95 backdrop-blur-xl border border-blue-500/50 rounded-2xl p-3.5 shadow-2xl shadow-blue-950/80 flex items-center justify-between gap-3 transition-all">
          {/* Large Turn Maneuver Icon */}
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-600/40 animate-pulse">
            {relativeAngle < -30 ? (
              <CornerUpLeft className="w-7 h-7" />
            ) : relativeAngle > 30 ? (
              <CornerUpRight className="w-7 h-7" />
            ) : (
              <ArrowUp className="w-7 h-7" />
            )}
          </div>

          {/* Maneuver Text & Distance */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold text-white tracking-tight">
                {Math.abs(relativeAngle) < 25
                  ? 'Walk straight'
                  : relativeAngle < 0
                  ? `Turn Left in 20m`
                  : `Turn Right in 20m`}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-500/30">
                LIVE VIEW
              </span>
            </div>
            <p className="text-xs text-slate-300 truncate mt-0.5">
              Toward <span className="font-semibold text-cyan-300">{user.name}</span> &bull;{' '}
              <span className="text-emerald-400 font-mono font-bold">{formattedDistance}</span> remaining
            </p>
          </div>

          {/* Audio / Step Controls */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setIsAudioMuted(!isAudioMuted)}
              title={isAudioMuted ? 'Unmute Audio Guidance' : 'Mute Audio Guidance'}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>
            <button
              id="btn-close-live-view"
              onClick={onClose}
              title="Exit Live View AR"
              className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-white border border-rose-500/40 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Calibration / Status pill */}
        <div className="mt-2 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/80 text-[11px] font-medium text-slate-300 flex items-center gap-2 shadow-lg pointer-events-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>AR Visual Positioning System (VPS) Active</span>
          <span className="text-slate-500">&bull;</span>
          <span className="font-mono text-cyan-300">Target Bearing: {bearing}&deg;</span>
        </div>
      </div>

      {/* 2. AR VIEWPORT (Camera feed + 3D perspective graphics) */}
      <div
        className={`relative w-full overflow-hidden transition-all duration-300 ${
          isSplitView ? 'h-[62%] sm:h-[65%]' : 'h-full'
        }`}
      >
        {/* Actual Video Camera Stream */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-500 ${
            isCameraActive ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Photorealistic 3D Live Street Simulation (Fallback or Interactive environment) */}
        {!isCameraActive && (
          <div className="absolute inset-0 w-full h-full z-0 overflow-hidden bg-gradient-to-b from-slate-900 via-[#0f172a] to-[#020617]">
            {/* Simulated Sky & Horizon */}
            <div
              className="absolute inset-0 transition-transform duration-100 pointer-events-none"
              style={{
                transform: `translateY(${pitchAngle * 4}px)`,
              }}
            >
              {/* Distant City Skyline & Street Elements */}
              <div className="absolute inset-x-0 bottom-1/2 h-36 bg-gradient-to-t from-slate-900/90 to-transparent flex items-end justify-around px-8 opacity-60">
                <div className="w-16 h-28 bg-slate-800/80 rounded-t-lg border-t border-slate-700/50"></div>
                <div className="w-24 h-36 bg-slate-800/90 rounded-t-xl border-t border-cyan-500/20"></div>
                <div className="w-12 h-20 bg-slate-800/70 rounded-t-md"></div>
                <div className="w-28 h-40 bg-slate-800/80 rounded-t-2xl border-t border-slate-700/50"></div>
                <div className="w-14 h-24 bg-slate-800/60 rounded-t-lg"></div>
              </div>

              {/* Street Pavement & Road Perspective Grid */}
              <div className="absolute inset-x-0 top-1/2 bottom-0 bg-gradient-to-b from-slate-950/40 via-slate-900 to-black">
                <div className="w-full h-full opacity-25 bg-[linear-gradient(to_right,#38bdf8_1px,transparent_1px),linear-gradient(to_bottom,#38bdf8_1px,transparent_1px)] bg-[size:4rem_4rem] [transform:perspective(500px)_rotateX(60deg)] origin-top"></div>
              </div>

              {/* Crosswalk & Walking Trail Overlay */}
              <div className="absolute inset-x-0 bottom-0 h-44 flex justify-center items-end opacity-40 pointer-events-none">
                <div className="w-72 h-full bg-gradient-to-t from-blue-500/20 to-transparent border-x border-blue-400/30 [transform:perspective(400px)_rotateX(65deg)] origin-bottom"></div>
              </div>
            </div>
          </div>
        )}

        {/* 3D AR Ground Flowing Arrows Canvas */}
        <canvas
          ref={canvas3DRef}
          width={1280}
          height={720}
          className="absolute inset-0 w-full h-full z-10 pointer-events-none object-cover"
        />

        {/* AR 3D FLOATING DESTINATION PIN / BEACON OVER TARGET FRIEND */}
        {isShielded ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
            <div className="bg-slate-950/90 border border-amber-500/50 rounded-2xl p-4 max-w-sm text-center shadow-2xl backdrop-blur-md animate-in zoom-in-95">
              <ShieldAlert className="w-10 h-10 text-amber-400 mx-auto mb-2" />
              <h4 className="font-bold text-amber-300 text-sm">Target Shielded in Live View</h4>
              <p className="text-xs text-slate-300 mt-1">
                {user.name} has enabled location privacy shield. Approximate distance is active.
              </p>
            </div>
          </div>
        ) : (
          <div
            className="absolute z-20 transition-all duration-75 flex flex-col items-center pointer-events-none"
            style={{
              left: `${Math.max(10, Math.min(90, 50 + (relativeAngle / 45) * 40))}%`,
              top: `${Math.max(18, Math.min(65, 38 + pitchAngle * 0.7))}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* Google Maps Floating Beacon Card */}
            <div className="flex flex-col items-center animate-bounce duration-1000 pointer-events-auto">
              {/* Floating Pin Header Badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-600 border-2 border-white shadow-2xl shadow-blue-500 text-xs font-bold text-white mb-1.5">
                <MapPin className="w-3.5 h-3.5 fill-current" />
                <span>{user.name}</span>
                <span className="bg-white/20 px-1.5 py-0.2 rounded-full font-mono text-[11px]">
                  {formattedDistance}
                </span>
              </div>

              {/* Target Friend Avatar with 3D Holographic Pulse Ring */}
              <div className="relative">
                <div className="absolute -inset-2 rounded-full bg-blue-500/40 animate-ping"></div>
                <div className="relative w-14 h-14 rounded-full border-3 border-white overflow-hidden shadow-2xl bg-slate-900">
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                </div>
                {/* Floor Badge if applicable */}
                <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-purple-600 text-white font-mono text-[10px] font-bold border border-white">
                  F{friendFloor}
                </div>
              </div>

              {/* Vertical 3D Laser Beam to Ground */}
              <div className="w-0.5 h-16 bg-gradient-to-b from-blue-400 via-blue-500 to-transparent shadow-lg shadow-blue-400"></div>

              {/* Ground Anchor Ring */}
              <div className="w-12 h-5 rounded-full border-2 border-blue-400 bg-blue-500/20 [transform:rotateX(65deg)] animate-pulse"></div>
            </div>
          </div>
        )}

        {/* Off-screen Target Indicator Pill (If friend is outside field of view) */}
        {Math.abs(relativeAngle) > 40 && !isShielded && (
          <div
            className={`absolute top-1/2 -translate-y-1/2 z-20 flex items-center gap-2 px-3.5 py-2 rounded-full bg-blue-600 border border-white text-white font-bold text-xs shadow-2xl transition-all ${
              relativeAngle < 0 ? 'left-4' : 'right-4'
            }`}
          >
            {relativeAngle < 0 ? (
              <>
                <CornerUpLeft className="w-4 h-4 animate-bounce" />
                <span>Look Left ({Math.round(Math.abs(relativeAngle))}&deg;)</span>
              </>
            ) : (
              <>
                <span>Look Right ({Math.round(relativeAngle)}&deg;)</span>
                <CornerUpRight className="w-4 h-4 animate-bounce" />
              </>
            )}
          </div>
        )}

        {/* Bottom AR HUD Overlays (Drag Hint & Quick Controls) */}
        <div className="absolute bottom-3 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700/80 text-xs text-slate-300 flex items-center gap-1.5 pointer-events-auto">
            <Compass className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Pan screen or tilt phone to explore 360&deg; AR view</span>
            <span className="sm:hidden">Drag to look around</span>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Split Screen Toggle */}
            <button
              onClick={() => setIsSplitView(!isSplitView)}
              title={isSplitView ? 'Switch to Fullscreen AR' : 'Switch to Split Screen AR + Map'}
              className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xl transition-all cursor-pointer"
            >
              {isSplitView ? (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Full AR</span>
                </>
              ) : (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Split Map</span>
                </>
              )}
            </button>

            {/* Recenter Heading */}
            <button
              onClick={() => {
                setYawAngle(0);
                setPitchAngle(0);
              }}
              title="Recenter AR Camera"
              className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM SPLIT-SCREEN GOOGLE MINI MAP INSET */}
      {isSplitView && (
        <div className="relative flex-1 w-full bg-[#0f172a] border-t border-slate-800 flex flex-col overflow-hidden">
          {/* Top Bar for Mini Map */}
          <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-200 font-semibold">
              <Navigation className="w-3.5 h-3.5 text-blue-400" />
              <span>Google Maps 2D Live Tracker</span>
            </div>
            <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
              <span>Mode: {routeMode.toUpperCase()}</span>
              <span>&bull;</span>
              <span className="text-emerald-400 font-bold">Accuracy: ~2m</span>
            </div>
          </div>

          {/* Mini 2D Map Canvas Simulation with Live Synchronized Compass Cone */}
          <div className="relative flex-1 w-full bg-[#0b141a] overflow-hidden flex items-center justify-center">
            {/* Grid roads */}
            <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-40"></div>

            {/* Simulated Road Paths */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <line x1="20%" y1="0" x2="20%" y2="100%" stroke="#1e293b" strokeWidth="16" />
              <line x1="80%" y1="0" x2="80%" y2="100%" stroke="#1e293b" strokeWidth="16" />
              <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#1e293b" strokeWidth="20" />

              {/* Blue Live Route Polyline from User to Friend */}
              <line
                x1="50%"
                y1="75%"
                x2="50%"
                y2="50%"
                stroke="#1d4ed8"
                strokeWidth="8"
                strokeLinecap="round"
              />
              <line
                x1="50%"
                y1="50%"
                x2="65%"
                y2="50%"
                stroke="#1d4ed8"
                strokeWidth="8"
                strokeLinecap="round"
              />
              <line
                x1="65%"
                y1="50%"
                x2="65%"
                y2="30%"
                stroke="#1d4ed8"
                strokeWidth="8"
                strokeLinecap="round"
              />

              {/* Google Blue Route Glow */}
              <line
                x1="50%"
                y1="75%"
                x2="50%"
                y2="50%"
                stroke="#38bdf8"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <line
                x1="50%"
                y1="50%"
                x2="65%"
                y2="50%"
                stroke="#38bdf8"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <line
                x1="65%"
                y1="50%"
                x2="65%"
                y2="30%"
                stroke="#38bdf8"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>

            {/* Target Friend Pin on Mini Map */}
            <div
              className="absolute z-20 flex flex-col items-center pointer-events-none"
              style={{ left: '65%', top: '30%', transform: 'translate(-50%, -100%)' }}
            >
              <div className="px-2 py-0.5 rounded-full bg-blue-600 text-[10px] font-bold text-white shadow-lg border border-white mb-1">
                {user.name.split(' ')[0]}
              </div>
              <div className="w-8 h-8 rounded-full border-2 border-white shadow-xl overflow-hidden bg-slate-900">
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              </div>
              <div className="w-2 h-2 rounded-full bg-blue-600 -mt-1 shadow-md"></div>
            </div>

            {/* Current User Location Pin with Live Heading Cone */}
            <div
              className="absolute z-20 flex flex-col items-center pointer-events-none"
              style={{ left: '50%', top: '75%', transform: 'translate(-50%, -50%)' }}
            >
              {/* Rotating Heading Field of View Cone */}
              <div
                className="absolute -top-12 w-24 h-24 pointer-events-none transition-transform duration-100 origin-bottom"
                style={{ transform: `rotate(${userHeading}deg)` }}
              >
                <div className="w-full h-full bg-[conic-gradient(from_-30deg_at_50%_100%,rgba(56,189,248,0.4)_0deg,rgba(56,189,248,0)_60deg)]"></div>
              </div>

              {/* Glowing User Dot */}
              <div className="relative w-6 h-6 rounded-full bg-blue-600 border-2 border-white shadow-xl flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white"></div>
                <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-75"></div>
              </div>
            </div>

            {/* Distance & ETA Badge in bottom right of mini map */}
            <div className="absolute bottom-3 right-3 z-30 px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700/80 shadow-xl backdrop-blur-md flex items-center gap-3">
              <div>
                <span className="block text-[10px] text-slate-400 uppercase font-mono">Distance</span>
                <span className="font-bold text-white text-xs">{formattedDistance}</span>
              </div>
              <div className="h-6 w-px bg-slate-700"></div>
              <div>
                <span className="block text-[10px] text-slate-400 uppercase font-mono">Walk ETA</span>
                <span className="font-bold text-emerald-400 text-xs">
                  {Math.max(1, Math.round((distanceMeters || 100) / 75))} min
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
