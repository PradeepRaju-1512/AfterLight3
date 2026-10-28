import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(express.json());

const PORT = 3000;

// ==========================================
// Python Bridge Helpers
// ==========================================

function runPython(scriptPath: string, args: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const py = spawn('python3', [scriptPath, ...args]);
    let stdout = '';
    let stderr = '';

    py.stdout.on('data', (d) => { stdout += d.toString(); });
    py.stderr.on('data', (d) => { stderr += d.toString(); });

    py.on('close', (code) => {
      if (code !== 0 && !stdout) {
        return reject(new Error(stderr || `Python script exited with code ${code}`));
      }
      try {
        const parsed = JSON.parse(stdout.trim());
        resolve(parsed);
      } catch (err) {
        // Return raw text if not json
        resolve({ output: stdout, error: stderr, code });
      }
    });
  });
}

function runDb(action: string, params: Record<string, any> = {}): Promise<any> {
  const dbBridge = path.join(__dirname, 'backend', 'db_bridge.py');
  return runPython(dbBridge, [action, JSON.stringify(params)]);
}

function runEngineCli(command: string, args: string[] = []): Promise<any> {
  const cli = path.join(__dirname, 'backend', 'engine_cli.py');
  return runPython(cli, [command, ...args]);
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

app.post('/api/auth/logout', (_req, res) => {
  res.json({ success: true });
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
app.post('/api/games/bot', async (req, res) => {
  try {
    const { humanName, difficulty, humanMark } = req.body;
    const gameId = 'game_' + Math.random().toString(36).substring(2, 9);
    const mark = humanMark || 'X';
    const diff = difficulty || 'unbroken';
    const botName = diff === 'wanderer' ? 'Wanderer' : diff === 'sentinel' ? 'Sentinel' : 'The Unbroken';
    const playerX = mark === 'X' ? humanName : botName;
    const playerO = mark === 'O' ? humanName : botName;

    let board = '.........';
    let currentTurn = 'X';
    let botFirstMove: any = null;

    // If human selected O, bot moves first as X
    if (mark === 'O') {
      const botMoveResult = await runEngineCli('bot-move', [board, diff, 'X']);
      const pos = botMoveResult.move;
      board = board.substring(0, pos) + 'X' + board.substring(pos + 1);
      currentTurn = 'O';
      botFirstMove = botMoveResult;
    }

    const matchPayload = {
      id: gameId,
      mode: 'BOT',
      botDifficulty: diff,
      playerXName: playerX,
      playerOName: playerO,
      boardState: board,
      currentTurn,
      status: 'ACTIVE',
      outcome: 'IN_PROGRESS',
      createdAt: Date.now() / 1000,
    };

    await runDb('save_match', matchPayload);

    res.json({
      game: matchPayload,
      botFirstMove,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/games/bot/move', async (req, res) => {
  try {
    const { gameId, board, position, humanMark, difficulty } = req.body;
    const mark = humanMark || 'X';
    const botMark = mark === 'X' ? 'O' : 'X';
    const diff = difficulty || 'unbroken';

    // 1. Validate position and apply human move
    if (position < 0 || position > 8 || board[position] !== '.') {
      return res.status(400).json({ error: 'Illegal move position.' });
    }

    let currentBoard = board.substring(0, position) + mark + board.substring(position + 1);

    // Check if human won
    const winCheck = checkWinner(currentBoard);
    if (winCheck.winner) {
      const matchUpdate = {
        id: gameId,
        mode: 'BOT',
        botDifficulty: diff,
        playerXName: mark === 'X' ? req.headers['x-username'] || 'Player' : diff,
        playerOName: mark === 'O' ? req.headers['x-username'] || 'Player' : diff,
        boardState: currentBoard,
        currentTurn: mark,
        status: 'COMPLETED',
        outcome: mark === 'X' ? 'WIN_X' : 'WIN_O',
        winnerName: req.headers['x-username'] || 'Player',
        winningLine: winCheck.line,
      };
      await runDb('save_match', matchUpdate);
      return res.json({
        board: currentBoard,
        status: 'COMPLETED',
        outcome: matchUpdate.outcome,
        winner: matchUpdate.winnerName,
        winningLine: winCheck.line,
      });
    }

    // Check if draw
    if (!currentBoard.includes('.')) {
      const matchUpdate = {
        id: gameId,
        mode: 'BOT',
        botDifficulty: diff,
        playerXName: mark === 'X' ? req.headers['x-username'] || 'Player' : diff,
        playerOName: mark === 'O' ? req.headers['x-username'] || 'Player' : diff,
        boardState: currentBoard,
        currentTurn: botMark,
        status: 'COMPLETED',
        outcome: 'DRAW',
        winnerName: null,
        winningLine: null,
      };
      await runDb('save_match', matchUpdate);
      return res.json({
        board: currentBoard,
        status: 'COMPLETED',
        outcome: 'DRAW',
        winner: null,
        winningLine: null,
      });
    }

    // 2. Execute Python bot decision
    const botResult = await runEngineCli('bot-move', [currentBoard, diff, botMark]);
    const botPos = botResult.move;
    currentBoard = currentBoard.substring(0, botPos) + botMark + currentBoard.substring(botPos + 1);

    // Check if bot won
    const botWinCheck = checkWinner(currentBoard);
    if (botWinCheck.winner) {
      const botName = diff === 'wanderer' ? 'Wanderer' : diff === 'sentinel' ? 'Sentinel' : 'The Unbroken';
      const matchUpdate = {
        id: gameId,
        mode: 'BOT',
        botDifficulty: diff,
        playerXName: mark === 'X' ? req.headers['x-username'] || 'Player' : botName,
        playerOName: mark === 'O' ? req.headers['x-username'] || 'Player' : botName,
        boardState: currentBoard,
        currentTurn: botMark,
        status: 'COMPLETED',
        outcome: botMark === 'X' ? 'WIN_X' : 'WIN_O',
        winnerName: botName,
        winningLine: botWinCheck.line,
      };
      await runDb('save_match', matchUpdate);
      return res.json({
        board: currentBoard,
        status: 'COMPLETED',
        outcome: matchUpdate.outcome,
        winner: botName,
        winningLine: botWinCheck.line,
        botMove: botPos,
        botExplanation: botResult.explanation,
      });
    }

    // Check if draw after bot move
    if (!currentBoard.includes('.')) {
      const matchUpdate = {
        id: gameId,
        mode: 'BOT',
        botDifficulty: diff,
        playerXName: mark === 'X' ? req.headers['x-username'] || 'Player' : diff,
        playerOName: mark === 'O' ? req.headers['x-username'] || 'Player' : diff,
        boardState: currentBoard,
        currentTurn: mark,
        status: 'COMPLETED',
        outcome: 'DRAW',
        winnerName: null,
        winningLine: null,
      };
      await runDb('save_match', matchUpdate);
      return res.json({
        board: currentBoard,
        status: 'COMPLETED',
        outcome: 'DRAW',
        winner: null,
        winningLine: null,
        botMove: botPos,
        botExplanation: botResult.explanation,
      });
    }

    // Match remains active
    res.json({
      board: currentBoard,
      status: 'ACTIVE',
      nextTurn: mark,
      botMove: botPos,
      botExplanation: botResult.explanation,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/games/history', async (req, res) => {
  try {
    const username = (req.query.username as string) || '';
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
    const senderName = req.headers['x-username'] as string;
    const { recipientName } = req.body;
    const result = await runDb('send_friend_request', { senderName, recipientName });
    if (result.error) return res.status(400).json(result);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/friend-requests/:id/respond', async (req, res) => {
  try {
    const requestId = req.params.id;
    const { status } = req.body;
    const result = await runDb('respond_friend_request', { requestId, status });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/friends/:friendName', async (req, res) => {
  try {
    const userA = req.headers['x-username'] as string;
    const userB = req.params.friendName;
    const result = await runDb('remove_friend', { userA, userB });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users/:targetUser/block', async (req, res) => {
  try {
    const blocker = req.headers['x-username'] as string;
    const blocked = req.params.targetUser;
    const result = await runDb('block_user', { blocker, blocked });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users/:targetUser/unblock', async (req, res) => {
  try {
    const blocker = req.headers['x-username'] as string;
    const blocked = req.params.targetUser;
    const result = await runDb('unblock_user', { blocker, blocked });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/invitations', async (req, res) => {
  try {
    const senderName = req.headers['x-username'] as string;
    const { recipientName, roomCode } = req.body;
    const result = await runDb('send_game_invitation', { senderName, recipientName, roomCode });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/invitations', async (req, res) => {
  try {
    const username = req.headers['x-username'] as string;
    const result = await runDb('get_invitations', { username });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications/:id/read', async (req, res) => {
  try {
    const result = await runDb('read_notification', { notificationId: req.params.id });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications/read-all', async (req, res) => {
  try {
    const username = req.headers['x-username'] as string;
    const result = await runDb('read_all_notifications', { username });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- DEDICATED OOP LAB ENDPOINTS ---
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

app.get('/api/oop/class-registry', async (_req, res) => {
  try {
    const result = await runEngineCli('class-registry');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/oop/run-tests', async (_req, res) => {
  try {
    const testScript = path.join(__dirname, 'backend', 'tests', 'test_engine.py');
    const py = spawn('python3', [testScript]);
    let output = '';
    let errOutput = '';

    py.stdout.on('data', (d) => { output += d.toString(); });
    py.stderr.on('data', (d) => { errOutput += d.toString(); });

    py.on('close', (code) => {
      const combined = output + '\n' + errOutput;
      const passed = code === 0 && combined.includes('OK');
      res.json({
        success: passed,
        exitCode: code,
        output: combined,
        summary: passed ? 'All 20 Python OOP domain & AI correctness tests passed!' : 'Tests failed.',
      });
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
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

wss.on('connection', (ws) => {
  let currentRoomCode: string | null = null;
  let currentUser: string | null = null;

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      const { action, roomCode, username, position, text } = message;

      if (action === 'JOIN_ROOM') {
        const code = roomCode.toUpperCase().trim();
        currentUser = username;
        currentRoomCode = code;

        let room = rooms.get(code);
        if (!room) {
          // Create new room
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

        // Check if player already in room
        const existingIdx = room.players.findIndex(p => p.username === username);
        if (existingIdx !== -1) {
          room.players[existingIdx].ws = ws;
        } else if (room.players.length < 2) {
          const mark = room.players.length === 0 ? 'X' : 'O';
          room.players.push({ ws, username, mark });
        } else {
          ws.send(JSON.stringify({ event: 'ERROR', payload: { message: 'Room is full.' } }));
          return;
        }

        // If 2 players, start game!
        if (room.players.length === 2 && room.status === 'WAITING') {
          room.status = 'ACTIVE';
          broadcastRoom(room, 'GAME_START', {
            board: room.board,
            currentTurn: room.currentTurn,
            playerX: room.players.find(p => p.mark === 'X')?.username,
            playerO: room.players.find(p => p.mark === 'O')?.username,
          });
        } else {
          broadcastRoom(room, 'ROOM_STATE', {
            status: room.status,
            players: room.players.map(p => ({ username: p.username, mark: p.mark })),
            board: room.board,
            currentTurn: room.currentTurn,
          });
        }
      }

      else if (action === 'MAKE_MOVE') {
        if (!currentRoomCode) return;
        const room = rooms.get(currentRoomCode);
        if (!room || room.status !== 'ACTIVE') return;

        const player = room.players.find(p => p.username === currentUser);
        if (!player || player.mark !== room.currentTurn) {
          ws.send(JSON.stringify({ event: 'ERROR', payload: { message: 'Not your turn!' } }));
          return;
        }

        const pos = Number(position);
        if (pos < 0 || pos > 8 || room.board[pos] !== '.') {
          ws.send(JSON.stringify({ event: 'ERROR', payload: { message: 'Illegal position!' } }));
          return;
        }

        // Apply move
        room.board = room.board.substring(0, pos) + player.mark + room.board.substring(pos + 1);

        // Check winner
        const win = checkWinner(room.board);
        if (win.winner) {
          room.status = 'COMPLETED';
          room.outcome = win.winner === 'X' ? 'WIN_X' : 'WIN_O';
          room.winner = player.username;
          room.winningLine = win.line;

          // Save to database
          const px = room.players.find(p => p.mark === 'X')?.username || 'PlayerX';
          const po = room.players.find(p => p.mark === 'O')?.username || 'PlayerO';
          await runDb('save_match', {
            id: 'room_' + room.code + '_' + Date.now(),
            mode: 'ONLINE',
            playerXName: px,
            playerOName: po,
            boardState: room.board,
            currentTurn: room.currentTurn,
            status: 'COMPLETED',
            outcome: room.outcome,
            winnerName: player.username,
            winningLine: win.line,
            roomCode: room.code,
          });

          broadcastRoom(room, 'GAME_OVER', {
            board: room.board,
            outcome: room.outcome,
            winner: player.username,
            winningLine: win.line,
          });
          return;
        }

        // Check draw
        if (!room.board.includes('.')) {
          room.status = 'COMPLETED';
          room.outcome = 'DRAW';
          room.winner = null;
          room.winningLine = null;

          const px = room.players.find(p => p.mark === 'X')?.username || 'PlayerX';
          const po = room.players.find(p => p.mark === 'O')?.username || 'PlayerO';
          await runDb('save_match', {
            id: 'room_' + room.code + '_' + Date.now(),
            mode: 'ONLINE',
            playerXName: px,
            playerOName: po,
            boardState: room.board,
            currentTurn: room.currentTurn,
            status: 'COMPLETED',
            outcome: 'DRAW',
            winnerName: null,
            winningLine: null,
            roomCode: room.code,
          });

          broadcastRoom(room, 'GAME_OVER', {
            board: room.board,
            outcome: 'DRAW',
            winner: null,
            winningLine: null,
          });
          return;
        }

        // Next turn
        room.currentTurn = room.currentTurn === 'X' ? 'O' : 'X';
        broadcastRoom(room, 'MOVE_MADE', {
          position: pos,
          mark: player.mark,
          player: player.username,
          board: room.board,
          nextTurn: room.currentTurn,
        });
      }

      else if (action === 'REQUEST_REMATCH') {
        if (!currentRoomCode) return;
        const room = rooms.get(currentRoomCode);
        if (!room) return;

        room.rematchVotes.add(currentUser!);
        if (room.rematchVotes.size >= 2) {
          // Reset board, swap marks for fair play
          room.board = '.........';
          room.status = 'ACTIVE';
          room.currentTurn = 'X';
          room.rematchVotes.clear();
          room.outcome = undefined;
          room.winner = undefined;
          room.winningLine = null;

          // Swap marks
          room.players.forEach(p => {
            p.mark = p.mark === 'X' ? 'O' : 'X';
          });

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
        if (!room) return;
        const msgObj = { sender: currentUser || 'Anonymous', text: String(text || '').slice(0, 150), time: Date.now() };
        room.chat.push(msgObj);
        broadcastRoom(room, 'CHAT_MESSAGE', msgObj);
      }

      else if (action === 'LEAVE_ROOM') {
        if (!currentRoomCode) return;
        const room = rooms.get(currentRoomCode);
        if (room) {
          room.players = room.players.filter(p => p.username !== currentUser);
          broadcastRoom(room, 'PLAYER_LEFT', { username: currentUser });
          if (room.players.length === 0) {
            rooms.delete(currentRoomCode);
          }
        }
        currentRoomCode = null;
      }
    } catch (e: any) {
      ws.send(JSON.stringify({ event: 'ERROR', payload: { message: e.message } }));
    }
  });

  ws.on('close', () => {
    if (currentRoomCode) {
      const room = rooms.get(currentRoomCode);
      if (room) {
        room.players = room.players.filter(p => p.ws !== ws);
        broadcastRoom(room, 'PLAYER_LEFT', { username: currentUser });
        if (room.players.length === 0) {
          rooms.delete(currentRoomCode);
        }
      }
    }
  });
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

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`AFTERLIGHT Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
