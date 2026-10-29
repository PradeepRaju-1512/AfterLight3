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
  chosenMove: number;
  executionTimeMs: number;
  explanation: {
    algorithm: string;
    principle: string;
    chosenMove: number;
    rationale: string;
    nodesEvaluated?: number;
    cutoffs?: number;
  };
  boardAfterMove: string;
}

export interface OperatorOverloadResult {
  engine: string;
  concept: string;
  initialBoard: string;
  operators: {
    subscript: {
      signature: string;
      readIndex: number;
      readValue: string;
      boundsCheckEnforced: boolean;
      explanation: string;
    };
    equality: {
      signatures: string[];
      b1_equals_b2: boolean;
      b1_not_equals_empty: boolean;
      explanation: string;
    };
    addition: {
      signature: string;
      moveApplied: string;
      success: boolean;
      resultBoard: string;
      originalBoardUnchanged: string;
      explanation: string;
    };
    compoundAddition: {
      signature: string;
      success: boolean;
      resultBoard: string;
      explanation: string;
    };
    streamInsertion: {
      signature: string;
      formattedStream: string;
      explanation: string;
    };
  };
}

export interface TemplatesResult {
  engine: string;
  concept: string;
  templates: {
    classTemplateGrid: {
      declaration: string;
      instanceTypeCell: string;
      cellCountX: number;
      cellCountO: number;
      instanceTypeInt: string;
      centerWeight: number;
      explanation: string;
    };
    classTemplateHistory: {
      declaration: string;
      instanceType: string;
      recordedMoves: number;
      lastMovePosition: number;
      explanation: string;
    };
    functionTemplateScoring: {
      declaration: string;
      intResult: number;
      doubleResult: number;
      explanation: string;
    };
    templateSpecialization: {
      declaration: string;
      specializedMethod: string;
      joinedSample: string;
      explanation: string;
    };
  };
}

export interface ClassRegistryItem {
  name: string;
  module: string;
  baseClasses: string[];
  isAbstract: boolean;
  isTemplate?: boolean;
  methods: string[];
}
