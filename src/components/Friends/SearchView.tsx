import React, { useState, useMemo } from 'react';
import { UserProfile } from '../../types';
import { Search, UserPlus, Check, X, Phone, AtSign, Clock, Users } from 'lucide-react';

interface SearchViewProps {
  allUsers: UserProfile[];
  currentUser: UserProfile;
  onSendRequest: (targetUserId: string) => void;
  onAcceptRequest: (senderUserId: string) => void;
  onRejectRequest: (senderUserId: string) => void;
  onOpenAddModal?: () => void;
  onClose?: () => void;
}

export const SearchView: React.FC<SearchViewProps> = ({
  allUsers,
  currentUser,
  onSendRequest,
  onAcceptRequest,
  onRejectRequest,
  onOpenAddModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'search' | 'requests'>('search');

  // Filter out self and ensure strict uniqueness by userId
  const otherUsers = useMemo(() => {
    const userMap = new Map<string, typeof allUsers[0]>();
    for (const u of allUsers) {
      if (u && u.userId && u.userId !== currentUser.userId) {
        userMap.set(u.userId, u);
      }
    }
    return Array.from(userMap.values());
  }, [allUsers, currentUser.userId]);

  // Search results
  const queryClean = searchQuery.trim().toLowerCase();
  const searchResults = otherUsers.filter((user) => {
    if (!queryClean) return true; // Show all discoverable contacts by default
    return (
      (user.uniqueAppId && user.uniqueAppId.toLowerCase().includes(queryClean)) ||
      (user.phoneNumber && user.phoneNumber.includes(queryClean)) ||
      (user.name && user.name.toLowerCase().includes(queryClean))
    );
  });

  // Pending incoming requests (deduplicated)
  const incomingRequests = useMemo(() => {
    const reqIds = new Set(currentUser.pendingIncomingRequests || []);
    const userMap = new Map<string, typeof allUsers[0]>();
    for (const u of allUsers) {
      if (u && u.userId && reqIds.has(u.userId)) {
        userMap.set(u.userId, u);
      }
    }
    return Array.from(userMap.values());
  }, [allUsers, currentUser.pendingIncomingRequests]);

  return (
    <div id="search-view-container" className="flex flex-col h-full bg-black rounded-2xl border border-zinc-900 p-4 md:p-6 overflow-hidden">
      {/* Header & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-900">
        <div>
          <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            Connect & Friends
          </h3>
          <p className="text-xs text-zinc-400">Search users or add a new contact by phone number</p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenAddModal && (
            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md shadow-red-600/20 transition-all active:scale-95 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Contact</span>
            </button>
          )}

          <div className="flex rounded-xl bg-black p-1 border border-red-500/50 text-xs">
            <button
              onClick={() => setActiveTab('search')}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === 'search'
                  ? 'bg-red-600 text-white shadow-md font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Find Users
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-3 py-1 rounded-lg font-medium transition-all relative cursor-pointer ${
                activeTab === 'requests'
                  ? 'bg-red-600 text-white shadow-md font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Requests
              {incomingRequests.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-rose-500 text-white">
                  {incomingRequests.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'search' ? (
        <div className="flex flex-col flex-1 overflow-hidden mt-4">
          {/* Search Input Box */}
          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
            <input
              id="input-user-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by @username or +1 (555) 000-0000..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-sm text-zinc-100 placeholder-zinc-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Search Results List */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {searchResults.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-sm">
                No users found matching "{searchQuery}". Try searching by exact phone or unique App ID.
              </div>
            ) : (
              searchResults.map((user, idx) => {
                const isFriend = currentUser.friendList.includes(user.userId);
                const isPendingSent = currentUser.pendingOutgoingRequests.includes(user.userId);
                const isPendingReceived = currentUser.pendingIncomingRequests.includes(user.userId);

                return (
                  <div
                    key={`search-usr-${user.userId}-${idx}`}
                    className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-900 hover:border-zinc-800 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={user.avatarUrl}
                        alt={user.name}
                        className="w-11 h-11 rounded-full object-cover border border-zinc-800 bg-black shrink-0"
                      />
                      <div>
                        <h5 className="font-semibold text-sm text-zinc-100 leading-snug">{user.name}</h5>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-zinc-400 font-mono">
                          <span className="flex items-center gap-1 text-cyan-400">
                            <AtSign className="w-3 h-3" />
                            {user.uniqueAppId.replace('@', '')}
                          </span>
                          <span className="text-zinc-600">&bull;</span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-zinc-500" />
                            {user.phoneNumber}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div>
                      {isFriend ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
                          <Check className="w-3.5 h-3.5" />
                          Friends
                        </span>
                      ) : isPendingSent ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          Requested
                        </span>
                      ) : isPendingReceived ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onAcceptRequest(user.userId)}
                            className="p-1.5 rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 text-xs font-bold transition-colors cursor-pointer"
                            title="Accept Request"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onRejectRequest(user.userId)}
                            className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 text-xs font-bold transition-colors cursor-pointer"
                            title="Reject Request"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          id={`btn-add-friend-${user.userId}`}
                          onClick={() => onSendRequest(user.userId)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-cyan-500/20 active:scale-95 cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          Add Contact
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* Requests Tab */
        <div className="flex flex-col flex-1 overflow-y-auto mt-4 space-y-3">
          {incomingRequests.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-sm">
              No pending incoming friend requests.
            </div>
          ) : (
            incomingRequests.map((user, idx) => (
              <div
                key={`incoming-usr-${user.userId}-${idx}`}
                className="p-4 rounded-xl bg-zinc-950 border border-cyan-500/30 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-12 h-12 rounded-full object-cover border border-cyan-400/50 shrink-0"
                  />
                  <div>
                    <h5 className="font-semibold text-sm text-zinc-100">{user.name}</h5>
                    <p className="text-xs text-zinc-400 font-mono">{user.uniqueAppId}</p>
                    <p className="text-[11px] text-cyan-300 mt-1">wants to connect for mutual tracking</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onAcceptRequest(user.userId)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors shadow-md shadow-emerald-500/20 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Accept
                  </button>
                  <button
                    onClick={() => onRejectRequest(user.userId)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-medium transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    Decline
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
