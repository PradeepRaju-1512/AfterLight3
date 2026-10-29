import {
  User,
  PlayerPublicProfile,
  MatchRecord,
  NotificationItem,
  PolymorphismResultItem,
  OperatorOverloadResult,
  TemplatesResult,
  ClassRegistryItem,
} from '../types';

let currentUserState: User | null = null;

export function getStoredUser(): User | null {
  if (currentUserState) return currentUserState;
  const raw = localStorage.getItem('afterlight_user');
  if (raw) {
    try {
      currentUserState = JSON.parse(raw);
      return currentUserState;
    } catch {
      return null;
    }
  }
  return null;
}

export function setStoredUser(user: User | null) {
  currentUserState = user;
  if (user) {
    localStorage.setItem('afterlight_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('afterlight_user');
  }
}

// Parses a response and throws the server's error message on non-2xx replies, so callers'
// existing try/catch blocks actually fire (previously error JSON was silently treated as success).
async function handle(res: Response) {
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* empty or non-JSON body */
  }
  if (!res.ok) {
    throw new Error((data && data.error) || `Request failed (${res.status})`);
  }
  return data;
}

function getHeaders(): HeadersInit {
  const user = getStoredUser();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (user) {
    headers['x-user-id'] = user.id;
    headers['x-username'] = user.username;
  }
  return headers;
}

export const api = {
  // Auth
  async register(params: { username: string; email: string; password: string; displayName?: string }) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params),
    });
    return res.json();
  },

  async login(params: { identifier: string; password: string }) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params),
    });
    return res.json();
  },

  async logout() {
    // Must run while the stored user's headers are still available
    try {
      await fetch('/api/auth/logout', { method: 'POST', headers: getHeaders() });
    } catch {
      /* logging out locally must not depend on the network */
    }
  },

  async getMe() {
    const res = await fetch('/api/auth/me', { headers: getHeaders() });
    return handle(res);
  },

  async updateProfile(params: { displayName?: string; bio?: string; avatar?: string }) {
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(params),
    });
    return handle(res);
  },

  // Players
  async searchPlayers(query = ''): Promise<{ players: PlayerPublicProfile[] }> {
    const res = await fetch(`/api/players?q=${encodeURIComponent(query)}`, { headers: getHeaders() });
    return handle(res);
  },

  // Games
  async createBotGame(params: { humanName: string; difficulty: string; humanMark: 'X' | 'O' }) {
    const res = await fetch('/api/games/bot', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params),
    });
    return handle(res);
  },

  async playBotMove(params: {
    gameId: string;
    board: string;
    position: number;
    humanMark: 'X' | 'O';
    difficulty: string;
  }) {
    const res = await fetch('/api/games/bot/move', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params),
    });
    return handle(res);
  },

  async getMatchHistory(username = ''): Promise<{ games: MatchRecord[] }> {
    const res = await fetch(`/api/games/history?username=${encodeURIComponent(username)}`, { headers: getHeaders() });
    return handle(res);
  },

  // Social
  async getSocialOverview() {
    const res = await fetch('/api/social/overview', { headers: getHeaders() });
    return handle(res);
  },

  async sendFriendRequest(recipientName: string) {
    const res = await fetch('/api/friend-requests', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ recipientName }),
    });
    return handle(res);
  },

  async respondFriendRequest(requestId: string, status: 'ACCEPTED' | 'REJECTED' | 'CANCELLED') {
    const res = await fetch(`/api/friend-requests/${requestId}/respond`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ status }),
    });
    return handle(res);
  },

  async removeFriend(friendName: string) {
    const res = await fetch(`/api/friends/${encodeURIComponent(friendName)}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handle(res);
  },

  async blockUser(targetUser: string) {
    const res = await fetch(`/api/users/${encodeURIComponent(targetUser)}/block`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handle(res);
  },

  async unblockUser(targetUser: string) {
    const res = await fetch(`/api/users/${encodeURIComponent(targetUser)}/unblock`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handle(res);
  },

  async sendInvitation(recipientName: string, roomCode: string) {
    const res = await fetch('/api/invitations', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ recipientName, roomCode }),
    });
    return handle(res);
  },

  async getInvitations() {
    const res = await fetch('/api/invitations', { headers: getHeaders() });
    return handle(res);
  },

  async readNotification(id: string) {
    const res = await fetch(`/api/notifications/${id}/read`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handle(res);
  },

  async readAllNotifications() {
    const res = await fetch('/api/notifications/read-all', {
      method: 'POST',
      headers: getHeaders(),
    });
    return handle(res);
  },

  // OOP Lab: C++ OOP Demonstrations
  async getPolymorphismDemo(board = 'X.O......', mark = 'O'): Promise<{
    inputBoard: string;
    botMark: string;
    legalMoves: number[];
    polymorphismResults: PolymorphismResultItem[];
  }> {
    const res = await fetch('/api/oop/polymorphism-demo', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ board, mark }),
    });
    return handle(res);
  },

  async getEncapsulationDemo(action = 'occupied_cell', board = 'X........', position = 0, mark = 'O') {
    const res = await fetch('/api/oop/encapsulation-demo', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ action, board, position, mark }),
    });
    return handle(res);
  },

  async getOperatorsDemo(board = 'X.O......', position = 1, mark = 'X'): Promise<OperatorOverloadResult> {
    const res = await fetch('/api/oop/operators-demo', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ board, position, mark }),
    });
    return handle(res);
  },

  async getTemplatesDemo(): Promise<TemplatesResult> {
    const res = await fetch('/api/oop/templates-demo', {
      headers: getHeaders(),
    });
    return handle(res);
  },

  async getClassRegistry(): Promise<{ engine: string; classes: ClassRegistryItem[] }> {
    const res = await fetch('/api/oop/class-registry', { headers: getHeaders() });
    return handle(res);
  },

  async runOopTests() {
    const res = await fetch('/api/oop/run-tests', {
      method: 'POST',
      headers: getHeaders(),
    });
    return handle(res);
  },
};
