import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { User, PlayerPublicProfile } from '../../types';
import {
  Users,
  Search,
  UserPlus,
  Radio,
  Ban,
  Check,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

interface CommunityViewProps {
  user: User;
  onInviteToMultiplayer?: (username: string) => void;
}

export const CommunityView: React.FC<CommunityViewProps> = ({ user, onInviteToMultiplayer }) => {
  const [query, setQuery] = useState('');
  const [players, setPlayers] = useState<PlayerPublicProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [friendsList, setFriendsList] = useState<string[]>([]);
  const [blockedList, setBlockedList] = useState<string[]>([]);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const fetchPlayers = async (search = query) => {
    setLoading(true);
    try {
      const [playersRes, socialRes] = await Promise.all([
        api.searchPlayers(search),
        api.getSocialOverview(),
      ]);
      if (playersRes && playersRes.players) {
        setPlayers(playersRes.players);
      }
      if (socialRes) {
        setFriendsList(socialRes.friends || []);
        setBlockedList(socialRes.blocked || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers('');
  }, []);

  const handleAddFriend = async (targetUsername: string) => {
    try {
      const res = await api.sendFriendRequest(targetUsername);
      if (res.error) {
        setActionNotice(res.error);
      } else {
        setActionNotice(`Friend request sent to ${targetUsername}.`);
        fetchPlayers();
      }
      setTimeout(() => setActionNotice(null), 3500);
    } catch (e: any) {
      setActionNotice(e.message);
    }
  };

  const handleBlockUser = async (targetUsername: string) => {
    try {
      await api.blockUser(targetUsername);
      setActionNotice(`Blocked ${targetUsername}.`);
      fetchPlayers();
      setTimeout(() => setActionNotice(null), 3500);
    } catch (e: any) {
      setActionNotice(e.message);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 space-y-6">
      
      {/* Header & Search */}
      <div className="surface-card rounded-2xl p-6 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full bg-[#172231] border border-[#293748] text-[#D99A4E] text-[11px] font-mono font-bold uppercase tracking-wider mb-2">
              <Users className="w-3.5 h-3.5" />
              <span>Explorers of Midnight Ridge</span>
            </div>
            <h2 className="text-2xl font-serif font-bold text-[#DCE8F5]">
              Player Discovery & Community
            </h2>
            <p className="text-xs text-[#91A3B5] mt-1 leading-relaxed">
              Discover companions under the moonlight, inspect their rating and match histories, and forge social alliances.
            </p>
          </div>

          {/* Search Box */}
          <div className="w-full sm:w-72 relative">
            <Search className="w-4 h-4 text-[#8795A7] absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search explorers..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                fetchPlayers(e.target.value);
              }}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#080D16] border border-[#293748] text-[#DCE8F5] text-xs font-sans focus:outline-none focus:border-[#D99A4E] transition-colors placeholder-[#8795A7]/50"
            />
          </div>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3 rounded-xl bg-[#111B2A] border border-[#D99A4E]/40 text-[#D99A4E] text-xs font-mono flex items-center justify-between animate-in fade-in">
          <span>{actionNotice}</span>
          <button onClick={() => setActionNotice(null)} className="text-[10px] uppercase font-bold cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Players Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="surface-card rounded-2xl p-5 animate-pulse space-y-3">
              <div className="h-10 w-32 bg-[#172231] rounded-lg" />
              <div className="h-4 w-full bg-[#172231] rounded" />
              <div className="h-12 w-full bg-[#172231] rounded-lg" />
            </div>
          ))}
        </div>
      ) : players.length === 0 ? (
        <div className="surface-card rounded-2xl p-12 text-center text-[#8795A7] font-sans text-xs">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#D99A4E]" />
          No explorers found matching "{query}".
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {players.map((p) => {
            const isFriend = friendsList.includes(p.username);
            const isBlocked = blockedList.includes(p.username);

            return (
              <div
                key={p.id}
                className="surface-card rounded-2xl p-5 flex flex-col justify-between transition-all hover:border-[#91B7CE]/40"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-[#080D16] border border-[#293748] flex items-center justify-center font-bold text-sm text-[#D99A4E] font-mono">
                        {p.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-semibold text-[#DCE8F5] font-sans">
                            {p.displayName}
                          </span>
                          {p.isOnline && (
                            <span className="w-2 h-2 rounded-full bg-[#32C997]" title="Online Explorer" />
                          )}
                        </div>
                        <span className="text-xs text-[#8795A7] font-mono">@{p.username}</span>
                      </div>
                    </div>

                    <span className="px-2.5 py-0.5 rounded-full bg-[#080D16] border border-[#293748] text-xs font-mono text-[#D99A4E] font-bold">
                      ★ {p.rating}
                    </span>
                  </div>

                  <p className="text-xs text-[#91A3B5] mt-3 italic line-clamp-2 leading-relaxed">
                    "{p.bio || 'Wandering under the cold moonlight.'}"
                  </p>

                  {/* Player Stats Bar */}
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[#293748] text-center font-mono text-xs">
                    <div className="p-2 rounded-lg bg-[#080D16]">
                      <span className="text-[10px] text-[#8795A7] block">Win Rate</span>
                      <span className="font-bold text-[#DCE8F5]">{p.winRate}%</span>
                    </div>
                    <div className="p-2 rounded-lg bg-[#080D16]">
                      <span className="text-[10px] text-[#8795A7] block">Record</span>
                      <span className="font-bold text-[#32C997]">{p.wins}W</span>{' '}
                      <span className="text-[#8795A7]">{p.losses}L</span>
                    </div>
                    <div className="p-2 rounded-lg bg-[#080D16]">
                      <span className="text-[10px] text-[#8795A7] block">Matches</span>
                      <span className="font-bold text-[#91B7CE]">{p.totalGames}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-[#293748] flex items-center justify-between">
                  {isFriend ? (
                    <span className="inline-flex items-center space-x-1.5 text-xs text-[#32C997] font-mono">
                      <Check className="w-3.5 h-3.5" />
                      <span>Alliance Accepted</span>
                    </span>
                  ) : isBlocked ? (
                    <span className="text-xs text-[#F16D78] font-mono">Blocked</span>
                  ) : (
                    <button
                      onClick={() => handleAddFriend(p.username)}
                      className="px-3.5 py-1.5 rounded-lg bg-[#D99A4E]/15 hover:bg-[#D99A4E]/25 border border-[#D99A4E]/30 text-[#D99A4E] text-xs font-sans font-medium flex items-center space-x-1.5 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Send Request</span>
                    </button>
                  )}

                  <div className="flex items-center space-x-2">
                    {onInviteToMultiplayer && (
                      <button
                        onClick={() => onInviteToMultiplayer(p.username)}
                        className="p-2 rounded-lg bg-[#080D16] hover:bg-[#172231] text-[#91B7CE] border border-[#293748] text-xs cursor-pointer"
                        title="Invite to Game Chamber"
                      >
                        <Radio className="w-3.5 h-3.5 text-[#D99A4E]" />
                      </button>
                    )}
                    {!isBlocked && (
                      <button
                        onClick={() => handleBlockUser(p.username)}
                        className="p-2 rounded-lg bg-[#080D16] hover:bg-[#F16D78]/20 text-[#8795A7] hover:text-[#F16D78] border border-[#293748] text-xs cursor-pointer"
                        title="Block Explorer"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
