/**
 * AFTERLIGHT — Frontend Client Controller
 *
 * Strict Architecture Rule:
 * The C++ server owns all game logic, bot algorithms, room management,
 * move validation, and multiplayer state.
 * This JavaScript file strictly manages the UI, DOM events, REST calls,
 * and WebSocket communication with the C++ Crow server.
 */

(() => {
  'use strict';

  // Application State
  const state = {
    token: localStorage.getItem('afterlight_token') || null,
    user: null,
    currentView: 'auth', // 'auth' | 'lobby' | 'arena' | 'history'

    // Active Game State (populated exclusively by server responses)
    gameMode: null, // 'bot' | 'pvp'
    botDifficulty: 'medium',
    myMark: 'X', // 'X' or 'O'
    board: [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    currentTurn: 'X',
    status: 'ONGOING',
    winningLine: [],
    roomCode: null,
    isHost: false,
    opponentName: 'Bot',
    waitingForOpponent: false,
    rematchRequested: false,

    // WebSocket connection
    ws: null
  };

  // DOM Elements
  const el = {
    toast: document.getElementById('toast'),
    userInfo: document.getElementById('user-info'),
    userDisplayName: document.getElementById('user-display-name'),
    logoutBtn: document.getElementById('logout-btn'),

    // Nav
    navLobbyBtn: document.getElementById('nav-lobby-btn'),
    navHistoryBtn: document.getElementById('nav-history-btn'),

    // Views
    viewAuth: document.getElementById('view-auth'),
    viewLobby: document.getElementById('view-lobby'),
    viewArena: document.getElementById('view-arena'),
    viewHistory: document.getElementById('view-history'),

    // Auth
    tabLogin: document.getElementById('tab-login'),
    tabRegister: document.getElementById('tab-register'),
    loginForm: document.getElementById('login-form'),
    registerForm: document.getElementById('register-form'),
    loginUsername: document.getElementById('login-username'),
    loginPassword: document.getElementById('login-password'),
    regUsername: document.getElementById('reg-username'),
    regEmail: document.getElementById('reg-email'),
    regPassword: document.getElementById('reg-password'),

    // Lobby
    startBotBtn: document.getElementById('start-bot-btn'),
    createRoomBtn: document.getElementById('create-room-btn'),
    joinRoomInput: document.getElementById('join-room-input'),
    joinRoomBtn: document.getElementById('join-room-btn'),

    // Arena HUD
    arenaPlayerXName: document.getElementById('arena-player-x-name'),
    arenaPlayerOName: document.getElementById('arena-player-o-name'),
    arenaPlayerOSub: document.getElementById('arena-player-o-sub'),
    turnLabel: document.getElementById('turn-label'),
    turnMark: document.getElementById('turn-mark'),
    roomCodeTag: document.getElementById('room-code-tag'),
    displayRoomCode: document.getElementById('display-room-code'),
    copyRoomCodeBtn: document.getElementById('copy-room-code-btn'),

    // Board
    gameBoard: document.getElementById('game-board'),
    cells: Array.from(document.querySelectorAll('.cell')),

    // Overlays
    waitingOverlay: document.getElementById('waiting-overlay'),
    waitingCodeDisplay: document.getElementById('waiting-code-display'),
    copyWaitingCodeBtn: document.getElementById('copy-waiting-code-btn'),
    cancelRoomBtn: document.getElementById('cancel-room-btn'),

    gameOverOverlay: document.getElementById('game-over-overlay'),
    verdictTitle: document.getElementById('verdict-title'),
    verdictDetail: document.getElementById('verdict-detail'),
    rematchStatus: document.getElementById('rematch-status'),
    rematchBtn: document.getElementById('rematch-btn'),
    exitArenaBtn: document.getElementById('exit-arena-btn'),

    // History
    historyTbody: document.getElementById('history-tbody'),
    historyBackBtn: document.getElementById('history-back-btn')
  };

  // Toast notification
  function showToast(message, isError = false) {
    el.toast.textContent = message;
    el.toast.className = `toast ${isError ? 'error' : ''}`;
    el.toast.classList.remove('hidden');
    setTimeout(() => {
      el.toast.classList.add('hidden');
    }, 3500);
  }

  // View Navigation
  function switchView(viewName) {
    state.currentView = viewName;
    el.viewAuth.classList.add('hidden');
    el.viewLobby.classList.add('hidden');
    el.viewArena.classList.add('hidden');
    el.viewHistory.classList.add('hidden');

    el.navLobbyBtn.classList.remove('active');
    el.navHistoryBtn.classList.remove('active');

    if (viewName === 'auth') {
      el.viewAuth.classList.remove('hidden');
    } else if (viewName === 'lobby') {
      el.viewLobby.classList.remove('hidden');
      el.navLobbyBtn.classList.add('active');
    } else if (viewName === 'arena') {
      el.viewArena.classList.remove('hidden');
    } else if (viewName === 'history') {
      el.viewHistory.classList.remove('hidden');
      el.navHistoryBtn.classList.add('active');
      loadMatchHistory();
    }
  }

  // -----------------------------------------------------------
  // AUTHENTICATION CONTROLLER
  // -----------------------------------------------------------
  async function checkExistingSession() {
    if (!state.token) {
      switchView('auth');
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${state.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        state.user = data.user;
        updateUserUI();
        switchView('lobby');
      } else {
        logout();
      }
    } catch {
      switchView('auth');
    }
  }

  function updateUserUI() {
    if (state.user) {
      el.userDisplayName.textContent = state.user.username;
      el.userInfo.classList.remove('hidden');
    } else {
      el.userInfo.classList.add('hidden');
    }
  }

  function logout() {
    if (state.token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.token}`
        },
        body: JSON.stringify({ token: state.token })
      }).catch(() => {});
    }

    if (state.ws) {
      state.ws.close();
      state.ws = null;
    }

    state.token = null;
    state.user = null;
    localStorage.removeItem('afterlight_token');
    updateUserUI();
    switchView('auth');
    showToast('Logged out of system');
  }

  // -----------------------------------------------------------
  // BOARD UI RENDERER
  // -----------------------------------------------------------
  function renderBoard() {
    el.cells.forEach((cell, idx) => {
      const val = state.board[idx];
      cell.textContent = (val === 'X' || val === 'O') ? val : '';
      cell.className = 'cell';

      if (val === 'X') cell.classList.add('cell-x');
      if (val === 'O') cell.classList.add('cell-o');

      // Highlight winning combination if match finished
      if (state.winningLine.includes(idx)) {
        cell.classList.add('winning-cell');
      }

      // Disable cell if occupied or if not user's turn
      const isMyTurn = (state.currentTurn === state.myMark);
      const isGameOver = (state.status !== 'ONGOING');
      const isWaiting = state.waitingForOpponent;

      cell.disabled = (val !== ' ' && val !== '') || !isMyTurn || isGameOver || isWaiting;
    });

    // Update Turn Banner
    el.turnMark.textContent = state.currentTurn;
    el.turnMark.className = `turn-highlight ${state.currentTurn === 'X' ? 'mark-x' : 'mark-o'}`;

    if (state.status === 'ONGOING') {
      if (state.currentTurn === state.myMark) {
        el.turnLabel.textContent = 'YOUR TURN:';
      } else {
        el.turnLabel.textContent = `${state.opponentName.toUpperCase()}'S TURN:`;
      }
    }
  }

  // -----------------------------------------------------------
  // BOT GAME MODE (C++ Authoritative Bot Engine)
  // -----------------------------------------------------------
  function startBotGame() {
    const selectedDiff = document.querySelector('input[name="bot-diff"]:checked').value;
    state.gameMode = 'bot';
    state.botDifficulty = selectedDiff;
    state.myMark = 'X';
    state.board = [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '];
    state.currentTurn = 'X';
    state.status = 'ONGOING';
    state.winningLine = [];
    state.roomCode = null;
    state.opponentName = `Bot (${selectedDiff.toUpperCase()})`;
    state.waitingForOpponent = false;
    state.rematchRequested = false;

    // Arena HUD setup
    el.arenaPlayerXName.textContent = state.user.username;
    el.arenaPlayerOName.textContent = state.opponentName;
    el.arenaPlayerOSub.textContent = 'C++ ALGORITHM // BOT';
    el.roomCodeTag.classList.add('hidden');
    el.waitingOverlay.classList.add('hidden');
    el.gameOverOverlay.classList.add('hidden');

    switchView('arena');
    renderBoard();
  }

  async function handleCellClick(index) {
    if (state.board[index] !== ' ' && state.board[index] !== '') return;
    if (state.currentTurn !== state.myMark) return;
    if (state.status !== 'ONGOING') return;

    if (state.gameMode === 'bot') {
      // 1. Play user move
      state.board[index] = state.myMark;
      state.currentTurn = 'O';
      renderBoard();

      // Check if user won or drew
      const localWinner = checkLocalStatus(state.board);
      if (localWinner.status !== 'ONGOING') {
        state.status = localWinner.status;
        state.winningLine = localWinner.winningLine;
        renderBoard();
        handleGameOver();
        return;
      }

      // 2. Query C++ Server for Bot's Move using polymorphic BotStrategy
      try {
        const boardStr = state.board.map(c => c === ' ' ? ' ' : c).join('');
        const res = await fetch('/api/bot/move', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.token}`
          },
          body: JSON.stringify({
            difficulty: state.botDifficulty,
            board: boardStr,
            botMark: 'O'
          })
        });

        const data = await res.json();
        if (data.success && data.move >= 0 && data.move <= 8) {
          // Add slight tactical delay so bot doesn't feel instantaneous
          setTimeout(() => {
            state.board[data.move] = 'O';
            state.currentTurn = 'X';

            const afterBotStatus = checkLocalStatus(state.board);
            state.status = afterBotStatus.status;
            state.winningLine = afterBotStatus.winningLine;

            renderBoard();

            if (state.status !== 'ONGOING') {
              handleGameOver();
            }
          }, 350);
        }
      } catch {
        showToast('Error requesting bot move', true);
      }
    } else if (state.gameMode === 'pvp') {
      // Send move over WebSocket to C++ Server
      if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({
          type: 'move',
          cell: index
        }));
      }
    }
  }

  // Lightweight status checker helper for client responsiveness in bot mode
  function checkLocalStatus(board) {
    const combos = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    for (const [a, b, c] of combos) {
      if (board[a] !== ' ' && board[a] !== '' && board[a] === board[b] && board[a] === board[c]) {
        return {
          status: board[a] === 'X' ? 'X_WON' : 'O_WON',
          winningLine: [a, b, c]
        };
      }
    }
    const isFull = board.every(c => c === 'X' || c === 'O');
    if (isFull) {
      return { status: 'DRAW', winningLine: [] };
    }
    return { status: 'ONGOING', winningLine: [] };
  }

  async function handleGameOver() {
    let title = 'GAME OVER';
    let detail = '';
    let isWin = false;
    let isLoss = false;

    if (state.status === 'DRAW') {
      title = 'GRIDLOCK // DRAW';
      detail = 'No tactical advantage achieved. Grid saturated.';
    } else if (state.status === `${state.myMark}_WON`) {
      title = 'VICTORY SECURED';
      detail = `Alignment achieved by Operator ${state.user.username}.`;
      isWin = true;
    } else {
      title = 'TACTICAL DEFEAT';
      detail = `System claimed by ${state.opponentName}.`;
      isLoss = true;
    }

    el.verdictTitle.textContent = title;
    el.verdictTitle.className = `verdict-title ${isWin ? 'victory' : isLoss ? 'defeat' : 'draw'}`;
    el.verdictDetail.textContent = detail;
    el.rematchStatus.classList.add('hidden');
    el.gameOverOverlay.classList.remove('hidden');

    // If bot game, persist result to SQLite
    if (state.gameMode === 'bot') {
      try {
        await fetch('/api/matches/record', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.token}`
          },
          body: JSON.stringify({
            gameMode: 'bot',
            botDifficulty: state.botDifficulty,
            result: state.status
          })
        });
      } catch {}
    }
  }

  // -----------------------------------------------------------
  // ONLINE MULTIPLAYER (C++ Crow WebSocket Room Coordination)
  // -----------------------------------------------------------
  function connectWebSocket(roomCode) {
    if (state.ws) {
      state.ws.close();
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    state.ws = new WebSocket(wsUrl);

    state.ws.onopen = () => {
      // Handshake: Join room with auth token
      state.ws.send(JSON.stringify({
        type: 'join',
        roomCode: roomCode,
        token: state.token
      }));
    };

    state.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'room_state') {
          handleRoomStateUpdate(msg);
        } else if (msg.type === 'error') {
          showToast(msg.message, true);
        }
      } catch (err) {
        console.error('WS Parse Error', err);
      }
    };

    state.ws.onclose = () => {
      // If room was active and closed unexpectedly
      if (state.currentView === 'arena' && state.gameMode === 'pvp') {
        showToast('Multiplayer connection closed', true);
      }
    };

    state.ws.onerror = (err) => {
      console.error('WebSocket Error', err);
    };
  }

  function handleRoomStateUpdate(data) {
    state.roomCode = data.roomCode;
    state.status = data.status;
    state.currentTurn = data.currentTurn;
    state.winningLine = data.winningLine || [];

    // Parse board string from C++ server (e.g. "X  O     ")
    if (data.board && data.board.length === 9) {
      state.board = data.board.split('');
    }

    // Set players
    if (data.playerX) {
      el.arenaPlayerXName.textContent = data.playerX.username;
    }

    if (data.playerO) {
      el.arenaPlayerOName.textContent = data.playerO.username;
      el.arenaPlayerOSub.textContent = 'CHALLENGER // OPPONENT';
      state.opponentName = data.playerO.username;
      state.waitingForOpponent = false;
      el.waitingOverlay.classList.add('hidden');
    } else {
      el.arenaPlayerOName.textContent = 'WAITING...';
      el.arenaPlayerOSub.textContent = 'UNOCCUPIED SLOT';
      state.waitingForOpponent = true;
      if (state.isHost) {
        el.waitingCodeDisplay.textContent = data.roomCode;
        el.waitingOverlay.classList.remove('hidden');
      }
    }

    // Check myMark
    if (data.playerX && data.playerX.id === state.user.id) {
      state.myMark = 'X';
    } else if (data.playerO && data.playerO.id === state.user.id) {
      state.myMark = 'O';
    }

    // Handle rematch flags
    const opponentMark = (state.myMark === 'X') ? 'O' : 'X';
    const opponentRematch = (opponentMark === 'X')
      ? (data.playerX && data.playerX.rematchRequested)
      : (data.playerO && data.playerO.rematchRequested);

    if (opponentRematch) {
      el.rematchStatus.classList.remove('hidden');
    } else {
      el.rematchStatus.classList.add('hidden');
    }

    // Check Game Over
    if (state.status !== 'ONGOING') {
      renderBoard();
      handleGameOver();
    } else {
      el.gameOverOverlay.classList.add('hidden');
      renderBoard();
    }
  }

  async function createPrivateRoom() {
    try {
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${state.token}` }
      });
      const data = await res.json();
      if (!data.success) {
        showToast(data.message || 'Room creation failed', true);
        return;
      }

      state.gameMode = 'pvp';
      state.roomCode = data.roomCode;
      state.isHost = true;
      state.myMark = 'X';
      state.opponentName = 'Challenger';
      state.waitingForOpponent = true;
      state.status = 'ONGOING';
      state.board = [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '];
      state.winningLine = [];

      el.displayRoomCode.textContent = data.roomCode;
      el.roomCodeTag.classList.remove('hidden');
      el.arenaPlayerXName.textContent = state.user.username;
      el.arenaPlayerOName.textContent = 'WAITING...';
      el.waitingCodeDisplay.textContent = data.roomCode;
      el.waitingOverlay.classList.remove('hidden');
      el.gameOverOverlay.classList.add('hidden');

      switchView('arena');
      renderBoard();
      connectWebSocket(data.roomCode);
    } catch {
      showToast('Connection error creating room', true);
    }
  }

  async function joinPrivateRoom() {
    const code = el.joinRoomInput.value.trim().toUpperCase();
    if (!code) {
      showToast('Please enter a room code', true);
      return;
    }

    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.token}`
        },
        body: JSON.stringify({ roomCode: code })
      });

      const data = await res.json();
      if (!data.success) {
        showToast(data.message || 'Failed to join room', true);
        return;
      }

      state.gameMode = 'pvp';
      state.roomCode = code;
      state.isHost = false;
      state.myMark = 'O';
      state.waitingForOpponent = false;
      state.status = 'ONGOING';
      state.board = [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '];
      state.winningLine = [];

      el.displayRoomCode.textContent = code;
      el.roomCodeTag.classList.remove('hidden');
      el.waitingOverlay.classList.add('hidden');
      el.gameOverOverlay.classList.add('hidden');

      switchView('arena');
      renderBoard();
      connectWebSocket(code);
      el.joinRoomInput.value = '';
    } catch {
      showToast('Connection error joining room', true);
    }
  }

  // -----------------------------------------------------------
  // MATCH HISTORY
  // -----------------------------------------------------------
  async function loadMatchHistory() {
    try {
      const res = await fetch('/api/matches/history', {
        headers: { 'Authorization': `Bearer ${state.token}` }
      });
      const data = await res.json();
      if (!data.success || !data.matches || data.matches.length === 0) {
        el.historyTbody.innerHTML = `
          <tr>
            <td colspan="6" class="empty-state">No recorded matches found in database.</td>
          </tr>
        `;
        return;
      }

      el.historyTbody.innerHTML = data.matches.map(m => {
        let resClass = 'res-draw';
        let resText = 'DRAW';

        if (m.result === 'X_WON') {
          if (m.playerXId === state.user.id) {
            resClass = 'res-win';
            resText = 'VICTORY';
          } else {
            resClass = 'res-loss';
            resText = 'DEFEAT';
          }
        } else if (m.result === 'O_WON') {
          if (m.playerOId === state.user.id) {
            resClass = 'res-win';
            resText = 'VICTORY';
          } else {
            resClass = 'res-loss';
            resText = 'DEFEAT';
          }
        }

        const modeBadge = m.gameMode === 'bot'
          ? `BOT (${(m.botDifficulty || 'EASY').toUpperCase()})`
          : 'PVP ROOM';

        return `
          <tr>
            <td>#${m.id}</td>
            <td><span class="sector-badge">${modeBadge}</span></td>
            <td>${escapeHtml(m.playerXUsername)}</td>
            <td>${escapeHtml(m.playerOUsername || 'Bot')}</td>
            <td><span class="${resClass}">${resText}</span></td>
            <td>${m.createdAt || 'N/A'}</td>
          </tr>
        `;
      }).join('');
    } catch {
      el.historyTbody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state">Error retrieving match archives.</td>
        </tr>
      `;
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // -----------------------------------------------------------
  // EVENT LISTENERS
  // -----------------------------------------------------------

  // Auth Tabs
  el.tabLogin.addEventListener('click', () => {
    el.tabLogin.classList.add('active');
    el.tabRegister.classList.remove('active');
    el.loginForm.classList.remove('hidden');
    el.registerForm.classList.add('hidden');
  });

  el.tabRegister.addEventListener('click', () => {
    el.tabRegister.classList.add('active');
    el.tabLogin.classList.remove('active');
    el.registerForm.classList.remove('hidden');
    el.loginForm.classList.add('hidden');
  });

  // Login Submit
  el.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const usernameOrEmail = el.loginUsername.value.trim();
    const password = el.loginPassword.value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameOrEmail, password: password })
      });

      const data = await res.json();
      if (data.success) {
        state.token = data.token;
        state.user = data.user;
        localStorage.setItem('afterlight_token', data.token);
        updateUserUI();
        switchView('lobby');
        showToast(`Welcome back, Operator ${data.user.username}`);
      } else {
        showToast(data.message || 'Login failed', true);
      }
    } catch {
      showToast('Unable to connect to C++ authentication service', true);
    }
  });

  // Register Submit
  el.registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = el.regUsername.value.trim();
    const email = el.regEmail.value.trim();
    const password = el.regPassword.value;

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });

      const data = await res.json();
      if (data.success) {
        state.token = data.token;
        state.user = data.user;
        localStorage.setItem('afterlight_token', data.token);
        updateUserUI();
        switchView('lobby');
        showToast(`Account registered. Welcome, Operator ${data.user.username}`);
      } else {
        showToast(data.message || 'Registration failed', true);
      }
    } catch {
      showToast('Unable to connect to C++ registration service', true);
    }
  });

  // Logout
  el.logoutBtn.addEventListener('click', logout);

  // Navigation Buttons
  el.navLobbyBtn.addEventListener('click', () => {
    if (!state.token) return switchView('auth');
    if (state.ws) {
      state.ws.close();
      state.ws = null;
    }
    switchView('lobby');
  });

  el.navHistoryBtn.addEventListener('click', () => {
    if (!state.token) return switchView('auth');
    switchView('history');
  });

  el.historyBackBtn.addEventListener('click', () => {
    switchView('lobby');
  });

  // Lobby Action Buttons
  el.startBotBtn.addEventListener('click', startBotGame);
  el.createRoomBtn.addEventListener('click', createPrivateRoom);
  el.joinRoomBtn.addEventListener('click', joinPrivateRoom);

  // Board Cells
  el.cells.forEach(cell => {
    cell.addEventListener('click', () => {
      const idx = parseInt(cell.getAttribute('data-index'), 10);
      handleCellClick(idx);
    });
  });

  // Copy Room Code Handlers
  function copyText(txt) {
    navigator.clipboard.writeText(txt).then(() => {
      showToast(`Room code copied: ${txt}`);
    }).catch(() => {
      showToast(`Code: ${txt}`);
    });
  }

  el.copyRoomCodeBtn.addEventListener('click', () => {
    if (state.roomCode) copyText(state.roomCode);
  });

  el.copyWaitingCodeBtn.addEventListener('click', () => {
    if (state.roomCode) copyText(state.roomCode);
  });

  el.cancelRoomBtn.addEventListener('click', () => {
    if (state.ws) {
      state.ws.close();
      state.ws = null;
    }
    switchView('lobby');
  });

  // Rematch Button
  el.rematchBtn.addEventListener('click', () => {
    if (state.gameMode === 'bot') {
      startBotGame();
    } else if (state.gameMode === 'pvp') {
      if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({ type: 'rematch' }));
        showToast('Rematch request transmitted to challenger');
        el.rematchBtn.disabled = true;
      }
    }
  });

  // Exit Arena
  el.exitArenaBtn.addEventListener('click', () => {
    if (state.ws) {
      state.ws.close();
      state.ws = null;
    }
    switchView('lobby');
  });

  // Initialize
  checkExistingSession();
})();
