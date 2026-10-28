export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatar: string;
  bio: string;
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  rating: number;
  createdAt: number;
}

export interface PlayerPublicProfile {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  rating: number;
  isOnline: boolean;
}

export interface MoveRecord {
  moveNumber: number;
  playerName: string;
  playerMark: 'X' | 'O';
  position: number;
  timestamp: number;
}

export interface MatchRecord {
  id: string;
  mode: 'BOT' | 'ONLINE';
  botDifficulty?: 'wanderer' | 'sentinel' | 'unbroken';
  playerXName: string;
  playerOName: string;
  boardState: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  outcome: 'WIN_X' | 'WIN_O' | 'DRAW' | 'IN_PROGRESS';
  winnerName?: string | null;
  winningLine?: number[] | null;
  roomCode?: string;
  createdAt: number;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: number;
}

export interface FriendRequestItem {
  id: string;
  senderName?: string;
  recipientName?: string;
  createdAt: number;
}

export interface PolymorphismResultItem {
  className: string;
  parentClass: string;
  difficulty: string;
  polymorphicInterfaceCalled: string;
  chosenMove: number;
  executionTimeMs: number;
  explanation: {
    algorithm: string;
    principle: string;
    candidateMoves: number[];
    chosenMove: number;
    rationale: string;
    complexity: string;
    minimaxScore?: number;
    nodesEvaluated?: number;
    pruningCutoffs?: number;
    evaluations?: Record<string, number>;
  };
  boardAfterMove: string;
}
