import React, { useState, useEffect, useRef } from 'react';
import { User } from '../../types';
import { api } from '../../services/api';
import confetti from 'canvas-confetti';
import {
  Users,
  Copy,
  Check,
  RotateCcw,
  MessageSquare,
  Send,
  LogOut,
  Sparkles,
  Bot,
  UserCheck
} from 'lucide-react';

interface MultiplayerViewProps {
  user: User;
  onMatchFinished?: () => void;
  onSubStateChange?: (subState: 'create-join' | 'in-room') => void;
}

export const MultiplayerView: React.FC<MultiplayerViewProps> = ({ user, onMatchFinished, onSubStateChange }) => {
  const [inRoom, setInRoom] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [myMark, setMyMark] = useState<'X' | 'O' | null>(null);
  const [players, setPlayers] = useState<Array<{ username: string; mark: 'X' | 'O' }>>([]);
  const [board, setBoard] = useState('.........');
  const [currentTurn, setCurrentTurn] = useState<'X' | 'O'>('X');
  const [status, setStatus] = useState<'WAITING' | 'ACTIVE' | 'COMPLETED'>('WAITING');
  const [outcome, setOutcome] = useState<string | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  const [copied, setCopied] = useState(false);
  const [rematchRequestedBy, setRematchRequestedBy] = useState<string | null>(null);

  // In-chamber chat
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string; time: number }>>([]);
  const [chatInput, setChatInput] = useState('');

  // Friends for quick invite
  const [friendsList, setFriendsList] = useState<string[]>([]);
  const [inviteSent, setInviteSent] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const simWsRef = useRef<WebSocket | null>(null);

  // Notify parent of sub-state for landscape background
  useEffect(() => {
    if (inRoom) {
      onSubStateChange?.('in-room');
    } else {
      onSubStateChange?.('create-join');
    }
  }, [inRoom, onSubStateChange]);

  useEffect(() => {
    api.getSocialOverview().then((res) => {
      if (res && res.friends) setFriendsList(res.friends);
    }).catch(console.error);

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (simWsRef.current) simWsRef.current.close();
    };
  }, []);

  const connectToRoom = (code: string) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        action: 'JOIN_ROOM',
        roomCode: code,
        username: user.username,
      }));
    };

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        const { event, payload } = data;

        if (event === 'ROOM_STATE') {
          setPlayers(payload.players || []);
          const me = payload.players?.find((p: any) => p.username === user.username);
          if (me) setMyMark(me.mark);
          setBoard(payload.board || '.........');
          setCurrentTurn(payload.currentTurn || 'X');
          setStatus(payload.status || 'WAITING');
        }

        else if (event === 'GAME_START') {
          setStatus('ACTIVE');
          setBoard(payload.board);
          setCurrentTurn(payload.currentTurn);
          const pList = [
            { username: payload.playerX, mark: 'X' as const },
            { username: payload.playerO, mark: 'O' as const },
          ];
          setPlayers(pList);
          const me = pList.find(p => p.username === user.username);
          if (me) setMyMark(me.mark);
        }

        else if (event === 'MOVE_MADE') {
          setBoard(payload.board);
          setCurrentTurn(payload.nextTurn);
        }

        else if (event === 'GAME_OVER') {
          setBoard(payload.board);
          setStatus('COMPLETED');
          setOutcome(payload.outcome);
          setWinner(payload.winner);
          setWinningLine(payload.winningLine);

          if (payload.winner === user.username) {
            confetti({
              particleCount: 90,
              spread: 75,
              origin: { y: 0.6 },
              colors: ['#D99A4E', '#DCE8F5', '#91B7CE'],
            });
          }
          if (onMatchFinished) onMatchFinished();
        }

        else if (event === 'REMATCH_REQUESTED') {
          setRematchRequestedBy(payload.player);
        }

        else if (event === 'REMATCH_STARTED') {
          setStatus('ACTIVE');
          setBoard(payload.board);
          setCurrentTurn(payload.currentTurn);
          setOutcome(null);
          setWinner(null);
          setWinningLine(null);
          setRematchRequestedBy(null);
          const pList = [
            { username: payload.playerX, mark: 'X' as const },
            { username: payload.playerO, mark: 'O' as const },
          ];
          setPlayers(pList);
          const me = pList.find(p => p.username === user.username);
          if (me) setMyMark(me.mark);
        }

        else if (event === 'CHAT_MESSAGE') {
          setChatMessages((prev) => [...prev, payload]);
        }

        else if (event === 'PLAYER_LEFT') {
          setChatMessages((prev) => [
            ...prev,
            { sender: 'System', text: `${payload.username} left the chamber.`, time: Date.now() },
          ]);
        }
      } catch (err) {
        console.error('WS Parse Error:', err);
      }
    };

    wsRef.current = ws;
    setRoomCode(code);
    setInRoom(true);
  };

  const handleCreateRoom = () => {
    const code = 'MOON-' + Math.floor(10 + Math.random() * 90);
    connectToRoom(code);
  };

  const handleJoinRoom = () => {
    if (!inputCode.trim()) return;
    connectToRoom(inputCode.trim().toUpperCase());
  };

  const handleMakeMove = (position: number) => {
    if (status !== 'ACTIVE' || !myMark || currentTurn !== myMark) return;
    if (board[position] !== '.') return;

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: 'MAKE_MOVE',
        roomCode,
        username: user.username,
        position,
      }));
    }
  };

  const handleRequestRematch = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: 'REQUEST_REMATCH',
        roomCode,
        username: user.username,
      }));
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !wsRef.current) return;
    wsRef.current.send(JSON.stringify({
      action: 'CHAT',
      roomCode,
      username: user.username,
      text: chatInput.trim(),
    }));
    setChatInput('');
  };

  const handleLeaveRoom = () => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({
        action: 'LEAVE_ROOM',
        roomCode,
        username: user.username,
      }));
      wsRef.current.close();
    }
    if (simWsRef.current) simWsRef.current.close();
    setInRoom(false);
    setRoomCode('');
    setPlayers([]);
    setChatMessages([]);
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const simulateSecondPlayer = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const simWs = new WebSocket(wsUrl);

    simWs.onopen = () => {
      simWs.send(JSON.stringify({
        action: 'JOIN_ROOM',
        roomCode,
        username: 'ShadowTactician',
      }));
    };

    simWsRef.current = simWs;
  };

  const handleInviteFriend = async (friendName: string) => {
    try {
      await api.sendInvitation(friendName, roomCode);
      setInviteSent(friendName);
      setTimeout(() => setInviteSent(null), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8">
      {!inRoom ? (
        /* Room Chambers: Create or Join Directly */
        <div className="max-w-2xl mx-auto space-y-6">
          
          {/* Header */}
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-serif font-bold text-[#DCE8F5]">
              Online Multiplayer Chambers
            </h2>
            <p className="text-xs text-[#91A3B5] max-w-md mx-auto leading-relaxed">
              Synchronized over persistent WebSockets beneath the moonlit wilderness.
            </p>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#111B2A]/80 border border-[#293748] text-[#32C997] text-xs font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[#32C997] animate-pulse" />
              <span>WebSocket Online &bull; Turn-Authoritative Engine</span>
            </div>
          </div>

          {/* Chamber Creation & Join Interface */}
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Create Chamber Card */}
            <div className="surface-card rounded-2xl p-6 backdrop-blur-xl shadow-xl space-y-4">
              <div className="flex items-center space-x-2.5">
                <Sparkles className="w-4 h-4 text-[#D99A4E]" />
                <h3 className="font-mono text-sm font-bold text-[#DCE8F5] uppercase tracking-wider">
                  Create Private Chamber
                </h3>
              </div>
              <p className="text-xs text-[#91A3B5] leading-relaxed">
                Generates an authoritative private room code (e.g. MOON-74). Two participants enter beneath the branches of the ancient tree.
              </p>
              <button
                onClick={handleCreateRoom}
                className="btn-amber-primary w-full py-3 rounded-lg text-xs font-mono font-bold tracking-wider cursor-pointer"
              >
                Initialize Chamber
              </button>
            </div>

            {/* Join Chamber Card */}
            <div className="surface-card rounded-2xl p-6 backdrop-blur-xl shadow-xl space-y-4">
              <div className="flex items-center space-x-2.5">
                <Users className="w-4 h-4 text-[#91B7CE]" />
                <h3 className="font-mono text-sm font-bold text-[#DCE8F5] uppercase tracking-wider">
                  Join via Room Code
                </h3>
              </div>
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="e.g. MOON-74"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-[#080D16] border border-[#293748] text-[#DCE8F5] font-mono text-sm uppercase tracking-widest focus:outline-none focus:border-[#D99A4E]"
                />
                <button
                  onClick={handleJoinRoom}
                  className="px-6 py-2.5 rounded-lg bg-[#172231] hover:bg-[#203445] border border-[#293748] text-[#D99A4E] font-mono text-xs font-bold transition-all cursor-pointer"
                >
                  Join
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* In-Room Active Match View */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Game Board & Match Status (7 cols) */}
          <div className="lg:col-span-7 flex flex-col items-center">
            
            {/* Room Header Bar */}
            <div className="w-full flex items-center justify-between p-3.5 rounded-xl bg-[#111B2A] border border-[#293748] mb-6 font-mono text-xs">
              <div className="flex items-center space-x-2">
                <span className="text-[#8795A7]">Chamber:</span>
                <span className="text-base font-bold text-[#D99A4E]">{roomCode}</span>
                <button
                  onClick={copyRoomCode}
                  className="p-1 rounded bg-[#172231] hover:bg-[#203445] text-[#DCE8F5] cursor-pointer"
                  title="Copy room code"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#32C997]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <button
                onClick={handleLeaveRoom}
                className="px-3 py-1 rounded bg-[#172231] hover:bg-[#F16D78]/20 text-[#F16D78] border border-[#F16D78]/30 text-xs transition-colors cursor-pointer"
              >
                Leave Chamber
              </button>
            </div>

            {/* Waiting for Opponent Banner */}
            {status === 'WAITING' && (
              <div className="w-full p-6 rounded-2xl bg-[#111B2A]/90 border border-[#293748] text-center mb-6 space-y-4">
                <span className="inline-block w-8 h-8 rounded-full border-2 border-[#D99A4E] border-t-transparent animate-spin mb-1" />
                <h4 className="text-base font-serif font-bold text-[#DCE8F5]">
                  Awaiting Second Explorer...
                </h4>
                <p className="text-xs text-[#91A3B5] max-w-sm mx-auto leading-relaxed">
                  Share room code <strong className="text-[#D99A4E] font-mono">{roomCode}</strong> with a friend or open a second browser window.
                </p>

                {/* Simulated Second Player for Quick Evaluation */}
                <div className="pt-2">
                  <button
                    onClick={simulateSecondPlayer}
                    className="px-4 py-2 rounded-lg bg-[#172231] hover:bg-[#203445] border border-[#293748] text-[#D99A4E] text-xs font-mono transition-all flex items-center justify-center space-x-2 mx-auto cursor-pointer"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>Instant Evaluator: Connect Simulated Explorer (ShadowTactician)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Turn & Status Indicator */}
            {status !== 'WAITING' && (
              <div className="mb-4 text-center">
                {status === 'ACTIVE' ? (
                  <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-[#111B2A] border border-[#293748] text-xs font-mono text-[#DCE8F5]">
                    {currentTurn === myMark ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-[#32C997] animate-ping" />
                        <span>Your Turn ({myMark})</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-[#D99A4E] animate-pulse" />
                        <span>Opponent's Turn ({currentTurn})</span>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-[#111B2A] border border-[#D99A4E]/40 text-sm font-semibold">
                    {outcome === 'DRAW' ? (
                      <span className="text-[#91B7CE]">Draw! An equal match under the moonlight.</span>
                    ) : winner === user.username ? (
                      <span className="text-[#32C997]">Victory! You won the online match!</span>
                    ) : (
                      <span className="text-[#D99A4E]">{winner} won the match. Every move leaves a mark.</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* The 3x3 Board */}
            <div className="relative p-5 rounded-2xl bg-[#080D16] border border-[#293748] shadow-2xl">
              <div className="grid grid-cols-3 gap-3 w-72 h-72 sm:w-88 sm:h-88">
                {board.split('').map((cell, idx) => {
                  const isWinningCell = winningLine?.includes(idx);
                  const isClickable = cell === '.' && status === 'ACTIVE' && currentTurn === myMark;

                  return (
                    <button
                      key={idx}
                      disabled={!isClickable}
                      onClick={() => handleMakeMove(idx)}
                      className={`relative rounded-xl border flex items-center justify-center transition-all duration-200 select-none ${
                        isWinningCell
                          ? 'bg-[#D99A4E]/15 border-[#D99A4E] shadow-lg shadow-[#D99A4E]/25 scale-[1.02]'
                          : cell === '.'
                          ? 'bg-[#111B2A]/70 border-[#293748] hover:bg-[#172231] hover:border-[#91B7CE]/40'
                          : 'bg-[#111B2A] border-[#293748]'
                      } ${isClickable ? 'cursor-pointer hover:scale-[0.98]' : 'cursor-default'}`}
                    >
                      {cell === 'X' && (
                        <span className="text-4xl sm:text-5xl font-mono font-bold text-[#DCE8F5] drop-shadow-[0_0_12px_rgba(220,232,245,0.4)] animate-in zoom-in-75">
                          ✕
                        </span>
                      )}
                      {cell === 'O' && (
                        <span className="text-4xl sm:text-5xl font-mono font-bold text-[#D99A4E] drop-shadow-[0_0_12px_rgba(217,154,78,0.45)] animate-in zoom-in-75">
                          ◯
                        </span>
                      )}
                      <span className="absolute bottom-1 right-1.5 text-[9px] font-mono text-[#8795A7]/30">
                        {idx}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rematch Controls */}
            {status === 'COMPLETED' && (
              <div className="mt-6 flex flex-col items-center space-y-2">
                <button
                  onClick={handleRequestRematch}
                  className="btn-amber-primary px-6 py-2.5 rounded-lg text-xs font-mono tracking-wider transition-all flex items-center space-x-2 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>
                    {rematchRequestedBy === user.username
                      ? 'Waiting for Opponent...'
                      : rematchRequestedBy
                      ? 'Accept Rematch!'
                      : 'Request Rematch'}
                  </span>
                </button>
                {rematchRequestedBy && rematchRequestedBy !== user.username && (
                  <span className="text-[11px] font-mono text-[#D99A4E]">
                    Opponent requested a rematch! Click above to accept.
                  </span>
                )}
              </div>
            )}

          </div>

          {/* Right Column: In-chamber Chat & Direct Invites (5 cols) */}
          <div className="lg:col-span-5 space-y-4 w-full">
            
            {/* Quick Friend Invite Card */}
            {friendsList.length > 0 && status === 'WAITING' && (
              <div className="p-4 rounded-xl bg-[#111B2A] border border-[#293748] font-mono text-xs">
                <span className="text-[#8795A7] text-[10px] uppercase font-bold block mb-2">
                  Invite Accepted Friends to Room:
                </span>
                <div className="space-y-1.5">
                  {friendsList.map(f => (
                    <div key={f} className="flex items-center justify-between p-2 rounded-lg bg-[#080D16] border border-[#293748]">
                      <span className="text-[#DCE8F5]">{f}</span>
                      <button
                        onClick={() => handleInviteFriend(f)}
                        className="px-2.5 py-1 rounded bg-[#D99A4E]/15 hover:bg-[#D99A4E]/25 text-[#D99A4E] border border-[#D99A4E]/30 text-[10px] cursor-pointer"
                      >
                        {inviteSent === f ? 'Invite Sent!' : 'Invite'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* In-Chamber Chat Panel */}
            <div className="rounded-2xl bg-[#111B2A] border border-[#293748] flex flex-col h-84 shadow-xl overflow-hidden">
              <div className="p-3.5 border-b border-[#293748] flex items-center space-x-2 text-xs font-mono text-[#DCE8F5]">
                <MessageSquare className="w-3.5 h-3.5 text-[#D99A4E]" />
                <span>Chamber Dispatches</span>
              </div>

              {/* Message Feed */}
              <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs font-mono">
                {chatMessages.length === 0 ? (
                  <div className="py-12 text-center text-[#8795A7] text-[11px]">
                    Whisper across the ridges... Send a message below.
                  </div>
                ) : (
                  chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`p-2.5 rounded-lg text-[11px] ${
                        msg.sender === user.username
                          ? 'bg-[#172231] text-[#DCE8F5] ml-4 border border-[#293748]'
                          : msg.sender === 'System'
                          ? 'bg-transparent text-[#8795A7] italic text-center text-[10px]'
                          : 'bg-[#080D16] text-[#91B7CE] mr-4 border border-[#293748]'
                      }`}
                    >
                      <div className="flex justify-between text-[9px] text-[#8795A7] mb-1">
                        <span className="font-semibold">{msg.sender}</span>
                        <span>{new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="leading-relaxed">{msg.text}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendChat} className="p-2.5 border-t border-[#293748] flex space-x-2 bg-[#080D16]/50">
                <input
                  type="text"
                  placeholder="Whisper message..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-[#080D16] border border-[#293748] text-[#DCE8F5] text-xs font-mono focus:outline-none focus:border-[#D99A4E]"
                />
                <button
                  type="submit"
                  className="p-2 rounded-lg bg-[#D99A4E] text-[#080D16] hover:bg-[#E2A65C] transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

          </div>

        </div>
      )}
    </div>
  );
};
