import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { User, FriendRequestItem } from '../../types';
import {
  UserCheck,
  UserPlus,
  Clock,
  Ban,
  Check,
  X,
  Radio,
  Trash2,
  Users
} from 'lucide-react';

interface FriendsViewProps {
  user: User;
  onInviteToRoom?: (friendName: string) => void;
}

export const FriendsView: React.FC<FriendsViewProps> = ({ user, onInviteToRoom }) => {
  const [subTab, setSubTab] = useState<'friends' | 'incoming' | 'outgoing' | 'blocked'>('friends');
  const [friends, setFriends] = useState<string[]>([]);
  const [incoming, setIncoming] = useState<FriendRequestItem[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequestItem[]>([]);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const fetchSocial = async () => {
    setLoading(true);
    try {
      const res = await api.getSocialOverview();
      if (res) {
        setFriends(res.friends || []);
        setIncoming(res.incomingRequests || []);
        setOutgoing(res.outgoingRequests || []);
        setBlocked(res.blocked || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSocial();
  }, []);

  const handleRespondRequest = async (requestId: string, status: 'ACCEPTED' | 'REJECTED') => {
    try {
      await api.respondFriendRequest(requestId, status);
      setNotice(status === 'ACCEPTED' ? 'Alliance accepted!' : 'Request declined.');
      fetchSocial();
      setTimeout(() => setNotice(null), 3000);
    } catch (e: any) {
      setNotice(e.message);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      await api.respondFriendRequest(requestId, 'CANCELLED');
      setNotice('Request cancelled.');
      fetchSocial();
      setTimeout(() => setNotice(null), 3000);
    } catch (e: any) {
      setNotice(e.message);
    }
  };

  const handleRemoveFriend = async (friendName: string) => {
    if (!confirm(`Sever alliance with ${friendName}?`)) return;
    try {
      await api.removeFriend(friendName);
      setNotice(`Removed ${friendName} from alliances.`);
      fetchSocial();
      setTimeout(() => setNotice(null), 3000);
    } catch (e: any) {
      setNotice(e.message);
    }
  };

  const handleUnblock = async (blockedName: string) => {
    try {
      await api.unblockUser(blockedName);
      setNotice(`Unblocked ${blockedName}.`);
      fetchSocial();
      setTimeout(() => setNotice(null), 3000);
    } catch (e: any) {
      setNotice(e.message);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-6">
      
      {/* Top Banner */}
      <div className="surface-card rounded-2xl p-6 backdrop-blur-md">
        <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full bg-[#172231] border border-[#293748] text-[#D99A4E] text-[11px] font-mono font-bold uppercase tracking-wider mb-2">
          <UserCheck className="w-3.5 h-3.5" />
          <span>Companions of the Night</span>
        </div>
        <h2 className="text-2xl font-serif font-bold text-[#DCE8F5]">
          Alliances & Social Roster
        </h2>
        <p className="text-xs text-[#91A3B5] mt-1 leading-relaxed">
          Manage accepted companions, review incoming requests, and invite allies to private chambers.
        </p>

        {/* Sub-tabs Navigation */}
        <div className="flex space-x-2 mt-6 pt-4 border-t border-[#293748] overflow-x-auto">
          {[
            { id: 'friends', label: `Allies (${friends.length})`, icon: Users },
            { id: 'incoming', label: `Incoming (${incoming.length})`, icon: UserPlus, badge: incoming.length > 0 },
            { id: 'outgoing', label: `Outgoing (${outgoing.length})`, icon: Clock },
            { id: 'blocked', label: `Blocked (${blocked.length})`, icon: Ban },
          ].map((t) => {
            const Icon = t.icon;
            const isSel = subTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSubTab(t.id as any)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-mono transition-all whitespace-nowrap cursor-pointer ${
                  isSel
                    ? 'bg-[#172231] text-[#D99A4E] border border-[#D99A4E]/40 font-bold'
                    : 'text-[#8795A7] hover:bg-[#111B2A] hover:text-[#DCE8F5]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
                {t.badge && (
                  <span className="w-2 h-2 rounded-full bg-[#D99A4E] animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {notice && (
        <div className="p-3 rounded-xl bg-[#111B2A] border border-[#D99A4E]/40 text-[#D99A4E] text-xs font-mono animate-in fade-in">
          {notice}
        </div>
      )}

      {/* Content Container */}
      <div className="surface-card rounded-2xl p-6 backdrop-blur-md min-h-[300px]">
        
        {/* Friends / Allies Tab */}
        {subTab === 'friends' && (
          <div className="space-y-3 font-mono text-xs">
            {friends.length === 0 ? (
              <div className="py-16 text-center text-[#8795A7]">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#D99A4E]" />
                <p className="font-sans text-xs mb-1 text-[#DCE8F5]">No alliances formed yet.</p>
                <p className="text-[11px] text-[#8795A7]">Explore the Community page to find other explorers under the moonlight.</p>
              </div>
            ) : (
              friends.map((f) => (
                <div key={f} className="flex items-center justify-between p-3.5 rounded-xl bg-[#080D16] border border-[#293748]">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-[#111B2A] border border-[#293748] flex items-center justify-center font-bold text-[#D99A4E]">
                      {f.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-bold text-[#DCE8F5] text-sm block font-sans">{f}</span>
                      <span className="text-[10px] text-[#8795A7]">Accepted Alliance</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {onInviteToRoom && (
                      <button
                        onClick={() => onInviteToRoom(f)}
                        className="px-3 py-1.5 rounded-lg bg-[#D99A4E]/15 hover:bg-[#D99A4E]/25 text-[#D99A4E] border border-[#D99A4E]/30 text-xs flex items-center space-x-1 cursor-pointer font-sans"
                      >
                        <Radio className="w-3.5 h-3.5" />
                        <span>Invite to Chamber</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleRemoveFriend(f)}
                      className="p-1.5 rounded-lg bg-[#111B2A] hover:bg-[#F16D78]/20 text-[#8795A7] hover:text-[#F16D78] border border-[#293748] cursor-pointer"
                      title="Sever Alliance"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Incoming Requests Tab */}
        {subTab === 'incoming' && (
          <div className="space-y-3 font-mono text-xs">
            {incoming.length === 0 ? (
              <div className="py-16 text-center text-[#8795A7]">
                <UserPlus className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="font-sans text-xs">No pending incoming alliance requests.</p>
              </div>
            ) : (
              incoming.map((req) => (
                <div key={req.id} className="flex items-center justify-between p-3.5 rounded-xl bg-[#080D16] border border-[#293748]">
                  <div>
                    <span className="font-bold text-[#DCE8F5] text-sm block font-sans">{req.senderName}</span>
                    <span className="text-[10px] text-[#8795A7]">
                      Dispatched {new Date(req.createdAt * 1000).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 font-sans">
                    <button
                      onClick={() => handleRespondRequest(req.id, 'ACCEPTED')}
                      className="px-3 py-1.5 rounded-lg bg-[#32C997]/15 hover:bg-[#32C997]/25 text-[#32C997] border border-[#32C997]/30 text-xs flex items-center space-x-1 cursor-pointer font-medium"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Accept</span>
                    </button>

                    <button
                      onClick={() => handleRespondRequest(req.id, 'REJECTED')}
                      className="p-1.5 rounded-lg bg-[#111B2A] hover:bg-[#F16D78]/20 text-[#8795A7] hover:text-[#F16D78] border border-[#293748] cursor-pointer"
                      title="Decline"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Outgoing Requests Tab */}
        {subTab === 'outgoing' && (
          <div className="space-y-3 font-mono text-xs">
            {outgoing.length === 0 ? (
              <div className="py-16 text-center text-[#8795A7]">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="font-sans text-xs">No pending outgoing alliance requests.</p>
              </div>
            ) : (
              outgoing.map((req) => (
                <div key={req.id} className="flex items-center justify-between p-3.5 rounded-xl bg-[#080D16] border border-[#293748]">
                  <div>
                    <span className="font-bold text-[#DCE8F5] text-sm block font-sans">To: {req.recipientName}</span>
                    <span className="text-[10px] text-[#8795A7]">
                      Dispatched {new Date(req.createdAt * 1000).toLocaleDateString()}
                    </span>
                  </div>

                  <button
                    onClick={() => handleCancelRequest(req.id)}
                    className="px-3 py-1 rounded-lg bg-[#111B2A] hover:bg-[#F16D78]/20 text-[#8795A7] hover:text-[#F16D78] border border-[#293748] text-xs font-sans cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Blocked Users Tab */}
        {subTab === 'blocked' && (
          <div className="space-y-3 font-mono text-xs">
            {blocked.length === 0 ? (
              <div className="py-16 text-center text-[#8795A7]">
                <Ban className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="font-sans text-xs">No blocked explorers.</p>
              </div>
            ) : (
              blocked.map((bName) => (
                <div key={bName} className="flex items-center justify-between p-3.5 rounded-xl bg-[#080D16] border border-[#293748]">
                  <span className="font-bold text-[#DCE8F5] font-sans">{bName}</span>
                  <button
                    onClick={() => handleUnblock(bName)}
                    className="px-3 py-1 rounded-lg bg-[#111B2A] hover:bg-[#172231] text-[#DCE8F5] border border-[#293748] text-xs font-sans cursor-pointer"
                  >
                    Unblock
                  </button>
                </div>
              ))
            )}
          </div>
        )}

      </div>

    </div>
  );
};
