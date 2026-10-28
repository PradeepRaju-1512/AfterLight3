import {
  User,
  PlayerPublicProfile,
  MatchRecord,
  NotificationItem,
  PolymorphismResultItem
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

  async getMe() {
    const res = await fetch('/api/auth/me', { headers: getHeaders() });
    return res.json();
  },

  async updateProfile(params: { displayName?: string; bio?: string; avatar?: string }) {
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(params),
    });
    return res.json();
  },

  // Players
  async searchPlayers(query = ''): Promise<{ players: PlayerPublicProfile[] }> {
    const res = await fetch(`/api/players?q=${encodeURIComponent(query)}`, { headers: getHeaders() });
    return res.json();
  },

  // Games
  async createBotGame(params: { humanName: string; difficulty: string; humanMark: 'X' | 'O' }) {
    const res = await fetch('/api/games/bot', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params),
    });
    return res.json();
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
    return res.json();
  },

  async getMatchHistory(username = ''): Promise<{ games: MatchRecord[] }> {
    const res = await fetch(`/api/games/history?username=${encodeURIComponent(username)}`, { headers: getHeaders() });
    return res.json();
  },

  // Social
  async getSocialOverview() {
    const res = await fetch('/api/social/overview', { headers: getHeaders() });
    return res.json();
  },

  async sendFriendRequest(recipientName: string) {
    const res = await fetch('/api/friend-requests', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ recipientName }),
    });
    return res.json();
  },

  async respondFriendRequest(requestId: string, status: 'ACCEPTED' | 'REJECTED' | 'CANCELLED') {
    const res = await fetch(`/api/friend-requests/${requestId}/respond`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ status }),
    });
    return res.json();
  },

  async removeFriend(friendName: string) {
    const res = await fetch(`/api/friends/${encodeURIComponent(friendName)}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return res.json();
  },

  async blockUser(targetUser: string) {
    const res = await fetch(`/api/users/${encodeURIComponent(targetUser)}/block`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return res.json();
  },

  async unblockUser(targetUser: string) {
    const res = await fetch(`/api/users/${encodeURIComponent(targetUser)}/unblock`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return res.json();
  },

  async sendInvitation(recipientName: string, roomCode: string) {
    const res = await fetch('/api/invitations', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ recipientName, roomCode }),
    });
    return res.json();
  },

  async getInvitations() {
    const res = await fetch('/api/invitations', { headers: getHeaders() });
    return res.json();
  },

  async readNotification(id: string) {
    const res = await fetch(`/api/notifications/${id}/read`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return res.json();
  },

  async readAllNotifications() {
    const res = await fetch('/api/notifications/read-all', {
      method: 'POST',
      headers: getHeaders(),
    });
    return res.json();
  },

  // OOP Lab
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
    return res.json();
  },

  async getEncapsulationDemo(action = 'occupied_cell', board = 'X........', position = 0, mark = 'O') {
    const res = await fetch('/api/oop/encapsulation-demo', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ action, board, position, mark }),
    });
    return res.json();
  },

  async getClassRegistry() {
    const res = await fetch('/api/oop/class-registry', { headers: getHeaders() });
    return res.json();
  },

  async runOopTests() {
    const res = await fetch('/api/oop/run-tests', {
      method: 'POST',
      headers: getHeaders(),
    });
    return res.json();
  },
};
