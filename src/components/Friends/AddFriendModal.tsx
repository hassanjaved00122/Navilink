import React, { useState, useMemo } from 'react';
import { UserPlus, Phone, User, MapPin, X, Check, Sparkles, Search, AtSign, Clock, CheckCircle2, UserCheck } from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserProfile } from '../../types';

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddContact: (newContact: {
    name: string;
    phoneNumber: string;
    uniqueAppId: string;
    latitude?: number;
    longitude?: number;
  }) => void;
  userLocation?: { lat: number; lng: number };
  allUsers?: UserProfile[];
  currentUser?: UserProfile;
  onSendRequest?: (targetUserId: string) => void;
  onAcceptRequest?: (senderUserId: string) => void;
  onRejectRequest?: (senderUserId: string) => void;
}

export const AddFriendModal: React.FC<AddFriendModalProps> = ({
  isOpen,
  onClose,
  onAddContact,
  userLocation,
  allUsers = [],
  currentUser,
  onSendRequest,
  onAcceptRequest,
  onRejectRequest,
}) => {
  const [activeTab, setActiveTab] = useState<'search' | 'manual'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [uniqueAppId, setUniqueAppId] = useState('');
  const [locationMode, setLocationMode] = useState<'same_room' | 'nearby' | 'remote'>('same_room');
  const [error, setError] = useState('');

  // Filter out self from search and ensure strict uniqueness by userId
  const currentUid = currentUser?.userId;
  const otherUsers = useMemo(() => {
    const userMap = new Map<string, typeof allUsers[0]>();
    for (const u of allUsers) {
      if (u && u.userId && u.userId !== currentUid) {
        userMap.set(u.userId, u);
      }
    }
    return Array.from(userMap.values());
  }, [allUsers, currentUid]);

  if (!isOpen) return null;

  const queryClean = searchQuery.trim().toLowerCase();
  const searchResults = otherUsers.filter((user) => {
    if (!queryClean) return true;
    return (
      (user.uniqueAppId && user.uniqueAppId.toLowerCase().includes(queryClean)) ||
      (user.phoneNumber && user.phoneNumber.includes(queryClean)) ||
      (user.name && user.name.toLowerCase().includes(queryClean))
    );
  });

  const handleAutoGenerateId = () => {
    const phoneDigits = phoneNumber.replace(/\D/g, '');
    const suffixDigits = phoneDigits.length >= 4 ? phoneDigits.slice(-4) : Math.floor(1000 + Math.random() * 9000).toString();
    const randomHash = Math.random().toString(36).substring(2, 6);
    setUniqueAppId(`@radar_${suffixDigits}_${randomHash}`);
  };

  const handleSubmitManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter contact name');
      return;
    }
    if (!phoneNumber.trim()) {
      setError('Please enter phone number');
      return;
    }

    const cleanHandle = uniqueAppId.trim()
      ? (uniqueAppId.startsWith('@') ? uniqueAppId : `@${uniqueAppId}`)
      : `@radar_${Math.floor(1000 + Math.random() * 9000)}_${Math.random().toString(36).substring(2, 6)}`;

    let targetLat: number | undefined = undefined;
    let targetLng: number | undefined = undefined;

    const baseLat = userLocation?.lat ?? 31.693851;
    const baseLng = userLocation?.lng ?? 74.250259;

    if (locationMode === 'same_room') {
      targetLat = baseLat;
      targetLng = baseLng;
    } else if (locationMode === 'nearby') {
      targetLat = baseLat + 0.0003;
      targetLng = baseLng + 0.0003;
    }

    onAddContact({
      name: name.trim(),
      phoneNumber: phoneNumber.trim(),
      uniqueAppId: cleanHandle,
      latitude: targetLat,
      longitude: targetLng,
    });

    confetti({
      particleCount: 40,
      spread: 50,
      origin: { y: 0.6 },
      colors: ['#ef4444', '#f87171', '#000000'],
    });

    setName('');
    setPhoneNumber('');
    setUniqueAppId('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-lg max-h-[92dvh] bg-[#14161b] border border-[#272d3b] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 bg-[#111317] border-b border-[#242934] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#181c24] border border-[#2b313e] flex items-center justify-center text-red-400">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#F3F4F6]">Add & Connect Users</h3>
              <p className="text-[10px] sm:text-[11px] text-slate-400">Search registered accounts or send friend request</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1c2029] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-2 bg-[#0e1014] border-b border-[#222732] shrink-0 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('search')}
            className={`flex-1 py-1.5 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'search'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-[#1a1e27]'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search Registered Accounts</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-1.5 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'manual'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-[#1a1e27]'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Manual Contact</span>
          </button>
        </div>

        {/* Tab 1: Search Registered Users */}
        {activeTab === 'search' && (
          <div className="p-4 flex flex-col flex-1 overflow-hidden">
            {/* Search Input Box */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                id="input-search-registered-users"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search user by name, @username, or phone number..."
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#0e1014] border border-[#282d38] focus:border-red-500 text-xs text-[#F3F4F6] placeholder-slate-500 outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-[11px] text-slate-400 hover:text-white cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* User Results List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar max-h-[340px]">
              {searchResults.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400">
                  <p>No user account found matching "{searchQuery}".</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('manual')}
                    className="mt-2 text-red-400 hover:underline font-semibold"
                  >
                    Add as Manual Contact instead →
                  </button>
                </div>
              ) : (
                searchResults.map((user, idx) => {
                  const isFriend = currentUser?.friendList?.includes(user.userId);
                  const isPendingSent = currentUser?.pendingOutgoingRequests?.includes(user.userId);
                  const isPendingReceived = currentUser?.pendingIncomingRequests?.includes(user.userId);

                  return (
                    <div
                      key={`search-user-${user.userId}-${idx}`}
                      className="p-3 rounded-xl bg-[#0e1014] border border-[#252a36] hover:border-[#384052] flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative shrink-0">
                          <img
                            src={user.avatarUrl}
                            alt={user.name}
                            className="w-10 h-10 rounded-full object-cover border border-slate-700 bg-black"
                          />
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0e1014] ${
                              user.isOnline ? 'bg-emerald-400' : 'bg-slate-600'
                            }`}
                          />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-xs text-white truncate">{user.name}</h4>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 font-mono truncate">
                            <span className="text-red-400 truncate">{user.uniqueAppId}</span>
                            {user.phoneNumber && (
                              <>
                                <span>•</span>
                                <span className="truncate">{user.phoneNumber}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="shrink-0">
                        {isFriend ? (
                          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-[11px] font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Connected</span>
                          </div>
                        ) : isPendingReceived ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onAcceptRequest && onAcceptRequest(user.userId)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-md transition-all active:scale-95 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Accept</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onRejectRequest && onRejectRequest(user.userId)}
                              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                              title="Decline"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : isPendingSent ? (
                          <button
                            type="button"
                            disabled
                            className="px-2.5 py-1 rounded-lg bg-zinc-800/80 border border-zinc-700 text-zinc-400 text-[11px] font-medium flex items-center gap-1 cursor-not-allowed"
                          >
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span>Request Sent</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onSendRequest && onSendRequest(user.userId)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold shadow-md shadow-red-600/20 active:scale-95 transition-all cursor-pointer"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Send Request</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Manual Contact Creation Form */}
        {activeTab === 'manual' && (
          <form onSubmit={handleSubmitManual} className="p-4 sm:p-5 space-y-3.5 flex-1 overflow-y-auto no-scrollbar">
            {error && (
              <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0"></span>
                <span>{error}</span>
              </div>
            )}

            {/* Full Name */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-red-400" />
                <span>Contact Name</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ali Ahmed"
                className="w-full px-3 py-2 rounded-xl bg-[#0e1014] border border-[#282d38] focus:border-red-500 text-xs text-[#F3F4F6] placeholder-slate-500 outline-none transition-all"
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-red-400" />
                <span>SIM / Country Phone Number</span>
              </label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g. +92 301 9876543"
                className="w-full px-3 py-2 rounded-xl bg-[#0e1014] border border-[#282d38] focus:border-red-500 text-xs text-[#F3F4F6] placeholder-slate-500 outline-none font-mono transition-all"
              />
            </div>

            {/* Live Location Track Number */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-red-400" />
                  <span>Live Radar ID</span>
                </label>
                <button
                  type="button"
                  onClick={handleAutoGenerateId}
                  className="px-2 py-0.5 rounded bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 text-[10px] font-mono font-medium cursor-pointer"
                >
                  Auto Generate
                </button>
              </div>
              <input
                type="text"
                value={uniqueAppId}
                onChange={(e) => setUniqueAppId(e.target.value)}
                placeholder="@radar_7654_3ab1"
                className="w-full px-3 py-2 rounded-xl bg-[#0e1014] border border-[#282d38] focus:border-red-500 text-xs text-[#F3F4F6] placeholder-slate-500 outline-none font-mono transition-all"
              />
            </div>

            {/* Live Location Preset Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-red-400" />
                <span>Location / Proximity</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setLocationMode('same_room')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    locationMode === 'same_room'
                      ? 'bg-red-950/60 border-red-500 text-white ring-1 ring-red-500/50'
                      : 'bg-[#0e1014] border-[#282d38] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="text-xs font-bold block text-red-300">📍 Same Room</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">0m distance (exact spot)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLocationMode('nearby')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    locationMode === 'nearby'
                      ? 'bg-red-950/60 border-red-500 text-white ring-1 ring-red-500/50'
                      : 'bg-[#0e1014] border-[#282d38] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="text-xs font-bold block text-red-300">🚶 Nearby</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">~30m walking step</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLocationMode('remote')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    locationMode === 'remote'
                      ? 'bg-red-950/60 border-red-500 text-white ring-1 ring-red-500/50'
                      : 'bg-[#0e1014] border-[#282d38] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="text-xs font-bold block text-red-300">🌐 Waiting GPS</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Sync on phone connect</span>
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#222732]">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-all shadow-lg shadow-red-600/30 active:scale-95 cursor-pointer border border-red-500/40"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save & Connect</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};


