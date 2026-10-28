import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { User } from '../../types';
import confetti from 'canvas-confetti';
import {
  Compass,
  Shield,
  Skull,
  RotateCcw,
  Sparkles,
  Cpu,
  CheckCircle,
  HelpCircle,
  Layers,
  ChevronDown,
  ChevronUp,
  ArrowRight
} from 'lucide-react';

interface BotGameViewProps {
  user: User;
  onMatchFinished?: () => void;
  onGoToOopLab?: () => void;
}

export const BotGameView: React.FC<BotGameViewProps> = ({ user, onMatchFinished, onGoToOopLab }) => {
  const [difficulty, setDifficulty] = useState<'wanderer' | 'sentinel' | 'unbroken'>('unbroken');
  const [humanMark, setHumanMark] = useState<'X' | 'O'>('X');
  const [gameId, setGameId] = useState<string>('');
  const [board, setBoard] = useState<string>('.........');
  const [currentTurn, setCurrentTurn] = useState<'X' | 'O'>('X');
  const [status, setStatus] = useState<'ACTIVE' | 'COMPLETED' | 'WAITING'>('ACTIVE');
  const [outcome, setOutcome] = useState<string>('IN_PROGRESS');
  const [winner, setWinner] = useState<string | null>(null);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  const [lastMovePos, setLastMovePos] = useState<number | null>(null);
  const [lastBotExplanation, setLastBotExplanation] = useState<any>(null);
  const [showInspector, setShowInspector] = useState(true);
  const [loading, setLoading] = useState(false);

  // Initialize new game
  const startNewGame = async (diff = difficulty, mark = humanMark) => {
    setLoading(true);
    try {
      const res = await api.createBotGame({
        humanName: user.username,
        difficulty: diff,
        humanMark: mark,
      });
      if (res.game) {
        setGameId(res.game.id);
        setBoard(res.game.boardState);
        setCurrentTurn(res.game.currentTurn);
        setStatus('ACTIVE');
        setOutcome('IN_PROGRESS');
        setWinner(null);
        setWinningLine(null);
        setLastMovePos(res.botFirstMove ? res.botFirstMove.move : null);
        setLastBotExplanation(res.botFirstMove?.explanation || null);
      }
    } catch (err: any) {
      console.error('Failed to start game:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    startNewGame(difficulty, humanMark);
  }, []);

  const handleCellClick = async (position: number) => {
    if (status !== 'ACTIVE' || loading) return;
    if (board[position] !== '.') return;
    if (currentTurn !== humanMark) return;

    setLoading(true);
    setLastMovePos(position);

    try {
      const res = await api.playBotMove({
        gameId,
        board,
        position,
        humanMark,
        difficulty,
      });

      if (res.board) {
        setBoard(res.board);
      }

      if (res.botMove !== undefined) {
        setLastMovePos(res.botMove);
      }

      if (res.botExplanation) {
        setLastBotExplanation(res.botExplanation);
      }

      if (res.status === 'COMPLETED') {
        setStatus('COMPLETED');
        setOutcome(res.outcome);
        setWinner(res.winner);
        setWinningLine(res.winningLine || null);

        if (res.winner === user.username) {
          confetti({
            particleCount: 90,
            spread: 75,
            origin: { y: 0.6 },
            colors: ['#D99A4E', '#DCE8F5', '#91B7CE'],
          });
        }
        if (onMatchFinished) onMatchFinished();
      } else {
        setCurrentTurn(res.nextTurn || humanMark);
      }
    } catch (err: any) {
      console.error('Move error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getBotDisplayName = () => {
    if (difficulty === 'wanderer') return 'Wanderer';
    if (difficulty === 'sentinel') return 'Sentinel';
    return 'The Unbroken';
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8">
      
      {/* Opponent Selection & Side Choice Header Bar */}
      <div className="surface-card rounded-2xl p-4 sm:p-5 mb-8 backdrop-blur-md">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          
          {/* Opponents List */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full lg:w-auto">
            <span className="text-[11px] font-mono text-[#8795A7] uppercase tracking-wider">
              Opponent:
            </span>
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#080D16] border border-[#293748] w-full sm:w-auto">
              {[
                { id: 'wanderer', label: 'Wanderer', icon: Compass, sub: 'Random' },
                { id: 'sentinel', label: 'Sentinel', icon: Shield, sub: 'Heuristic' },
                { id: 'unbroken', label: 'The Unbroken', icon: Skull, sub: 'Minimax' },
              ].map((t) => {
                const Icon = t.icon;
                const isSelected = difficulty === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setDifficulty(t.id as any);
                      startNewGame(t.id as any, humanMark);
                    }}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-sans transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#172231] text-[#D99A4E] border border-[#D99A4E]/40 shadow-sm'
                        : 'text-[#8795A7] hover:text-[#DCE8F5] hover:bg-[#111B2A]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-medium">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mark Selection & Reset */}
          <div className="flex items-center space-x-3 w-full lg:w-auto justify-between lg:justify-end">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-mono text-[#8795A7] uppercase tracking-wider">
                Mark:
              </span>
              <div className="flex rounded-lg bg-[#080D16] p-1 border border-[#293748]">
                <button
                  onClick={() => {
                    setHumanMark('X');
                    startNewGame(difficulty, 'X');
                  }}
                  className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                    humanMark === 'X'
                      ? 'bg-[#172231] text-[#DCE8F5] border border-[#293748]'
                      : 'text-[#8795A7] hover:text-[#DCE8F5]'
                  }`}
                >
                  ✕ First
                </button>
                <button
                  onClick={() => {
                    setHumanMark('O');
                    startNewGame(difficulty, 'O');
                  }}
                  className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                    humanMark === 'O'
                      ? 'bg-[#172231] text-[#D99A4E] border border-[#D99A4E]/40'
                      : 'text-[#8795A7] hover:text-[#D99A4E]'
                  }`}
                >
                  ◯ Second
                </button>
              </div>
            </div>

            <button
              onClick={() => startNewGame(difficulty, humanMark)}
              className="p-2 rounded-lg bg-[#111B2A] text-[#8795A7] hover:text-[#DCE8F5] border border-[#293748] hover:bg-[#172231] transition-all cursor-pointer"
              title="Reset Board"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>

      {/* Main Game Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Board & Active Status (7 cols) */}
        <div className="lg:col-span-7 flex flex-col items-center">
          
          {/* Match Participants Pill */}
          <div className="w-full max-w-sm flex items-center justify-between mb-4 px-4 py-2.5 rounded-xl bg-[#111B2A] border border-[#293748] text-xs font-mono">
            <div className="flex items-center space-x-2">
              <span className={`w-2.5 h-2.5 rounded-full ${humanMark === 'X' ? 'bg-[#DCE8F5]' : 'bg-[#D99A4E]'}`} />
              <span className="text-[#DCE8F5] font-semibold">{user.displayName} ({humanMark})</span>
            </div>

            <span className="text-[#8795A7] font-serif">vs</span>

            <div className="flex items-center space-x-2">
              <span className={`w-2.5 h-2.5 rounded-full ${humanMark === 'X' ? 'bg-[#D99A4E]' : 'bg-[#DCE8F5]'}`} />
              <span className="text-[#DCE8F5] font-semibold">{getBotDisplayName()} ({humanMark === 'X' ? 'O' : 'X'})</span>
            </div>
          </div>

          {/* Turn / State Announcement */}
          <div className="mb-5 text-center min-h-[32px] flex items-center justify-center">
            {status === 'ACTIVE' ? (
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#111B2A] border border-[#293748] text-xs font-mono text-[#DCE8F5]">
                {currentTurn === humanMark ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-[#32C997] animate-ping" />
                    <span>Your turn &bull; Place your mark ({humanMark})</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-[#D99A4E] animate-pulse" />
                    <span>{getBotDisplayName()} is calculating minimax branch...</span>
                  </>
                )}
              </div>
            ) : (
              <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-[#111B2A] border border-[#D99A4E]/50 text-xs sm:text-sm font-sans font-medium">
                {outcome === 'DRAW' ? (
                  <span className="text-[#91B7CE]">Draw. An equal match under the moonlight.</span>
                ) : winner === user.username ? (
                  <span className="text-[#32C997] font-bold">Victory! You defeated {getBotDisplayName()}!</span>
                ) : (
                  <span className="text-[#D99A4E] font-bold">{winner} claimed victory. Every move leaves a mark.</span>
                )}
              </div>
            )}
          </div>

          {/* The Distinctive 3x3 Atmospheric Board */}
          <div className="relative p-5 rounded-2xl bg-[#080D16] border border-[#293748] shadow-2xl shadow-black/80">
            <div className="grid grid-cols-3 gap-3 w-72 h-72 sm:w-88 sm:h-88">
              {board.split('').map((cell, idx) => {
                const isWinningCell = winningLine?.includes(idx);
                const isLastMove = lastMovePos === idx;
                const isClickable = cell === '.' && status === 'ACTIVE' && currentTurn === humanMark && !loading;

                return (
                  <button
                    key={idx}
                    disabled={!isClickable}
                    onClick={() => handleCellClick(idx)}
                    className={`relative rounded-xl border flex items-center justify-center transition-all duration-200 select-none ${
                      isWinningCell
                        ? 'bg-[#D99A4E]/15 border-[#D99A4E] shadow-lg shadow-[#D99A4E]/25 scale-[1.02]'
                        : isLastMove
                        ? 'bg-[#172231] border-[#91B7CE]/40 ring-1 ring-[#91B7CE]/30'
                        : cell === '.'
                        ? 'bg-[#111B2A]/70 border-[#293748] hover:bg-[#172231] hover:border-[#91B7CE]/40'
                        : 'bg-[#111B2A] border-[#293748]'
                    } ${isClickable ? 'cursor-pointer hover:scale-[0.98]' : 'cursor-default'}`}
                  >
                    {/* Mark Rendering */}
                    {cell === 'X' && (
                      <span className="text-4xl sm:text-5xl font-mono font-bold text-[#DCE8F5] drop-shadow-[0_0_12px_rgba(220,232,245,0.4)] animate-in zoom-in-75 duration-150">
                        ✕
                      </span>
                    )}
                    {cell === 'O' && (
                      <span className="text-4xl sm:text-5xl font-mono font-bold text-[#D99A4E] drop-shadow-[0_0_12px_rgba(217,154,78,0.45)] animate-in zoom-in-75 duration-150">
                        ◯
                      </span>
                    )}

                    {/* Cell Index Label */}
                    <span className="absolute bottom-1 right-1.5 text-[9px] font-mono text-[#8795A7]/30">
                      {idx}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Post-Match Actions */}
          {status === 'COMPLETED' && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => startNewGame(difficulty, humanMark)}
                className="btn-amber-primary px-5 py-2.5 rounded-lg text-xs font-sans tracking-wide flex items-center space-x-2 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Play Rematch</span>
              </button>

              {onGoToOopLab && (
                <button
                  onClick={onGoToOopLab}
                  className="px-4 py-2.5 rounded-lg bg-[#111B2A] hover:bg-[#172231] border border-[#293748] text-[#91B7CE] hover:text-[#DCE8F5] text-xs font-mono transition-all flex items-center space-x-2 cursor-pointer"
                >
                  <Cpu className="w-3.5 h-3.5 text-[#D99A4E]" />
                  <span>Inspect Decision in OOP Lab</span>
                </button>
              )}
            </div>
          )}

        </div>

        {/* Right Column: AI Decision Inspector (5 cols) */}
        <div className="lg:col-span-5 w-full">
          <div className="surface-card rounded-2xl overflow-hidden backdrop-blur-md">
            
            <div 
              onClick={() => setShowInspector(!showInspector)}
              className="flex items-center justify-between p-4 bg-[#111B2A] border-b border-[#293748] cursor-pointer select-none"
            >
              <div className="flex items-center space-x-2.5">
                <Cpu className="w-4 h-4 text-[#D99A4E]" />
                <h3 className="text-xs font-mono uppercase tracking-wider font-semibold text-[#DCE8F5]">
                  AI Decision Inspector
                </h3>
              </div>
              {showInspector ? <ChevronUp className="w-4 h-4 text-[#8795A7]" /> : <ChevronDown className="w-4 h-4 text-[#8795A7]" />}
            </div>

            {showInspector && (
              <div className="p-5 space-y-4 text-xs font-mono">
                {lastBotExplanation ? (
                  <>
                    <div>
                      <span className="text-[#8795A7] text-[10px] uppercase block mb-0.5">Algorithm:</span>
                      <p className="text-[#D99A4E] font-semibold">{lastBotExplanation.algorithm}</p>
                    </div>

                    <div>
                      <span className="text-[#8795A7] text-[10px] uppercase block mb-0.5">Theoretical Principle:</span>
                      <p className="text-[#91B7CE]">{lastBotExplanation.principle}</p>
                    </div>

                    <div>
                      <span className="text-[#8795A7] text-[10px] uppercase block mb-1">Decision Rationale:</span>
                      <p className="text-[#DCE8F5] bg-[#080D16] p-3 rounded-lg border border-[#293748] leading-relaxed text-[11px]">
                        {lastBotExplanation.rationale}
                      </p>
                    </div>

                    {lastBotExplanation.nodesEvaluated !== undefined && (
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#293748]">
                        <div className="p-2.5 rounded-lg bg-[#080D16] border border-[#293748]">
                          <span className="text-[10px] text-[#8795A7] block">Minimax Nodes:</span>
                          <span className="text-base font-bold text-[#DCE8F5]">{lastBotExplanation.nodesEvaluated}</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-[#080D16] border border-[#293748]">
                          <span className="text-[10px] text-[#8795A7] block">Alpha-Beta Cuts:</span>
                          <span className="text-base font-bold text-[#D99A4E]">{lastBotExplanation.pruningCutoffs}</span>
                        </div>
                      </div>
                    )}

                    {lastBotExplanation.evaluations && (
                      <div>
                        <span className="text-[#8795A7] text-[10px] uppercase block mb-1.5">Branch Scores:</span>
                        <div className="grid grid-cols-3 gap-1.5">
                          {Object.entries(lastBotExplanation.evaluations).map(([pos, score]) => (
                            <div key={pos} className="p-1.5 rounded-md bg-[#080D16] border border-[#293748] text-center">
                              <span className="text-[10px] text-[#8795A7]">Cell {pos}:</span>
                              <span className={`ml-1 font-bold ${Number(score) > 0 ? 'text-[#32C997]' : Number(score) < 0 ? 'text-[#F16D78]' : 'text-[#91B7CE]'}`}>
                                {String(score)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-8 text-center text-[#8795A7] font-sans text-xs">
                    <Sparkles className="w-5 h-5 mx-auto mb-2 text-[#D99A4E] opacity-50" />
                    Place a mark on the board to view the Python engine's decision tree.
                  </div>
                )}

                <div className="pt-3 border-t border-[#293748] flex items-center justify-between text-[10px] text-[#8795A7]">
                  <span>Runtime: Python 3.10 Engine</span>
                  <span className="text-[#D99A4E]">Unbeatable Guarantee</span>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

    </div>
  );
};
