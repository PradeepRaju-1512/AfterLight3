import 'dotenv/config';
import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(express.json({ limit: '100kb' }));

const PORT = Number(process.env.PORT) || 3000;

// Database & engine process runners

const PROCESS_TIMEOUT_MS = 15000;

// Spawns a child process and resolves with its parsed JSON stdout.
// - 'error' events (binary missing, python3 not installed...) are handled; previously they were
//   unhandled and crashed the whole Node server.
// - a hung child is killed after PROCESS_TIMEOUT_MS.
// - non-JSON output or a JSON { error } payload rejects instead of returning garbage that callers
//   would then read `.move` / `.user` from.
function runJsonProcess(label: string, command: string, args: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => { if (!settled) { settled = true; clearTimeout(timer); fn(); } };

    const proc = spawn(command, args);
    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      finish(() => reject(new Error(`${label} timed out after ${PROCESS_TIMEOUT_MS}ms`)));
    }, PROCESS_TIMEOUT_MS);

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('error', (err) => finish(() => reject(new Error(`${label} failed to start: ${err.message}`))));

    proc.on('close', (code) => finish(() => {
      let parsed: any;
      try {
        parsed = JSON.parse(stdout.trim());
      } catch {
        return reject(new Error(stderr.trim() || `${label} exited with code ${code} and returned invalid JSON`));
      }
      resolve(parsed);
    }));
  });
}

function runPython(scriptPath: string, args: string[]): Promise<any> {
  return runJsonProcess('Database bridge', process.env.PYTHON_BIN || 'python3', [scriptPath, ...args]);
}

// Engine calls: an { error } payload from the C++ CLI is a real failure -> reject.
async function runCpp(binaryPath: string, args: string[]): Promise<any> {
  const parsed = await runJsonProcess('C++ engine', binaryPath, args);
  if (parsed && parsed.error) throw new Error(String(parsed.error));
  return parsed;
}

function runDb(action: string, params: Record<string, any> = {}): Promise<any> {
  const dbBridge = path.join(__dirname, 'backend', 'db_bridge.py');
  return runPython(dbBridge, [action, JSON.stringify(params)]);
}

function runEngineCli(command: string, args: string[] = []): Promise<any> {
  const cppBinary = path.join(__dirname, 'backend', 'cpp', 'engine_cli');
  if (!fs.existsSync(cppBinary)) {
    return Promise.reject(new Error('Native C++ 17 engine binary not found at backend/cpp/engine_cli'));
  }
  return runCpp(cppBinary, [command, ...args]);
}

// ==========================================
// REST API Endpoints
// ==========================================

// --- AUTHENTICATION ---
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required.' });
    }
    const result = await runDb('register', { username, email, password, displayName });
    if (result.error) return res.status(400).json(result);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Username/email and password are required.' });
    }
    const result = await runDb('login', { identifier, password });
    if (result.error) return res.status(401).json(result);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    const username = headerString(req.headers['x-username']);
    if (username) await runDb('logout', { username });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const result = await runDb('get_user', { userId });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- PROFILES & DISCOVERY ---
