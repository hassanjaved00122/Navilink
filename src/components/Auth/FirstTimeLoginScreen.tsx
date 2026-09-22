import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../../types';
import {
  User,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Camera,
  MapPin,
  Globe,
  ShieldCheck,
  Mail,
  Radio,
  Crosshair,
  RefreshCw,
  Loader2,
  AlertCircle,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { BASE_ANCHOR } from '../../data/mockDatabase';
import { NaviLink3DArrow } from '../Common/NaviLink3DArrow';
import { registerUserAccount, loginUserAccount } from '../../services/firebase';
import { reverseGeocodeCoords } from '../../utils/reverseGeocode';

interface FirstTimeLoginScreenProps {
  onProfileCreated: (newProfile: UserProfile, initialLocation: { lat: number; lng: number }) => void;
  onBackToIntro?: () => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
];

export const FirstTimeLoginScreen: React.FC<FirstTimeLoginScreenProps> = ({
  onProfileCreated,
  onBackToIntro,
}) => {
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');
  const [name, setName] = useState('');
  const [rawPhone, setRawPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0]);
  const [customAvatar, setCustomAvatar] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [locationSharingEnabled, setLocationSharingEnabled] = useState(true);

  // Active Device Location State (Defaults to ON)
  const [deviceCoords, setDeviceCoords] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
    source: 'gps' | 'network' | 'default';
    label: string;
  } | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(true);
  const [locationStatusText, setLocationStatusText] = useState('Detecting current device location...');

  // Automatically detect and access current physical device location with High Accuracy GPS
  const detectDeviceLocation = useCallback(() => {
    setIsDetectingLocation(true);
    setLocationStatusText('Acquiring high-accuracy hardware GPS...');

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      const handleGpsSuccess = async (pos: GeolocationPosition) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const roundedAcc = Math.round(accuracy) || 4;
        const address = await reverseGeocodeCoords(latitude, longitude);
        setDeviceCoords({
          lat: latitude,
          lng: longitude,
          accuracy: roundedAcc,
          source: 'gps',
          label: address,
        });
        setIsDetectingLocation(false);
        setLocationStatusText(`Live GPS: ${address} (±${roundedAcc}m)`);
      };

      // 1. High Accuracy GPS hardware sensor (real satellite / phone GPS)
      navigator.geolocation.getCurrentPosition(
        handleGpsSuccess,
        (_geoErr) => {
          // 2. Fallback to standard network geolocation if satellite fix takes time
          navigator.geolocation.getCurrentPosition(
            handleGpsSuccess,
            (_netErr) => {
              // Location permission needed
              setDeviceCoords({
                lat: BASE_ANCHOR.lat,
                lng: BASE_ANCHOR.lng,
                accuracy: 5,
                source: 'default',
                label: 'Sharif Colony, Lahore',
              });
              setIsDetectingLocation(false);
              setLocationStatusText('Please allow browser location for live GPS');
            },
            {
              enableHighAccuracy: false,
              timeout: 6000,
              maximumAge: 0,
            }
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0,
        }
      );
    } else {
      setDeviceCoords({
        lat: BASE_ANCHOR.lat,
        lng: BASE_ANCHOR.lng,
        accuracy: 5,
        source: 'default',
        label: 'Coordinates Initialized',
      });
      setIsDetectingLocation(false);
      setLocationStatusText('Coordinates Initialized');
    }
  }, []);

  useEffect(() => {
    detectDeviceLocation();
  }, [detectDeviceLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      let profile: UserProfile;
      const initialLat = deviceCoords?.lat || BASE_ANCHOR.lat;
      const initialLng = deviceCoords?.lng || BASE_ANCHOR.lng;

      if (authMode === 'signup') {
        if (!name.trim()) {
          throw new Error('Please enter your full name');
        }
        if (!rawPhone.trim()) {
          throw new Error('Please enter your Pakistan phone number');
        }
        if (!email.trim() || !password.trim()) {
          throw new Error('Please enter your email and password');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }

        try {
          profile = await registerUserAccount(name, rawPhone, email, password);
          const customImg = customAvatar.trim() || selectedAvatar;
          if (customImg) {
            profile.avatarUrl = customImg;
          }
        } catch (regErr: any) {
          if (regErr.code === 'auth/email-already-in-use') {
            // Automatically attempt sign-in with the provided credentials
            try {
              profile = await loginUserAccount(email, password);
            } catch (_loginErr) {
              // Switch UI mode to Login and prompt for correct password
              setAuthMode('login');
              throw new Error('This email is already registered. Please enter your password to log in.');
            }
          } else {
            throw regErr;
          }
        }
      } else {
        if (!email.trim() || !password.trim()) {
          throw new Error('Please enter your email and password to log in');
        }
        profile = await loginUserAccount(email, password);
      }

      profile.appLocationStatus = locationSharingEnabled;
      profile.isOnline = locationSharingEnabled;

      onProfileCreated(profile, { lat: initialLat, lng: initialLng });
    } catch (err: any) {
      let msg = err.message || 'Authentication failed. Please check your details.';
      if (err.code === 'auth/email-already-in-use') {
        setAuthMode('login');
        msg = 'This email is already registered. Please sign in with your password.';
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        msg = 'Incorrect email or password. Please try again.';
      } else if (err.code === 'auth/user-not-found') {
        msg = 'No account found with this email. Please sign up.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters.';
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const activeAvatar = customAvatar.trim() ? customAvatar.trim() : selectedAvatar;

  return (
    <div className="h-screen h-[100dvh] max-h-[100dvh] w-screen bg-[#000000] text-[#F3F4F6] flex items-center justify-center p-2 sm:p-4 lg:p-10 relative overflow-hidden font-sans select-none">
      {/* Studio Ambient Glows */}
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-emerald-950/20 rounded-full blur-[180px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-6xl h-full lg:h-auto max-h-[96dvh] bg-[#000000] border border-[#1f2633] rounded-2xl sm:rounded-[28px] shadow-[0_25px_60px_rgba(0,0,0,0.9)] flex flex-col lg:flex-row overflow-hidden relative z-10">
        {/* LEFT SIDE (Live Preview on Desktop) */}
        <div className="hidden lg:flex w-full lg:w-[54%] p-8 lg:p-10 flex-col justify-between relative bg-[#000000] border-b lg:border-b-0 lg:border-r border-[#1a202c] overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-30 pointer-events-none" />

          {/* Top Branding */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <NaviLink3DArrow size="sm" animate={true} />
              <div>
                <span className="text-sm font-bold tracking-tight">
                  <span className="text-white">Navi</span>
                  <span className="text-sky-400 ml-0.5">Link</span>
                </span>
                <p className="text-[11px] text-slate-400">Firebase Realtime Spatial Cloud</p>
              </div>
            </div>

            {onBackToIntro && (
              <button
                type="button"
                onClick={onBackToIntro}
                className="text-xs text-sky-400 hover:text-sky-300 transition-colors cursor-pointer px-2.5 py-1 rounded-md bg-[#000000] border border-sky-500/30"
              >
                ← Intro
              </button>
            )}
          </div>

          {/* Center Visual Mock */}
          <div className="relative my-4 z-10">
            <div className="relative w-full rounded-2xl bg-[#14171f] border border-[#262c38] p-4 shadow-2xl">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#242934] text-[11px] text-[#9CA3AF] font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[#F3F4F6] font-medium">FIREBASE AUTH & 1-READ CLOUD</span>
                </div>
                <div className="flex items-center gap-1 text-emerald-400">
                  <Globe className="w-3.5 h-3.5" />
                  <span>PAKISTAN (+92) READY</span>
                </div>
              </div>

              {/* Graphic View */}
              <div className="relative w-full h-[180px] rounded-xl bg-[#0a0c10] border border-[#1f242e] overflow-hidden flex items-center justify-center p-4">
                <div className="text-center space-y-2">
                  <div className="flex justify-center">
                    <div className="relative p-3 rounded-2xl bg-zinc-900/90 border border-emerald-500/40 shadow-xl">
                      <NaviLink3DArrow size="md" animate={true} />
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                      </span>
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-white">
                    {authMode === 'signup' ? 'Ready to Create Your Account' : 'Ready to Sign In'}
                  </p>
                  <p className="text-[11px] text-zinc-400 max-w-xs mx-auto">
                    Live GPS device tracking is activated automatically. Privacy switches let you mute anytime.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Highlights */}
          <div className="relative z-10 grid grid-cols-3 gap-2 pt-3 border-t border-[#222630]">
            <div>
              <p className="text-xs font-semibold text-[#F3F4F6]">Firebase Cloud</p>
              <p className="text-[10px] text-[#9CA3AF] mt-0.5">1-Read Optimized</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#F3F4F6]">Default +92 Code</p>
              <p className="text-[10px] text-[#9CA3AF] mt-0.5">Pakistan Format</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#F3F4F6]">Auto GPS Live</p>
              <p className="text-[10px] text-[#9CA3AF] mt-0.5">Default ON</p>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE (Form) */}
        <div className="w-full lg:w-[46%] p-3.5 sm:p-6 lg:p-8 flex flex-col justify-between bg-[#000000] h-full overflow-y-auto">
          <div className="max-w-md w-full mx-auto my-auto flex flex-col justify-between h-full py-1">
            {/* Header & Toggle */}
            <div className="mb-2">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80 mb-2">
                <div className="flex items-center gap-2">
                  <NaviLink3DArrow size="xs" />
                  <h2 className="text-base sm:text-xl font-bold text-white tracking-tight">
                    {authMode === 'signup' ? 'Create Account' : 'Sign In to NaviLink'}
                  </h2>
                </div>

                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black border border-sky-400">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signup');
                      setError(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      authMode === 'signup'
                        ? 'bg-white text-black border border-white font-bold shadow-sm'
                        : 'bg-black text-white hover:bg-zinc-900'
                    }`}
                  >
                    Sign Up
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setError(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      authMode === 'login'
                        ? 'bg-white text-black border border-white font-bold shadow-sm'
                        : 'bg-black text-white hover:bg-zinc-900'
                    }`}
                  >
                    Log In
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-zinc-400">
                {authMode === 'signup'
                  ? 'Enter your name, Pakistan phone number (+92), email, and password.'
                  : 'Enter your registered email and password to log in.'}
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <div className="mb-2 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-2.5 flex-1 flex flex-col justify-center">
              {authMode === 'signup' && (
                <>
                  {/* 1. Profile Avatar Selection */}
                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-black border border-sky-400/40">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-sky-400 bg-zinc-900 shrink-0">
                      <img src={activeAvatar} alt="Profile preview" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                        {PRESET_AVATARS.map((url, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setSelectedAvatar(url);
                              setCustomAvatar('');
                            }}
                            className={`relative w-6 h-6 rounded-full overflow-hidden border transition-all shrink-0 cursor-pointer ${
                              selectedAvatar === url && !customAvatar
                                ? 'border-sky-400 scale-110 shadow'
                                : 'border-zinc-700 opacity-60 hover:opacity-100'
                            }`}
                          >
                            <img src={url} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 2. Full Name Input */}
                  <div>
                    <label className="block text-[10px] sm:text-[11px] font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
                      <input
                        id="input-signup-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Hassan Javed"
                        className="w-full pl-8 pr-3 py-2 rounded-lg bg-black border border-zinc-800 focus:border-sky-400 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
                        required
                      />
                    </div>
                  </div>

                  {/* 3. Phone Number with default Pakistan Code (+92) */}
                  <div>
                    <label className="block text-[10px] sm:text-[11px] font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                      Phone Number (Pakistan +92)
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-2.5 flex items-center gap-1 text-[11px] font-bold text-sky-400 select-none">
                        <span>🇵🇰</span>
                        <span>+92</span>
                      </div>
                      <input
                        id="input-signup-phone"
                        type="tel"
                        value={rawPhone}
                        onChange={(e) => {
                          let val = e.target.value;
                          if (val.startsWith('+92')) val = val.slice(3);
                          if (val.startsWith('03')) val = val.slice(1);
                          setRawPhone(val);
                        }}
                        placeholder="300 1234567"
                        className="w-full pl-16 pr-3 py-2 rounded-lg bg-black border border-zinc-800 focus:border-sky-400 text-xs text-white placeholder-zinc-500 focus:outline-none font-mono transition-colors"
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Email Address */}
              <div>
                <label className="block text-[10px] sm:text-[11px] font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
                  <input
                    id="input-signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-8 pr-3 py-2 rounded-lg bg-black border border-zinc-800 focus:border-sky-400 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-[10px] sm:text-[11px] font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
                  <input
                    id="input-signup-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    minLength={6}
                    className="w-full pl-8 pr-9 py-2 rounded-lg bg-black border border-zinc-800 focus:border-sky-400 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Location Sharing Toggle (Default ON always, with option for user to customize) */}
              {authMode === 'signup' && (
                <div className="p-2.5 rounded-xl bg-black border border-sky-400/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-white">Location Broadcast (Privacy)</p>
                      <p className="text-[10px] text-zinc-400">
                        {locationSharingEnabled
                          ? 'Shows as "Online" to friends with live pin on map'
                          : 'Shows as "Offline" to friends • Pin hidden'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLocationSharingEnabled(!locationSharingEnabled)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        locationSharingEnabled
                          ? 'bg-white text-black border border-white font-bold shadow-md'
                          : 'bg-black text-white border border-sky-400 hover:bg-zinc-900'
                      }`}
                    >
                      {locationSharingEnabled ? 'LOCATION: ON' : 'LOCATION: OFF'}
                    </button>
                  </div>
                </div>
              )}

              {/* Live Device Location Status Banner */}
              <div className="p-2.5 rounded-xl bg-black border border-sky-400/40 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-300">
                    <Crosshair className={`w-3.5 h-3.5 ${isDetectingLocation ? 'animate-spin text-sky-400' : 'text-sky-400'}`} />
                    <span>Device Live Location</span>
                  </div>
                  <button
                    type="button"
                    onClick={detectDeviceLocation}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-black text-white border border-sky-400 hover:bg-zinc-900 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-2.5 h-2.5 ${isDetectingLocation ? 'animate-spin' : ''}`} />
                    <span>Detect GPS</span>
                  </button>
                </div>

                <div className="flex items-center justify-between text-[10px] text-zinc-400">
                  <div className="flex items-center gap-1 text-sky-400 font-medium">
                    <Radio className="w-3 h-3 animate-pulse text-sky-400" />
                    <span>Default: Automatic ON (turn off in Privacy anytime)</span>
                  </div>
                  <span className="text-[9px] text-zinc-500 font-mono">
                    {deviceCoords ? `±${deviceCoords.accuracy}m` : 'Locating...'}
                  </span>
                </div>

                <div className="pt-1.5 border-t border-zinc-800 flex items-center justify-between text-[10px]">
                  <span className="text-sky-400 font-medium truncate max-w-[210px]" title={deviceCoords?.label}>
                    {deviceCoords ? deviceCoords.label : locationStatusText}
                  </span>
                  <span className="text-zinc-500 font-mono text-[9px] shrink-0">
                    {deviceCoords ? `${deviceCoords.lat.toFixed(4)}°, ${deviceCoords.lng.toFixed(4)}°` : ''}
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                id="btn-submit-account"
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-black hover:bg-white text-white hover:text-black border-2 border-sky-400 disabled:opacity-50 font-bold text-xs tracking-wider transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer mt-1 shadow-lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Connecting Firebase...</span>
                  </>
                ) : authMode === 'signup' ? (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Create Account & Start Navigation</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In to NaviLink</span>
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 text-center">
              <p className="text-[10px] text-zinc-500 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Connected to Firebase • 1-Read Optimized Architecture</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
