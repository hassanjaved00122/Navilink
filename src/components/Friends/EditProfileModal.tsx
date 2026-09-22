import React, { useState, useEffect } from 'react';
import { UserProfile } from '../../types';
import { User, Phone, Camera, Sparkles, X, Check, Trash2, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  currentLocation?: { latitude: number; longitude: number };
  onUpdateProfile: (updated: {
    name: string;
    phoneNumber: string;
    avatarUrl: string;
    uniqueAppId: string;
  }) => void;
  onUpdateLocation?: (coords: { latitude: number; longitude: number }) => void;
  onDeleteProfile?: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentLocation,
  onUpdateProfile,
  onUpdateLocation,
  onDeleteProfile,
}) => {
  const [name, setName] = useState(currentUser.name);
  const [phoneNumber, setPhoneNumber] = useState(currentUser.phoneNumber);
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl);
  const [uniqueAppId, setUniqueAppId] = useState(currentUser.uniqueAppId);
  const [latitudeStr, setLatitudeStr] = useState<string>(
    currentLocation ? currentLocation.latitude.toString() : '31.693851'
  );
  const [longitudeStr, setLongitudeStr] = useState<string>(
    currentLocation ? currentLocation.longitude.toString() : '74.250259'
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name);
      setPhoneNumber(currentUser.phoneNumber);
      setAvatarUrl(currentUser.avatarUrl);
      setUniqueAppId(currentUser.uniqueAppId);
      setShowDeleteConfirm(false);
    }
  }, [currentUser, isOpen]);

  useEffect(() => {
    if (currentLocation) {
      setLatitudeStr(currentLocation.latitude.toString());
      setLongitudeStr(currentLocation.longitude.toString());
    }
  }, [currentLocation, isOpen]);

  if (!isOpen) return null;

  // Auto-generate unique tracking number incorporating phone number digits + system hash
  const handleAutoGenerateId = () => {
    const phoneDigits = phoneNumber.replace(/\D/g, '');
    const suffixDigits = phoneDigits.length >= 4 ? phoneDigits.slice(-4) : Math.floor(1000 + Math.random() * 9000).toString();
    const randomHash = Math.random().toString(36).substring(2, 6);
    const newId = `@radar_${suffixDigits}_${randomHash}`;
    setUniqueAppId(newId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let finalId = uniqueAppId.trim();
    if (!finalId) {
      const phoneDigits = phoneNumber.replace(/\D/g, '');
      const suffix = phoneDigits.length >= 4 ? phoneDigits.slice(-4) : '1234';
      finalId = `@radar_${suffix}_${Math.random().toString(36).substring(2, 6)}`;
    }

    onUpdateProfile({
      name: name.trim(),
      phoneNumber: phoneNumber.trim(),
      avatarUrl: avatarUrl.trim() || currentUser.avatarUrl,
      uniqueAppId: finalId.startsWith('@') ? finalId : `@${finalId}`,
    });

    const latNum = parseFloat(latitudeStr);
    const lngNum = parseFloat(longitudeStr);
    if (!isNaN(latNum) && !isNaN(lngNum) && onUpdateLocation) {
      onUpdateLocation({
        latitude: latNum,
        longitude: lngNum,
      });
    }

    confetti({
      particleCount: 40,
      spread: 50,
      origin: { y: 0.6 },
      colors: ['#ef4444', '#f87171', '#000000'],
    });

    onClose();
  };

  const presetAvatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md max-h-[92dvh] bg-[#14161b] border border-[#262a33] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#111317] border-b border-[#222630] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#181c24] border border-[#2b313e] flex items-center justify-center text-slate-300">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Edit Profile</h3>
              <p className="text-[10px] sm:text-[11px] text-slate-400">Profile name, phone number & radar ID</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1c2029] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 flex-1 overflow-y-auto no-scrollbar">
          {/* Profile Picture / Avatar */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-slate-400" />
              <span>Profile Picture</span>
            </label>
            <div className="flex items-center gap-3">
              <img
                src={avatarUrl}
                alt="Avatar preview"
                className="w-12 h-12 rounded-full object-cover border border-[#333a48] bg-[#0e1014]"
              />
              <div className="flex-1 space-y-1">
                <input
                  type="text"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="Image URL"
                  className="w-full px-3 py-1.5 rounded-lg bg-[#0e1014] border border-[#2b303c] focus:border-slate-400 text-xs text-slate-200 outline-none transition-colors"
                />
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  <span className="text-[10px] text-slate-500 shrink-0">Presets:</span>
                  {presetAvatars.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setAvatarUrl(url)}
                      className={`w-6 h-6 rounded-full overflow-hidden border transition-all shrink-0 cursor-pointer ${
                        avatarUrl === url ? 'border-blue-400 scale-105' : 'border-[#2c3240] opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Profile Name */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Profile Name</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Hamza Khan"
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#0e1014] border border-[#2b303c] focus:border-slate-400 text-xs text-slate-200 outline-none transition-colors font-medium"
            />
          </div>

          {/* Phone Number */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>Phone Number</span>
            </label>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g. +92 300 1234567"
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#0e1014] border border-[#2b303c] focus:border-slate-400 text-xs text-slate-200 font-mono outline-none transition-colors"
            />
          </div>

          {/* System Auto-Generated Unique Live Location Tracking Number */}
          <div className="space-y-1.5 p-3 rounded-xl bg-[#0e1014] border border-[#222732]">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-slate-400" />
                <span>Live Location Tracking ID</span>
              </label>
              <button
                type="button"
                onClick={handleAutoGenerateId}
                className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
              >
                Regenerate ID
              </button>
            </div>
            <input
              type="text"
              value={uniqueAppId}
              onChange={(e) => setUniqueAppId(e.target.value)}
              placeholder="@radar_4567_89ab"
              className="w-full px-3 py-1.5 rounded-lg bg-[#14161b] border border-[#2b303c] text-xs font-mono text-slate-300 outline-none"
            />
            <p className="text-[10px] text-slate-500">
              System auto-generates a unique tracking handle incorporating your phone digits.
            </p>
          </div>

          {/* Exact GPS Coordinates Section */}
          <div className="space-y-2 p-3 rounded-xl bg-[#0e1014] border border-[#222732]">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Exact GPS Coordinates (Lat / Lng)</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setLatitudeStr('31.693851');
                  setLongitudeStr('74.250259');
                }}
                className="text-[10px] text-emerald-400 hover:text-emerald-300 underline font-medium cursor-pointer"
              >
                Set My Exact GPS (31.693851, 74.250259)
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-400 block mb-0.5 font-mono">Latitude</span>
                <input
                  type="text"
                  value={latitudeStr}
                  onChange={(e) => setLatitudeStr(e.target.value)}
                  placeholder="31.693851"
                  className="w-full px-3 py-1.5 rounded-lg bg-[#14161b] border border-[#2b303c] text-xs font-mono text-emerald-300 outline-none"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block mb-0.5 font-mono">Longitude</span>
                <input
                  type="text"
                  value={longitudeStr}
                  onChange={(e) => setLongitudeStr(e.target.value)}
                  placeholder="74.250259"
                  className="w-full px-3 py-1.5 rounded-lg bg-[#14161b] border border-[#2b303c] text-xs font-mono text-emerald-300 outline-none"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-500 font-mono">
              N 31° 41&apos; 37.863&quot;, E 74° 15&apos; 0.931&quot;
            </p>
          </div>

          {/* Actions */}
          <div className="pt-2 flex flex-col gap-2.5 border-t border-[#222630]">
            {showDeleteConfirm && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-rose-200">Delete this profile permanently?</p>
                    <p className="text-[11px] text-rose-300/80">
                      Your identity, live coordinates, and session will be completely erased.
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-[#1a1e28] hover:bg-[#252b39] border border-slate-700 transition-colors cursor-pointer"
                  >
                    No, Keep Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onDeleteProfile) {
                        onDeleteProfile();
                      }
                      onClose();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 shadow-sm border border-rose-500 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete Now</span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              {onDeleteProfile && !showDeleteConfirm && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-600 border border-rose-500/20 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Profile</span>
                </button>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-[#1c2029] border border-[#2b303c] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-xs font-medium transition-all shadow-sm border border-blue-600/30 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Profile</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