app.put('/api/profile', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { displayName, bio, avatar } = req.body;
    const result = await runDb('update_profile', { userId, displayName, bio, avatar });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/players', async (req, res) => {
  try {
    const query = (req.query.q as string) || '';
    const currentUser = (req.headers['x-username'] as string) || '';
    const result = await runDb('search_players', { query, currentUser });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- BOT GAMES & ENGINE ---
type Difficulty = 'wanderer' | 'sentinel' | 'unbroken';
const DIFFICULTIES: Difficulty[] = ['wanderer', 'sentinel', 'unbroken'];

function botDisplayName(diff: Difficulty): string {
  return diff === 'wanderer' ? 'Wanderer' : diff === 'sentinel' ? 'Sentinel' : 'The Unbroken';
}

function headerString(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) || '';
}

// Server-side authoritative state for bot games. Previously the server trusted the board sent by
// the browser, so a client could submit a hand-made board to record fake wins.
interface BotGameState {
  id: string;
  username: string;
  humanMark: 'X' | 'O';
  difficulty: Difficulty;
  board: string;
  createdAt: number;
}
const botGames = new Map<string, BotGameState>();
const BOT_GAME_TTL_MS = 6 * 60 * 60 * 1000;

function pruneBotGames() {
  const cutoff = Date.now() - BOT_GAME_TTL_MS;
  for (const [id, g] of botGames) {
    if (g.createdAt < cutoff) botGames.delete(id);
  }
}

function placeMark(board: string, pos: number, mark: string): string {
  return board.substring(0, pos) + mark + board.substring(pos + 1);
}

async function saveBotResult(g: BotGameState, outcome: 'WIN_X' | 'WIN_O' | 'DRAW', line: number[] | null) {
  const botName = botDisplayName(g.difficulty);
  const humanWon = (outcome === 'WIN_X' && g.humanMark === 'X') || (outcome === 'WIN_O' && g.humanMark === 'O');
  const winnerName = outcome === 'DRAW' ? null : humanWon ? g.username : botName;
  await runDb('save_match', {
    id: g.id,
    mode: 'BOT',
    botDifficulty: g.difficulty,
    playerXName: g.humanMark === 'X' ? g.username : botName,
    playerOName: g.humanMark === 'O' ? g.username : botName,
    boardState: g.board,
    currentTurn: g.humanMark,
    status: 'COMPLETED',
    outcome,
    winnerName,
    winningLine: line,
  });
  return winnerName;
}

app.post('/api/games/bot', async (req, res) => {
  try {
    const username = headerString(req.headers['x-username']) || String(req.body?.humanName || '');
    if (!username) return res.status(401).json({ error: 'Unauthorized' });

    const diff = (req.body?.difficulty || 'unbroken') as Difficulty;
    const mark = (req.body?.humanMark || 'X') as 'X' | 'O';
    if (!DIFFICULTIES.includes(diff)) return res.status(400).json({ error: 'Unknown difficulty.' });
    if (mark !== 'X' && mark !== 'O') return res.status(400).json({ error: 'humanMark must be X or O.' });

    pruneBotGames();
    const gameId = 'game_' + randomUUID().replace(/-/g, '').slice(0, 12);
    const botName = botDisplayName(diff);

    let board = '.........';
    let currentTurn: 'X' | 'O' = 'X';
    let botFirstMove: any = null;

    // If the human chose O, the bot opens as X
    if (mark === 'O') {
      botFirstMove = await runEngineCli('bot-move', [board, diff, 'X']);
      board = placeMark(board, botFirstMove.move, 'X');
      currentTurn = 'O';
    }

    botGames.set(gameId, { id: gameId, username, humanMark: mark, difficulty: diff, board, createdAt: Date.now() });

    // Games are persisted when they finish (see saveBotResult); abandoned games leave no ghost rows.
    res.json({
      game: {
        id: gameId,
        mode: 'BOT',
        botDifficulty: diff,
        playerXName: mark === 'X' ? username : botName,
        playerOName: mark === 'O' ? username : botName,
        boardState: board,
        currentTurn,
        status: 'ACTIVE',
        outcome: 'IN_PROGRESS',
        createdAt: Date.now() / 1000,
      },
      botFirstMove,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/games/bot/move', async (req, res) => {
  try {
    const username = headerString(req.headers['x-username']);
    const { gameId } = req.body ?? {};
    const position = Number(req.body?.position);

    const g = typeof gameId === 'string' ? botGames.get(gameId) : undefined;
    if (!g) {
      return res.status(404).json({ error: 'Game not found or expired. Please start a new game.' });
    }
    if (username && username !== g.username) {
      return res.status(403).json({ error: 'This game belongs to another player.' });
    }
    if (!Number.isInteger(position) || position < 0 || position > 8 || g.board[position] !== '.') {
      return res.status(400).json({ error: 'Illegal move position.' });
    }

    const botMark = g.humanMark === 'X' ? 'O' : 'X';
    const botName = botDisplayName(g.difficulty);

    // 1. Human move
    g.board = placeMark(g.board, position, g.humanMark);

    const humanWin = checkWinner(g.board);
    if (humanWin.winner) {
      const winner = await saveBotResult(g, humanWin.winner === 'X' ? 'WIN_X' : 'WIN_O', humanWin.line);
      botGames.delete(g.id);
      return res.json({
        board: g.board, status: 'COMPLETED',
        outcome: humanWin.winner === 'X' ? 'WIN_X' : 'WIN_O',
        winner, winningLine: humanWin.line,
      });
    }
    if (!g.board.includes('.')) {
      await saveBotResult(g, 'DRAW', null);
      botGames.delete(g.id);
      return res.json({ board: g.board, status: 'COMPLETED', outcome: 'DRAW', winner: null, winningLine: null });
    }

    // 2. Bot reply (C++ engine)
    let botResult: any;
    try {
      botResult = await runEngineCli('bot-move', [g.board, g.difficulty, botMark]);
    } catch (engineErr) {
      // Roll the human move back so the game is not left in a state the player cannot recover from
      g.board = placeMark(g.board, position, '.');
      throw engineErr;
    }
    const botPos = Number(botResult.move);
    if (!Number.isInteger(botPos) || botPos < 0 || botPos > 8 || g.board[botPos] !== '.') {
      g.board = placeMark(g.board, position, '.');
      throw new Error('Engine returned an illegal move.');
    }
    g.board = placeMark(g.board, botPos, botMark);

    const botWin = checkWinner(g.board);
    if (botWin.winner) {
      const outcome = botWin.winner === 'X' ? 'WIN_X' : 'WIN_O';
      await saveBotResult(g, outcome, botWin.line);
      botGames.delete(g.id);
      return res.json({
        board: g.board, status: 'COMPLETED', outcome,
        winner: botName, winningLine: botWin.line,
        botMove: botPos, botExplanation: botResult.explanation,
      });
    }
    if (!g.board.includes('.')) {
      await saveBotResult(g, 'DRAW', null);
      botGames.delete(g.id);
      return res.json({
        board: g.board, status: 'COMPLETED', outcome: 'DRAW', winner: null, winningLine: null,
        botMove: botPos, botExplanation: botResult.explanation,
      });
    }

    res.json({
      board: g.board, status: 'ACTIVE', nextTurn: g.humanMark,
      botMove: botPos, botExplanation: botResult.explanation,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/games/history', async (req, res) => {
  try {
    const username = headerString(req.headers['x-username']) || (req.query.username as string) || '';
    if (!username) return res.status(401).json({ error: 'Unauthorized' });
    const result = await runDb('get_match_history', { username });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- SOCIAL & NOTIFICATIONS ---
app.get('/api/social/overview', async (req, res) => {
  try {
    const username = req.headers['x-username'] as string;
    if (!username) return res.status(401).json({ error: 'Unauthorized' });
    const result = await runDb('get_social_overview', { username });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/friend-requests', async (req, res) => {
  try {
    const senderName = headerString(req.headers['x-username']);
    if (!senderName) return res.status(401).json({ error: 'Unauthorized' });
    const { recipientName } = req.body ?? {};
    if (!recipientName) return res.status(400).json({ error: 'recipientName is required.' });
    const result = await runDb('send_friend_request', { senderName, recipientName });
    if (result.error) return res.status(400).json(result);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/friend-requests/:id/respond', async (req, res) => {
  try {
    const username = headerString(req.headers['x-username']);
    if (!username) return res.status(401).json({ error: 'Unauthorized' });
    const requestId = req.params.id;
    const { status } = req.body ?? {};
    const result = await runDb('respond_friend_request', { requestId, status, username });
    if (result.error) return res.status(400).json(result);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/friends/:friendName', async (req, res) => {
  try {
    const userA = headerString(req.headers['x-username']);
    if (!userA) return res.status(401).json({ error: 'Unauthorized' });
    const userB = req.params.friendName;
    const result = await runDb('remove_friend', { userA, userB });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users/:targetUser/block', async (req, res) => {
  try {
    const blocker = headerString(req.headers['x-username']);
    if (!blocker) return res.status(401).json({ error: 'Unauthorized' });
    const blocked = req.params.targetUser;
    const result = await runDb('block_user', { blocker, blocked });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users/:targetUser/unblock', async (req, res) => {
  try {
    const blocker = headerString(req.headers['x-username']);
    if (!blocker) return res.status(401).json({ error: 'Unauthorized' });
    const blocked = req.params.targetUser;
    const result = await runDb('unblock_user', { blocker, blocked });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/invitations', async (req, res) => {
  try {
    const senderName = headerString(req.headers['x-username']);
    if (!senderName) return res.status(401).json({ error: 'Unauthorized' });
    const { recipientName, roomCode } = req.body ?? {};
    if (!recipientName || !roomCode) return res.status(400).json({ error: 'recipientName and roomCode are required.' });
    const result = await runDb('send_game_invitation', { senderName, recipientName, roomCode });
    if (result.error) return res.status(400).json(result);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/invitations', async (req, res) => {
  try {
    const username = headerString(req.headers['x-username']);
    if (!username) return res.status(401).json({ error: 'Unauthorized' });
    const result = await runDb('get_invitations', { username });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications/:id/read', async (req, res) => {
  try {
    const username = headerString(req.headers['x-username']);
    if (!username) return res.status(401).json({ error: 'Unauthorized' });
    const result = await runDb('read_notification', { notificationId: req.params.id, username });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications/read-all', async (req, res) => {
  try {
    const username = headerString(req.headers['x-username']);
    if (!username) return res.status(401).json({ error: 'Unauthorized' });
    const result = await runDb('read_all_notifications', { username });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
// ==========================================
// C++ OOP Lab Endpoints
// ==========================================

app.post('/api/oop/polymorphism-demo', async (req, res) => {
  try {
    const { board, mark } = req.body;
    const result = await runEngineCli('polymorphism-compare', [board || 'X.O......', mark || 'O']);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/oop/encapsulation-demo', async (req, res) => {
  try {
    const { action, board, position, mark } = req.body;
    const result = await runEngineCli('test-encapsulation', [
      action || 'occupied_cell',
      board || 'X........',
      String(position ?? 0),
      mark || 'O',
    ]);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/oop/operators-demo', async (req, res) => {
  try {
    const { board, position, mark } = req.body;
    const result = await runEngineCli('test-operators', [
      board || 'X.O......',
      String(position ?? 1),
      mark || 'X',
    ]);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/oop/templates-demo', async (_req, res) => {
  try {
    const result = await runEngineCli('test-templates');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/oop/class-registry', async (_req, res) => {
  try {
    const result = await runEngineCli('class-registry');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/oop/run-tests', (_req, res) => {
  const cppTest = path.join(__dirname, 'backend', 'cpp', 'test_engine');
  if (!fs.existsSync(cppTest)) {
    return res.status(500).json({ error: 'C++ test binary not found. Run: bash backend/cpp/build.sh' });
  }

  let responded = false;
  const reply = (status: number, body: any) => {
    if (responded) return;
    responded = true;
    res.status(status).json(body);
  };

  const proc = spawn(cppTest);
  let output = '';
  let errOutput = '';
  const timer = setTimeout(() => { proc.kill('SIGKILL'); reply(500, { error: 'C++ tests timed out.' }); }, 60000);

  proc.stdout.on('data', (d) => { output += d.toString(); });
  proc.stderr.on('data', (d) => { errOutput += d.toString(); });
  proc.on('error', (err) => { clearTimeout(timer); reply(500, { error: `Could not start C++ tests: ${err.message}` }); });
  proc.on('close', (code) => {
    clearTimeout(timer);
    const combined = output + (errOutput ? '\n' + errOutput : '');
    const passed = code === 0;
    const m = combined.match(/Total Passed: (\d+) \/ (\d+)/);
    const count = m ? m[2] : '';
    reply(200, {
      engine: 'C++ 17 Native ISO Engine',
      success: passed,
      exitCode: code,
      output: combined,
      summary: passed
        ? `All ${count} C++ OOP domain, operator overloading & template tests passed! (100% OK)`
        : 'C++ Tests failed.',
    });
  });
});

// ==========================================
// Multiplayer WebSocket Synchronization
// ==========================================

interface RoomPlayer {
  ws: WebSocket;
  username: string;
  mark: 'X' | 'O';
}

interface GameRoom {
  code: string;
  players: RoomPlayer[];
  board: string;
  currentTurn: 'X' | 'O';
  status: 'WAITING' | 'ACTIVE' | 'COMPLETED';
  outcome?: string;
  winner?: string | null;
  winningLine?: number[] | null;
  rematchVotes: Set<string>;
  chat: Array<{ sender: string; text: string; time: number }>;
}

const rooms = new Map<string, GameRoom>();

function broadcastRoom(room: GameRoom, event: string, payload: any) {
  const msg = JSON.stringify({ event, roomCode: room.code, payload });
  for (const p of room.players) {
    if (p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(msg);
    }
  }
}

function checkWinner(b: string): { winner: 'X' | 'O' | null; line: number[] | null } {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];
  for (const [a, bIdx, c] of lines) {
    if (b[a] !== '.' && b[a] === b[bIdx] && b[a] === b[c]) {
      return { winner: b[a] as 'X' | 'O', line: [a, bIdx, c] };
    }
  }
  return { winner: null, line: null };
}

const ROOM_CODE_RE = /^[A-Z0-9-]{3,20}$/;

function roomSnapshot(room: GameRoom) {
  return {
    status: room.status,
    players: room.players.map(p => ({ username: p.username, mark: p.mark })),
    board: room.board,
    currentTurn: room.currentTurn,
  };
}

// Persists a finished online match. A DB failure must never leave the room stuck, so it is logged only.
async function persistRoomResult(room: GameRoom, outcome: string, winnerName: string | null, line: number[] | null) {
  const px = room.players.find(p => p.mark === 'X')?.username || 'PlayerX';
  const po = room.players.find(p => p.mark === 'O')?.username || 'PlayerO';
  try {
    await runDb('save_match', {
      id: 'room_' + room.code + '_' + Date.now(),
      mode: 'ONLINE',
      playerXName: px,
      playerOName: po,
      boardState: room.board,
      currentTurn: room.currentTurn,
      status: 'COMPLETED',
      outcome,
      winnerName,
      winningLine: line,
      roomCode: room.code,
    });
  } catch (e: any) {
    console.error('Failed to save online match:', e.message);
  }
}

// Removes a socket from its room. Only real seat-holders trigger PLAYER_LEFT / room cleanup
// (a rejected third connection used to be able to do this).
function removeFromRoom(code: string | null, ws: WebSocket) {
  if (!code) return;
  const room = rooms.get(code);
  if (!room) return;
  const leaving = room.players.find(p => p.ws === ws);
  if (!leaving) return;

  room.players = room.players.filter(p => p.ws !== ws);
  room.rematchVotes.delete(leaving.username);

  if (room.players.length === 0) {
    rooms.delete(code);
    return;
  }

  // A finished game cannot be rematched with one player: reset so the next joiner starts fresh.
  if (room.status === 'COMPLETED') {
    room.status = 'WAITING';
    room.board = '.........';
    room.currentTurn = 'X';
    room.outcome = undefined;
    room.winner = undefined;
    room.winningLine = null;
    room.rematchVotes.clear();
  }
  broadcastRoom(room, 'PLAYER_LEFT', { username: leaving.username });
  broadcastRoom(room, 'ROOM_STATE', roomSnapshot(room));
}

function sendError(ws: WebSocket, message: string) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ event: 'ERROR', payload: { message } }));
  }
}

wss.on('connection', (ws) => {
  let currentRoomCode: string | null = null;
  let currentUser: string | null = null;

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      const { action, roomCode, username, position, text } = message;

      if (action === 'JOIN_ROOM') {
        const code = String(roomCode ?? '').toUpperCase().trim();
        const name = String(username ?? '').trim();
        if (!ROOM_CODE_RE.test(code)) return sendError(ws, 'Invalid room code.');
        if (!name || name.length > 40) return sendError(ws, 'Invalid username.');

        // Switching rooms on the same socket: leave the old one first
        if (currentRoomCode && currentRoomCode !== code) {
          removeFromRoom(currentRoomCode, ws);
          currentRoomCode = null;
        }

        let room = rooms.get(code);
        if (!room) {
          room = {
            code,
            players: [],
            board: '.........',
            currentTurn: 'X',
            status: 'WAITING',
            rematchVotes: new Set(),
            chat: [],
          };
          rooms.set(code, room);
        }

        const existing = room.players.find(p => p.username === name);
        if (existing) {
          existing.ws = ws; // reconnect (page reload / second tab)
        } else if (room.players.length < 2) {
          // Take whichever mark is free. Using players.length gave two players the same mark
          // when one had left an ongoing game.
          const taken = room.players[0]?.mark;
          const mark: 'X' | 'O' = taken === 'X' ? 'O' : 'X';
          room.players.push({ ws, username: name, mark });
        } else {
          return sendError(ws, 'Room is full.');
        }

        // Only now is this socket actually a member of the room
        currentRoomCode = code;
        currentUser = name;

        if (room.players.length === 2 && room.status === 'WAITING') {
          room.status = 'ACTIVE';
          broadcastRoom(room, 'GAME_START', {
            board: room.board,
            currentTurn: room.currentTurn,
            playerX: room.players.find(p => p.mark === 'X')?.username,
            playerO: room.players.find(p => p.mark === 'O')?.username,
          });
        } else {
          broadcastRoom(room, 'ROOM_STATE', roomSnapshot(room));
        }
      }

      else if (action === 'MAKE_MOVE') {
        if (!currentRoomCode) return;
        const room = rooms.get(currentRoomCode);
        if (!room || room.status !== 'ACTIVE') return;

        const player = room.players.find(p => p.username === currentUser);
        if (!player || player.mark !== room.currentTurn) {
          return sendError(ws, 'Not your turn!');
        }
        if (room.players.length < 2) {
          return sendError(ws, 'Waiting for an opponent to return.');
        }

        const pos = Number(position);
        if (!Number.isInteger(pos) || pos < 0 || pos > 8 || room.board[pos] !== '.') {
          return sendError(ws, 'Illegal position!');
        }

        room.board = room.board.substring(0, pos) + player.mark + room.board.substring(pos + 1);

        const win = checkWinner(room.board);
        if (win.winner) {
          room.status = 'COMPLETED';
          room.outcome = win.winner === 'X' ? 'WIN_X' : 'WIN_O';
          room.winner = player.username;
          room.winningLine = win.line;
          broadcastRoom(room, 'GAME_OVER', {
            board: room.board, outcome: room.outcome, winner: player.username, winningLine: win.line,
          });
          await persistRoomResult(room, room.outcome, player.username, win.line);
          return;
        }

        if (!room.board.includes('.')) {
          room.status = 'COMPLETED';
          room.outcome = 'DRAW';
          room.winner = null;
          room.winningLine = null;
          broadcastRoom(room, 'GAME_OVER', { board: room.board, outcome: 'DRAW', winner: null, winningLine: null });
          await persistRoomResult(room, 'DRAW', null, null);
          return;
        }

        room.currentTurn = room.currentTurn === 'X' ? 'O' : 'X';
        broadcastRoom(room, 'MOVE_MADE', {
          position: pos, mark: player.mark, player: player.username, board: room.board, nextTurn: room.currentTurn,
        });
      }

      else if (action === 'REQUEST_REMATCH') {
        if (!currentRoomCode || !currentUser) return;
        const room = rooms.get(currentRoomCode);
        // Previously a rematch could be forced in the middle of a running game
        if (!room || room.status !== 'COMPLETED' || room.players.length < 2) return;
        if (!room.players.some(p => p.username === currentUser)) return;

        room.rematchVotes.add(currentUser);
        if (room.rematchVotes.size >= 2) {
          room.board = '.........';
          room.status = 'ACTIVE';
          room.currentTurn = 'X';
          room.rematchVotes.clear();
          room.outcome = undefined;
          room.winner = undefined;
          room.winningLine = null;

          // Swap marks for fairness
          room.players.forEach(p => { p.mark = p.mark === 'X' ? 'O' : 'X'; });

          broadcastRoom(room, 'REMATCH_STARTED', {
            board: room.board,
            currentTurn: room.currentTurn,
            playerX: room.players.find(p => p.mark === 'X')?.username,
            playerO: room.players.find(p => p.mark === 'O')?.username,
          });
        } else {
          broadcastRoom(room, 'REMATCH_REQUESTED', { player: currentUser });
        }
      }

      else if (action === 'CHAT') {
        if (!currentRoomCode) return;
        const room = rooms.get(currentRoomCode);
        if (!room || !room.players.some(p => p.ws === ws)) return;
        const clean = String(text ?? '').trim().slice(0, 150);
        if (!clean) return;
        const msgObj = { sender: currentUser || 'Anonymous', text: clean, time: Date.now() };
        room.chat.push(msgObj);
        if (room.chat.length > 200) room.chat.shift(); // bound memory
        broadcastRoom(room, 'CHAT_MESSAGE', msgObj);
      }

      else if (action === 'LEAVE_ROOM') {
        removeFromRoom(currentRoomCode, ws);
        currentRoomCode = null;
      }
    } catch (e: any) {
      sendError(ws, e.message);
    }
  });

  ws.on('close', () => {
    removeFromRoom(currentRoomCode, ws);
    currentRoomCode = null;
  });

  ws.on('error', (err) => console.error('WebSocket error:', err.message));
});

// ==========================================
// Vite Integration in Development
// ==========================================

async function startServer() {
  app.use(express.static(path.join(__dirname, 'public')));

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  // JSON error responses (e.g. malformed request bodies) instead of Express' default HTML page
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = err?.status || err?.statusCode || 500;
    res.status(status).json({ error: status === 500 ? 'Internal server error.' : err.message });
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`AFTERLIGHT Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
