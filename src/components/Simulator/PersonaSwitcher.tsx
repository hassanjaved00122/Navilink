import React from 'react';
import { UserProfile } from '../../types';
import { Users, Ghost, MapPinOff, RefreshCw, Terminal, Sparkles } from 'lucide-react';

interface PersonaSwitcherProps {
  users: UserProfile[];
  currentUserId: string;
  onSwitchUser: (userId: string) => void;
  onResetDemo: () => void;
  onOpenSocketLogs: () => void;
  socketLogsCount: number;
}

export const PersonaSwitcher: React.FC<PersonaSwitcherProps> = ({
  users,
  currentUserId,
  onSwitchUser,
  onResetDemo,
  onOpenSocketLogs,
  socketLogsCount,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md">
      {/* Persona Selector */}
      <div className="flex items-center gap-2 overflow-x-auto py-1">
        <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider pl-1 shrink-0 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-cyan-400" />
          Persona:
        </span>

        <div className="flex items-center gap-1.5">
          {Array.from(new Map(users.map((u) => [u.userId, u])).values()).slice(0, 4).map((user, idx) => {
            const isSelected = user.userId === currentUserId;

            return (
              <button
                key={`persona-item-${user.userId}-${idx}`}
                onClick={() => onSwitchUser(user.userId)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 ${
                  isSelected
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                    : 'bg-slate-950/70 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-4 h-4 rounded-full object-cover shrink-0"
                />
                <span>{user.name.split(' ')[0]}</span>

                {user.ghostMode && (
                  <Ghost className={`w-3 h-3 ${isSelected ? 'text-slate-950' : 'text-purple-400'}`} />
                )}
                {!user.appLocationStatus && (
                  <MapPinOff className={`w-3 h-3 ${isSelected ? 'text-slate-950' : 'text-amber-400'}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Simulator Control Shortcuts */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onOpenSocketLogs}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-700/80 text-xs font-mono text-cyan-300 transition-colors"
        >
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span>WebSocket Stream</span>
          <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-[10px] text-cyan-300 font-bold">
            {socketLogsCount}
          </span>
        </button>

        <button
          onClick={onResetDemo}
          title="Reset sample locations and test states"
          className="p-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-700/80 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
