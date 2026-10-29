import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { User, MatchRecord } from '../../types';
import { History, Trophy, Compass, Radio, Calendar, CheckCircle } from 'lucide-react';

interface MatchHistoryViewProps {
  user: User;
}

export const MatchHistoryView: React.FC<MatchHistoryViewProps> = ({ user }) => {
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.getMatchHistory(user.username);
      if (res && res.games) {
        setMatches(res.games);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 space-y-6">
      
      {/* Header */}
      <div className="surface-card rounded-2xl p-6 backdrop-blur-md">
        <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full bg-[#172231] border border-[#293748] text-[#D99A4E] text-[11px] font-mono font-bold uppercase tracking-wider mb-2">
          <History className="w-3.5 h-3.5" />
          <span>Chronicles of Play</span>
        </div>
        <h2 className="text-2xl font-serif font-bold text-[#DCE8F5]">
          Authoritative Match Chronicles
        </h2>
        <p className="text-xs text-[#91A3B5] mt-1 leading-relaxed">
          Every move leaves a mark. Review verified past encounters, tactical outcomes, and terminal board configurations.
        </p>
      </div>

      {/* Matches List */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="surface-card rounded-xl p-5 animate-pulse h-24" />
            ))}
          </div>
        ) : matches.length === 0 ? (
          <div className="surface-card rounded-2xl p-16 text-center text-[#8795A7] font-mono text-xs">
            <History className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#D99A4E]" />
            <p className="font-sans text-xs text-[#DCE8F5] mb-1">No matches chronicled yet.</p>
            <p className="text-[11px] text-[#8795A7]">Play a match against Wanderer, Sentinel, or The Unbroken to record your mark.</p>
          </div>
        ) : (
          matches.map((m) => {
            const isWinner = m.winnerName === user.username;
            const isDraw = m.outcome === 'DRAW';
            const boardState = m.boardState || '.........';

            return (
              <div
                key={m.id}
                className="surface-card rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:border-[#91B7CE]/40"
              >
                {/* Outcome & Match Meta */}
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 border ${
                    isDraw
                      ? 'bg-[#172231] text-[#91B7CE] border-[#293748]'
                      : isWinner
                      ? 'bg-[#32C997]/15 text-[#32C997] border-[#32C997]/30'
                      : 'bg-[#F16D78]/15 text-[#F16D78] border-[#F16D78]/30'
                  }`}>
                    {isDraw ? 'DRAW' : isWinner ? 'VICTORY' : 'DEFEAT'}
                  </div>

                  <div>
                    <div className="flex items-center space-x-2.5">
                      <span className="font-bold text-sm text-[#DCE8F5] font-sans">
                        {m.playerXName} vs {m.playerOName}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#080D16] text-[#D99A4E] border border-[#293748] uppercase">
                        {m.mode === 'BOT' ? m.botDifficulty || 'Bot' : 'Online Chamber'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 text-[11px] text-[#8795A7] font-mono mt-1">
                      <span>{new Date(m.createdAt * 1000).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      {m.roomCode && <span>Chamber: {m.roomCode}</span>}
                    </div>
                  </div>
                </div>

                {/* Terminal Board Thumbnail */}
                <div className="p-2 rounded-xl bg-[#080D16] border border-[#293748] shrink-0">
                  <div className="grid grid-cols-3 gap-1 w-20 h-20">
                    {boardState.split('').map((c, i) => {
                      const isWinCell = m.winningLine?.includes(i);
                      return (
                        <div
                          key={i}
                          className={`rounded flex items-center justify-center font-mono font-bold text-xs select-none ${
                            isWinCell
                              ? 'bg-[#D99A4E]/25 text-[#D99A4E] border border-[#D99A4E]/40'
                              : c === '.'
                              ? 'bg-[#111B2A]/40 text-transparent'
                              : c === 'X'
                              ? 'bg-[#111B2A] text-[#DCE8F5]'
                              : 'bg-[#111B2A] text-[#D99A4E]'
                          }`}
                        >
                          {c !== '.' ? c : ''}
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
