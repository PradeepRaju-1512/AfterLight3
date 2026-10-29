import React, { useState } from 'react';
import { api, setStoredUser } from '../../services/api';
import { User } from '../../types';
import {
  Award,
  Trophy,
  Flame,
  CheckCircle,
  Edit3,
  Save,
  Moon,
  Trees,
  Mountain,
  Eye,
  Sparkles,
  Shield
} from 'lucide-react';

interface ProfileViewProps {
  user: User;
  onUserUpdated: (user: User) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ user, onUserUpdated }) => {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [bio, setBio] = useState(user.bio || '');
  const [avatar, setAvatar] = useState(user.avatar || 'hiker');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateProfile({ displayName, bio, avatar });
      const updatedUser: User = {
        ...user,
        displayName,
        bio,
        avatar,
      };
      setStoredUser(updatedUser);
      onUserUpdated(updatedUser);
      setEditing(false);
      setNotice('Profile updated successfully.');
      setTimeout(() => setNotice(null), 3000);
    } catch (e: any) {
      setNotice('Failed to update: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const avatars = [
    { id: 'hiker', label: 'Hiker on Cliff', icon: Mountain },
    { id: 'tower', label: 'Lookout Tower', icon: Eye },
    { id: 'moon', label: 'Crescent Moon', icon: Moon },
    { id: 'tree', label: 'Pine Ridge', icon: Trees },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-6">
      
      {/* Player Hub Header Card */}
      <div className="surface-card rounded-2xl p-6 sm:p-8 backdrop-blur-md relative overflow-hidden">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-[#293748]">
          
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-[#080D16] border border-[#293748] flex items-center justify-center text-2xl font-bold text-[#D99A4E] shadow-xl font-mono">
              {displayName.charAt(0).toUpperCase()}
            </div>

            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#DCE8F5]">
                  {displayName}
                </h2>
                <span className="text-xs font-mono text-[#D99A4E] px-2.5 py-0.5 rounded-full bg-[#080D16] border border-[#D99A4E]/30 font-bold">
                  ★ {user.rating} Rating
                </span>
              </div>
              <p className="text-xs text-[#8795A7] font-mono mt-1">
                @{user.username} &bull; Active explorer since {new Date(user.createdAt * 1000).toLocaleDateString([], { month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (editing) handleSave();
              else setEditing(true);
            }}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-[#172231] hover:bg-[#203445] border border-[#293748] text-[#DCE8F5] text-xs font-sans transition-all flex items-center space-x-2 cursor-pointer font-medium"
          >
            {editing ? (
              <>
                <Save className="w-3.5 h-3.5 text-[#D99A4E]" />
                <span>Save Profile</span>
              </>
            ) : (
              <>
                <Edit3 className="w-3.5 h-3.5 text-[#91B7CE]" />
                <span>Edit Profile</span>
              </>
            )}
          </button>

        </div>

        {notice && (
          <div className="mt-4 p-2.5 rounded-lg bg-[#111B2A] border border-[#D99A4E]/40 text-[#D99A4E] text-xs font-mono animate-in fade-in">
            {notice}
          </div>
        )}

        {/* Bio / Edit Section */}
        <div className="mt-6">
          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-[#8795A7] uppercase tracking-wider mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full sm:w-80 px-3.5 py-2 rounded-lg bg-[#080D16] border border-[#293748] text-[#DCE8F5] text-xs font-sans focus:outline-none focus:border-[#D99A4E]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#8795A7] uppercase tracking-wider mb-1">
                  Explorer Biography
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Record your philosophy under the moonlight..."
                  className="w-full px-3.5 py-2 rounded-lg bg-[#080D16] border border-[#293748] text-[#DCE8F5] text-xs font-sans focus:outline-none focus:border-[#D99A4E]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#8795A7] uppercase tracking-wider mb-1.5">
                  Select Visual Sigil
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {avatars.map((av) => {
                    const Icon = av.icon;
                    const isSel = avatar === av.id;
                    return (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => setAvatar(av.id)}
                        className={`p-2.5 rounded-xl border flex items-center space-x-2 text-xs font-mono transition-all cursor-pointer ${
                          isSel
                            ? 'bg-[#172231] border-[#D99A4E] text-[#D99A4E]'
                            : 'bg-[#080D16] border-[#293748] text-[#8795A7] hover:text-[#DCE8F5]'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{av.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-[#91A3B5] italic leading-relaxed">
              "{bio || 'Every move leaves a mark under the quiet moonlight.'}"
            </div>
          )}
        </div>

      </div>

      {/* Comprehensive Verified Statistics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
        <div className="surface-card rounded-2xl p-4 text-center">
          <span className="text-[10px] text-[#8795A7] uppercase block mb-1">Total Matches</span>
          <span className="text-2xl font-bold text-[#DCE8F5]">{user.totalGames}</span>
        </div>

        <div className="surface-card rounded-2xl p-4 text-center">
          <span className="text-[10px] text-[#8795A7] uppercase block mb-1">Victories</span>
          <span className="text-2xl font-bold text-[#32C997]">{user.wins}</span>
        </div>

        <div className="surface-card rounded-2xl p-4 text-center">
          <span className="text-[10px] text-[#8795A7] uppercase block mb-1">Defeats</span>
          <span className="text-2xl font-bold text-[#F16D78]">{user.losses}</span>
        </div>

        <div className="surface-card rounded-2xl p-4 text-center">
          <span className="text-[10px] text-[#8795A7] uppercase block mb-1">Win Rate</span>
          <span className="text-2xl font-bold text-[#D99A4E]">{user.winRate}%</span>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-[#111B2A] border border-[#293748] flex items-center justify-between text-xs font-mono text-[#8795A7]">
        <div className="flex items-center space-x-2">
          <Shield className="w-4 h-4 text-[#D99A4E]" />
          <span>Account verified and active</span>
        </div>
        <span className="text-[#32C997]">Ranked Tier</span>
      </div>

    </div>
  );
};
