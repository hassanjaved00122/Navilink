import React, { useState } from 'react';
import { ShieldedFriendLocation, UserProfile } from '../../types';
import {
  Users,
  ChevronUp,
  ChevronDown,
  Navigation,
  Search,
  UserPlus,
  Shield,
  X,
  MapPin,
  Trash2,
  Bell,
  Check,
} from 'lucide-react';

interface FriendsBottomSheetProps {
  friends: ShieldedFriendLocation[];
  selectedFriendId: string | null;
  onSelectFriend: (friendId: string | null) => void;
  onOpenAddContact: () => void;
  onDeleteContact?: (contactUserId: string, e: React.MouseEvent) => void;
  onClearAllContacts?: () => void;
  incomingRequests?: UserProfile[];
  onAcceptRequest?: (senderUserId: string) => void;
  onRejectRequest?: (senderUserId: string) => void;
}

export const FriendsBottomSheet: React.FC<FriendsBottomSheetProps> = ({
  friends,
  selectedFriendId,
  onSelectFriend,
  onOpenAddContact,
  onDeleteContact,
  onClearAllContacts,
  incomingRequests = [],
  onAcceptRequest,
  onRejectRequest,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFriends = friends.filter((f) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      f.user.name.toLowerCase().includes(query) ||
      f.user.uniqueAppId.toLowerCase().includes(query) ||
      f.user.phoneNumber.includes(query)
    );
  });

  const onlineCount = friends.filter((f) => f.user.appLocationStatus).length;
  const pendingRequestsCount = incomingRequests.length;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex flex-col items-center pointer-events-none select-none">
      {/* Main Bottom Sheet Container */}
      <div
        className={`pointer-events-auto w-full max-w-xl bg-black/95 backdrop-blur-2xl border-t border-x border-sky-400/50 rounded-t-[24px] shadow-[0_-15px_40px_rgba(0,0,0,0.8)] transition-all duration-300 ease-out flex flex-col ${
          isOpen ? 'max-h-[60vh] sm:max-h-[75vh] h-[380px] sm:h-[480px]' : 'h-13 sm:h-14'
        }`}
      >
        {/* Pull Handle & Header Bar */}
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between cursor-pointer hover:bg-zinc-900 transition-colors rounded-t-[24px]"
        >
          {/* Left: Indicator & Requests badge */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-black border border-sky-400 flex items-center justify-center text-sky-400">
              <Users className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white">
                Contacts ({onlineCount} Online / {friends.length} Total)
              </span>
              {pendingRequestsCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold animate-pulse flex items-center gap-1">
                  <Bell className="w-2.5 h-2.5" />
                  <span>{pendingRequestsCount} Request{pendingRequestsCount > 1 ? 's' : ''}</span>
                </span>
              )}
            </div>
          </div>

          {/* Center: Sleek Pill Indicator */}
          <div className="w-8 sm:w-10 h-1 bg-sky-400/50 rounded-full" />

          {/* Right: Expand/Collapse Icon */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-400 hidden sm:inline">
              {isOpen ? 'Tap to minimize' : 'Tap to view contacts'}
            </span>
            {isOpen ? (
              <ChevronDown className="w-4 h-4 text-sky-400" />
            ) : (
              <ChevronUp className="w-4 h-4 text-sky-400" />
            )}
          </div>
        </div>

        {/* Expanded Content Area */}
        {isOpen && (
          <div className="flex-1 flex flex-col px-4 sm:px-5 pb-3 sm:pb-4 overflow-hidden">
            {/* Pending Friend Requests Card Banner (if any) */}
            {incomingRequests.length > 0 && (
              <div className="mb-2.5 p-2.5 rounded-xl bg-zinc-950 border border-sky-400/60 shadow-lg space-y-2 shrink-0">
                <div className="flex items-center justify-between text-xs text-sky-300 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-sky-400" />
                    Incoming Friend Requests ({incomingRequests.length})
                  </span>
                  <span className="text-[10px] text-zinc-400">Tap Accept to connect</span>
                </div>
                <div className="space-y-1.5 max-h-32 overflow-y-auto no-scrollbar">
                  {incomingRequests.map((sender, idx) => (
                    <div
                      key={`incoming-req-${sender.userId}-${idx}`}
                      className="p-2 rounded-lg bg-black border border-zinc-800 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={sender.avatarUrl}
                          alt={sender.name}
                          className="w-7 h-7 rounded-full object-cover border border-sky-400"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{sender.name}</p>
                          <p className="text-[10px] text-zinc-400 font-mono truncate">{sender.uniqueAppId}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onAcceptRequest && onAcceptRequest(sender.userId)}
                          className="px-2.5 py-1 rounded-md bg-white text-black border border-white text-[11px] font-bold flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                          <span>Accept</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onRejectRequest && onRejectRequest(sender.userId)}
                          className="p-1 rounded-md bg-black text-white border border-sky-400 hover:bg-zinc-900 transition-colors cursor-pointer"
                          title="Decline"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Search & Add Contact Button */}
            <div className="flex items-center gap-2 mb-2.5 pt-1">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search contacts by name or ID..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-black border border-zinc-800 focus:border-sky-400 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
                />
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenAddContact();
                }}
                className="px-3 py-1.5 rounded-lg bg-black text-white border border-sky-400 hover:bg-zinc-900 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-md"
              >
                <UserPlus className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">Add / Search Users</span>
              </button>

              {onClearAllContacts && friends.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearAllContacts();
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-black text-white border border-sky-400 hover:bg-zinc-900 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  title="Delete All Saved Contacts"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span className="hidden sm:inline">Clear All</span>
                </button>
              )}
            </div>

            {/* Contacts List with no-scrollbar */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 no-scrollbar">
              {filteredFriends.length === 0 ? (
                <div className="text-center py-10 text-xs text-zinc-400">
                  No contacts found. Tap <strong className="text-white cursor-pointer underline" onClick={onOpenAddContact}>Add / Search Users</strong> to search registered accounts.
                </div>
              ) : (
                filteredFriends.map((friend, idx) => {
                  const isSelected = friend.userId === selectedFriendId;
                  const isOnline = friend.user.appLocationStatus;
                  const distanceStr =
                    friend.distanceMeters !== undefined
                      ? friend.distanceMeters > 1000
                        ? `${(friend.distanceMeters / 1000).toFixed(1)} km`
                        : `${Math.round(friend.distanceMeters)} m`
                      : 'Nearby';

                  return (
                    <div
                      key={`contact-${friend.userId}-${idx}`}
                      onClick={() => {
                        onSelectFriend(friend.userId);
                        setIsOpen(false); // Auto-minimize sheet so map is visible!
                      }}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-white text-black border-white shadow-lg'
                          : 'bg-black text-white border-sky-400/60 hover:bg-zinc-900'
                      }`}
                    >
                      {/* Left: Avatar & Info */}
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img
                            src={friend.user.avatarUrl}
                            alt={friend.user.name}
                            className={`w-10 h-10 rounded-full object-cover border ${
                              isSelected ? 'border-black' : isOnline ? 'border-sky-400' : 'border-zinc-700'
                            }`}
                          />
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 ${
                              isSelected ? 'border-white' : 'border-black'
                            } ${isOnline ? 'bg-emerald-400' : 'bg-zinc-600'}`}
                          />
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs font-semibold ${isSelected ? 'text-black' : 'text-white'}`}>
                              {friend.user.name}
                            </span>
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full border ${
                                isOnline
                                  ? isSelected
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                    : 'bg-emerald-950/80 text-emerald-400 border-emerald-600'
                                  : isSelected
                                  ? 'bg-zinc-200 text-zinc-700 border-zinc-300'
                                  : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                              }`}
                            >
                              {isOnline ? 'Online' : 'Offline'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] mt-0.5">
                            {isOnline ? (
                              <span className={`flex items-center gap-1 font-medium ${isSelected ? 'text-blue-900' : 'text-sky-400'}`}>
                                <MapPin className="w-3 h-3" />
                                {distanceStr}
                              </span>
                            ) : (
                              <span className={`${isSelected ? 'text-zinc-600' : 'text-zinc-500'}`}>
                                Location Sharing Off
                              </span>
                            )}
                            <span className={isSelected ? 'text-zinc-400' : 'text-zinc-600'}>•</span>
                            <span className={`font-mono text-[10px] ${isSelected ? 'text-zinc-600' : 'text-zinc-400'}`}>
                              {friend.user.uniqueAppId}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1.5">
                        {onDeleteContact && (
                          <button
                            type="button"
                            onClick={(e) => onDeleteContact(friend.userId, e)}
                            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                              isSelected
                                ? 'text-zinc-600 hover:text-red-600 hover:bg-black/10'
                                : 'text-zinc-400 hover:text-rose-400 hover:bg-zinc-800'
                            }`}
                            title="Remove Contact"
                          >
                            <Trash2 className="w-4 h-4" />
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
      </div>
    </div>
  );
};
