import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { PolymorphismResultItem } from '../../types';
import {
  GraduationCap,
  Layers,
  ShieldAlert,
  GitBranch,
  Box,
  Cpu,
  CheckCircle,
  Play,
  Presentation,
  Terminal,
  AlertTriangle,
  Code2,
  FileCode,
  Shield
} from 'lucide-react';

export const OOPLabView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'hierarchy' | 'polymorphism' | 'encapsulation' | 'solid' | 'presentation' | 'tests'
  >('dashboard');

  // Polymorphism Demo State
  const [polyBoard, setPolyBoard] = useState('X.O......');
  const [polyMark, setPolyMark] = useState<'O' | 'X'>('O');
  const [polyResults, setPolyResults] = useState<PolymorphismResultItem[] | null>(null);
  const [polyLoading, setPolyLoading] = useState(false);

  // Encapsulation Demo State
  const [encapBoard, setEncapBoard] = useState('X........');
  const [encapAction, setEncapAction] = useState('occupied_cell');
  const [encapPos, setEncapPos] = useState(0);
  const [encapResult, setEncapResult] = useState<any>(null);
  const [encapLoading, setEncapLoading] = useState(false);

  // Tests runner state
  const [testResults, setTestResults] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);

  // Class Inspector Selected Node
  const [selectedClass, setSelectedClass] = useState<string>('UnbeatableBot');

  // Presentation Mode Slide index
  const [currentSlide, setCurrentSlide] = useState(0);

  // Run Polymorphism compare
  const runPolymorphismDemo = async (boardStr = polyBoard, markStr = polyMark) => {
    setPolyLoading(true);
    try {
      const res = await api.getPolymorphismDemo(boardStr, markStr);
      if (res && res.polymorphismResults) {
        setPolyResults(res.polymorphismResults);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPolyLoading(false);
    }
  };

  // Run Encapsulation test
  const runEncapsulationDemo = async (action = encapAction, boardStr = encapBoard, pos = encapPos) => {
    setEncapLoading(true);
    try {
      const res = await api.getEncapsulationDemo(action, boardStr, pos, 'O');
      setEncapResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setEncapLoading(false);
    }
  };

  // Run Automated Python Tests
  const runTestSuite = async () => {
    setTestLoading(true);
    try {
      const res = await api.runOopTests();
      setTestResults(res);
    } catch (e) {
      console.error(e);
    } finally {
      setTestLoading(false);
    }
  };

  useEffect(() => {
    runPolymorphismDemo();
    runEncapsulationDemo();
  }, []);

  const classData: Record<string, any> = {
    Board: {
      name: 'Board',
      module: 'backend/engine/board.py',
      parent: 'object',
      principles: ['Encapsulation', 'Single Responsibility', 'Defensive Copying'],
      role: 'Encapsulates the 3x3 grid geometry and maintains board invariants.',
      methods: [
        'place_mark(position: int, mark: Cell) -> None',
        'get_legal_moves() -> list[int]',
        'check_winner() -> tuple[Optional[Cell], Optional[tuple]]',
        'is_full() -> bool',
        'is_terminal() -> bool',
        'clone() -> Board',
      ],
      attributes: ['_grid: list[Cell] (Private)', 'WINNING_COMBINATIONS: tuple'],
      codeSnippet: `class Board:
    def __init__(self, initial_state: Optional[List[Cell]] = None):
        # Encapsulation: Private cell state (_grid) with defensive copying
        self._grid: List[Cell] = list(initial_state) if initial_state else [Cell.EMPTY]*9

    def place_mark(self, position: int, mark: Cell) -> None:
        self._validate_position(position)
        if self._grid[position] != Cell.EMPTY:
            raise OccupiedCellError(position, self._grid[position])
        self._grid[position] = mark`,
    },
    Player: {
      name: 'Player',
      module: 'backend/engine/player.py',
      parent: 'ABC (Abstract Base Class)',
      principles: ['Abstraction', 'Interface Segregation', 'Base Contract'],
      role: 'Abstract base class enforcing a stable get_move() interface for all participants.',
      methods: ['get_move(board: Board) -> int (Abstract)', 'to_dict() -> dict'],
      attributes: ['_name: str', '_mark: Cell'],
      codeSnippet: `class Player(ABC):
    def __init__(self, name: str, mark: Cell):
        self._name = name
        self._mark = mark

    @abstractmethod
    def get_move(self, board: Board) -> int:
        """Enforces uniform polymorphic contract across human & all bot tiers."""
        pass`,
    },
    HumanPlayer: {
      name: 'HumanPlayer',
      module: 'backend/engine/player.py',
      parent: 'Player',
      principles: ['Inheritance', 'Liskov Substitution'],
      role: 'Concrete Player implementation representing authenticated human users.',
      methods: ['set_next_move(move: int)', 'get_move(board: Board) -> int'],
      attributes: ['_user_id: Optional[str]', '_queued_move: Optional[int]'],
      codeSnippet: `class HumanPlayer(Player):
    def __init__(self, name: str, mark: Cell, user_id: Optional[str] = None):
        super().__init__(name=name, mark=mark)
        self._user_id = user_id
        self._queued_move = None

    def get_move(self, board: Board) -> int:
        if self._queued_move is None:
            raise ValueError("No move queued for human player.")
        return self._queued_move`,
    },
    BotPlayer: {
      name: 'BotPlayer',
      module: 'backend/engine/player.py',
      parent: 'Player, ABC',
      principles: ['Abstraction', 'Inheritance', 'Open/Closed'],
      role: 'Abstract base for AI agents; adds difficulty rating and decision introspection.',
      methods: ['explain_decision(board: Board, move: int) -> dict (Abstract)'],
      attributes: ['_difficulty: str'],
      codeSnippet: `class BotPlayer(Player, ABC):
    def __init__(self, name: str, mark: Cell, difficulty: str):
        super().__init__(name=name, mark=mark)
        self._difficulty = difficulty

    @abstractmethod
    def explain_decision(self, board: Board, move: int) -> Dict[str, Any]:
        """Provides academic introspection for the OOP Lab inspector."""
        pass`,
    },
    RandomBot: {
      name: 'RandomBot',
      module: 'backend/engine/bots.py',
      parent: 'BotPlayer',
      principles: ['Inheritance', 'Polymorphism', 'Liskov Substitution'],
      role: 'Tier 1 Wanderer bot that selects uniform random legal moves.',
      methods: ['get_move(board: Board) -> int', 'explain_decision(...) -> dict'],
      attributes: ['difficulty = "wanderer"'],
      codeSnippet: `class RandomBot(BotPlayer):
    def get_move(self, board: Board) -> int:
        legal_moves = board.get_legal_moves()
        return random.choice(legal_moves)`,
    },
    StrategicBot: {
      name: 'StrategicBot',
      module: 'backend/engine/bots.py',
      parent: 'BotPlayer',
      principles: ['Inheritance', 'Polymorphism', 'Rule Heuristics'],
      role: 'Tier 2 Sentinel bot executing prioritized strategic rules (Win -> Block -> Center -> Corner -> Edge).',
      methods: ['get_move(board: Board) -> int', '_evaluate_strategic_move(...)', 'explain_decision(...) -> dict'],
      attributes: ['CORNERS: tuple', 'EDGES: tuple', 'CENTER: int'],
      codeSnippet: `class StrategicBot(BotPlayer):
    def _evaluate_strategic_move(self, board: Board) -> Tuple[int, str]:
        # 1. Take immediate winning move
        # 2. Block immediate opponent win
        # 3. Take strategic center (4)
        # 4. Take opposite corner
        # 5. Take edge`,
    },
    UnbeatableBot: {
      name: 'UnbeatableBot',
      module: 'backend/engine/bots.py',
      parent: 'BotPlayer',
      principles: ['Inheritance', 'Polymorphism', 'Minimax Theorem', 'Alpha-Beta Pruning'],
      role: 'Tier 3 The Unbroken bot executing perfect game-tree search; mathematically proven unbeatable.',
      methods: ['get_move(board: Board) -> int', '_minimax(board, depth, is_maximizing, alpha, beta)', 'explain_decision(...) -> dict'],
      attributes: ['difficulty = "unbroken"', '_last_stats: dict'],
      codeSnippet: `class UnbeatableBot(BotPlayer):
    def _minimax(self, board: Board, depth: int, is_maximizing: bool, alpha: float, beta: float):
        winner, _ = board.check_winner()
        if winner == self.mark:
            return 10 - depth, nodes, cutoffs  # Prefer faster wins
        elif winner == self.mark.opponent():
            return -10 + depth, nodes, cutoffs # Delay losses
        elif board.is_full():
            return 0, nodes, cutoffs           # Draw

        # Recursively evaluate branches with alpha-beta cutoffs`,
    },
    Game: {
      name: 'Game',
      module: 'backend/engine/game.py',
      parent: 'object',
      principles: ['Composition (has-a Board, has-a Players)', 'Encapsulation', 'State Pattern'],
      role: 'Domain aggregate coordinating match turns, move legality, and outcome transitions.',
      methods: ['make_move(player: Player, position: int) -> dict', 'get_current_player() -> Player', 'cancel()', 'to_dict() -> dict'],
      attributes: ['_board: Board', '_player_x: Player', '_player_o: Player', '_current_turn: Cell', '_status: GameStatus'],
      codeSnippet: `class Game:
    def __init__(self, player_x: Player, player_o: Player, mode: str = "BOT"):
        # Composition: Game HAS-A Board, HAS-A Player X, HAS-A Player O
        self._board = Board()
        self._player_x = player_x
        self._player_o = player_o
        self._current_turn = Cell.X
        self._status = GameStatus.ACTIVE`,
    },
    GameService: {
      name: 'GameService',
      module: 'backend/engine/services.py',
      parent: 'object',
      principles: ['Dependency Inversion (DIP)', 'Service Layer Pattern', 'Separation of Concerns'],
      role: 'Coordinates game lifecycle and depends on abstract IGameRepository, not concrete database.',
      methods: ['create_bot_game(...) -> Game', 'play_move(...) -> dict'],
      attributes: ['_repository: IGameRepository'],
      codeSnippet: `class GameService:
    def __init__(self, repository: Optional[IGameRepository] = None):
        # Dependency Inversion: Depends on abstract IGameRepository interface
        self._repository = repository or InMemoryGameRepository()`,
    },
    BotFactory: {
      name: 'BotFactory',
      module: 'backend/engine/services.py',
      parent: 'object',
      principles: ['Factory Method Pattern', 'Open/Closed Principle'],
      role: 'Encapsulates polymorphic bot instantiation without exposing subclass details.',
      methods: ['create_bot(difficulty: str, mark: Cell, name: str) -> BotPlayer (Static)'],
      attributes: [],
      codeSnippet: `class BotFactory:
    @staticmethod
    def create_bot(difficulty: str, mark: Cell = Cell.O, name: Optional[str] = None) -> BotPlayer:
        if difficulty == "wanderer": return RandomBot(name=name or "Wanderer", mark=mark)
        elif difficulty == "sentinel": return StrategicBot(name=name or "Sentinel", mark=mark)
        elif difficulty == "unbroken": return UnbeatableBot(name=name or "The Unbroken", mark=mark)
        raise ValueError(f"Unknown difficulty {difficulty}")`,
    },
  };

  const presentationSlides = [
    {
      title: '1. Project Overview & Architecture',
      subtitle: 'AFTERLIGHT: Atmospheric Platform & Academic OOP Domain Engine',
      points: [
        'Objective: Build a production-grade, atmospheric platform showcasing clean Python Object-Oriented Programming (OOP).',
        'Decoupled Domain Layer: All game rules, invariant checks, heuristic strategies, and the Minimax algorithm are encapsulated inside a pure, framework-independent Python domain engine located in backend/engine/.',
        'Academic Focus: Dedicated OOP Lab allowing lecturers to inspect the real Python domain classes, run live polymorphism tests, test encapsulation invariants, and execute automated tests.',
      ],
      vivaTip: 'State clearly that game domain logic is decoupled in a pure Python layer and never hardcoded in client views.',
    },
    {
      title: '2. Four Pillars of OOP in AFTERLIGHT',
      subtitle: 'Encapsulation, Abstraction, Inheritance, and Polymorphism',
      points: [
        'Encapsulation: Board._grid is private. Mutations are strictly validated by place_mark() throwing domain exceptions (OccupiedCellError, PositionOutOfBoundsError).',
        'Abstraction: Player is an ABC defining the abstract method get_move(board: Board) -> int.',
        'Inheritance: Clean specialization hierarchy (Player -> BotPlayer -> RandomBot, StrategicBot, UnbeatableBot).',
        'Polymorphism: The Game engine calls player.get_move(board) uniformly without knowing whether the player is a human or which bot difficulty tier is active.',
      ],
      vivaTip: 'Demonstrate that adding a new bot subclass requires zero changes to the Game or Board classes.',
    },
    {
      title: '3. Composition over Inheritance',
      subtitle: 'Game has-a Board and has-a Player',
      points: [
        'Game does not inherit from Board. Instead, Game owns and coordinates a Board instance through composition.',
        'Game also owns references to Player X and Player O.',
        'This provides high cohesion and loose coupling: Board handles 3x3 geometry and win checks; Game handles match rules, turns, and outcomes.',
      ],
      vivaTip: 'Highlight that Board can be cloned independently by AI lookahead algorithms without cloning the whole Game aggregate.',
    },
    {
      title: '4. Live Polymorphism Demonstration',
      subtitle: 'Uniform Interface, Radically Different AI Behaviors',
      points: [
        'We execute all three bot tiers on the exact same board state via the Python backend CLI.',
        'RandomBot selects uniform stochastic moves (O(1) choice).',
        'StrategicBot applies rule heuristics (win detection, defense block, center dominance).',
        'UnbeatableBot executes Minimax with alpha-beta pruning to evaluate optimal minimax values.',
      ],
      vivaTip: 'Point out the execution times and decision rationales displayed live from the Python engine.',
    },
    {
      title: '5. Encapsulation & Domain Invariants',
      subtitle: 'State Invariant Protection with Custom Exceptions',
      points: [
        'Private grid storage (_grid) cannot be modified directly by client payloads.',
        'Board.place_mark() validates bounds and ensures cells are not overwritten.',
        'Game.make_move() enforces turn order and blocks moves after match completion.',
        'Domain exceptions (OccupiedCellError, GameOverError) provide clear, typed error handling.',
      ],
      vivaTip: 'Show how test-encapsulation prevents concurrent or illegal client moves from corrupting match state.',
    },
    {
      title: '6. SOLID Principles Pragmatically Applied',
      subtitle: 'S.O.L.I.D Architecture in AFTERLIGHT',
      points: [
        'Single Responsibility: Board (grid/win checks), Game (rules/turns), GameService (coordination), PlayerStatisticsService (metrics).',
        'Open/Closed: New bots can be created by subclassing BotPlayer without touching Game.',
        'Liskov Substitution: All bot subclasses can substitute for Player without breaking game execution.',
        'Interface Segregation: Focused repositories (IGameRepository, IPlayerProfileRepository).',
        'Dependency Inversion: GameService depends on abstract IGameRepository, not concrete SQLite.',
      ],
      vivaTip: 'Explain that SOLID principles prevent code rot and enable painless unit testing.',
    },
    {
      title: '7. Unbeatable Minimax AI with Alpha-Beta Pruning',
      subtitle: 'Mathematically Solved Game Engine',
      points: [
        'Tic-Tac-Toe has 255,168 possible games. It is a zero-sum solved game.',
        'The Unbroken assigns terminal utility: +10 - depth for faster wins, -10 + depth for delayed losses, 0 for draws.',
        'Alpha-Beta pruning cuts unpromising branches, reducing evaluations from 9! down to small branch subsets.',
        'Guaranteed result: The Unbroken NEVER loses. It wins or draws against any legal human play.',
      ],
      vivaTip: 'Mention that two optimal Minimax bots playing each other will mathematically always end in a draw.',
    },
    {
      title: '8. Relational Database & Repository Pattern',
      subtitle: 'ACID Persistence with SQLite Schemas',
      points: [
        'Relational tables: users, player_profiles, games, moves, friendships, friend_requests, game_invitations, notifications.',
        'Every single move is persisted with move number and timestamp for full match replayability.',
        'Transactions guarantee consistency between match outcomes, friend requests, and player statistics.',
      ],
      vivaTip: 'Point to backend/database.py and docs/DATABASE.md for the full ER diagram and foreign key constraints.',
    },
    {
      title: '9. Real-Time Multiplayer Architecture',
      subtitle: 'WebSockets with Authoritative Server Validation',
      points: [
        'Room creation with unique codes (e.g. MOON-74).',
        'Authoritative move execution: client sends intent; server checks turn order and legal position before broadcasting.',
        'Live rematch handshake requiring agreement from both players.',
      ],
      vivaTip: 'Emphasize that the server never trusts client-supplied winners or board state.',
    },
    {
      title: '10. Automated Testing & Verification Evidence',
      subtitle: '100% Pass Rate across 20 Domain & AI Tests',
      points: [
        'Comprehensive Python unittest suite (backend/tests/test_engine.py).',
        'Tests encapsulation invariants, polymorphism contracts, heuristic win/block accuracy.',
        '30 simulated matches against RandomBot and 5 matches against StrategicBot prove The Unbroken never loses.',
        'Live test suite runner built directly into the OOP Lab with 1-click execution.',
      ],
      vivaTip: 'Click the "Run Automated Python Tests" button right now to demonstrate live test execution to the lecturer!',
    },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8">
      
      {/* Top Banner */}
      <div className="surface-card rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full bg-[#172231] border border-[#293748] text-[#D99A4E] text-[11px] font-mono font-bold uppercase tracking-wider mb-2">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Academic Viva Examination Suite</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif text-[#DCE8F5] font-bold tracking-tight">
              AFTERLIGHT Object-Oriented Architecture Lab
            </h2>
            <p className="text-xs text-[#91A3B5] max-w-2xl mt-1 leading-relaxed">
              Interactive academic inspection of the four OOP pillars, SOLID design principles, Minimax AI game tree, and repository abstractions implemented in the Python domain engine.
            </p>
          </div>

          <button
            onClick={() => setActiveTab('presentation')}
            className="btn-amber-primary px-4 py-2.5 rounded-lg text-xs font-mono tracking-wider flex items-center space-x-2 cursor-pointer shrink-0"
          >
            <Presentation className="w-4 h-4" />
            <span>Lecturer Presentation Mode</span>
          </button>
        </div>
      </div>

      {/* Student Project Submission Card */}
      <div className="surface-card rounded-xl p-4 mb-6 border border-[#293748] bg-[#0c1322]/80 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-[#172231] border border-[#293748] flex items-center justify-center text-[#D99A4E] font-bold">
            CS
          </div>
          <div>
            <div className="text-[#DCE8F5] font-semibold">Course: CS204 Object Oriented Programming Lab</div>
            <div className="text-[#8795A7] text-[11px]">Academic Year 2024–2025 &bull; Semester IV (2nd Year B.Tech CSE)</div>
          </div>
        </div>
        <div className="flex items-center space-x-4 text-[11px] text-[#8795A7]">
          <div>
            <span className="text-[#D99A4E]">Topic:</span> 4 Pillars of OOP, Minimax AI & WebSockets
          </div>
          <div className="hidden sm:block text-[#293748]">|</div>
          <div>
            <span className="text-[#32C997]">Status:</span> Ready for Lab Evaluation
          </div>
        </div>
      </div>

      {/* Lab Nav Tabs */}
      <div className="flex overflow-x-auto space-x-2 pb-2 mb-6 border-b border-[#293748] scrollbar-none">
        {[
          { id: 'dashboard', label: '1. Pillars & Design', icon: Layers },
          { id: 'hierarchy', label: '2. Class Hierarchy', icon: GitBranch },
          { id: 'polymorphism', label: '3. Polymorphism Demo', icon: Cpu },
          { id: 'encapsulation', label: '4. Encapsulation Demo', icon: ShieldAlert },
          { id: 'solid', label: '5. SOLID Principles', icon: Box },
          { id: 'presentation', label: '6. Lecturer Presentation', icon: Presentation },
          { id: 'tests', label: '7. Automated Test Suite', icon: Terminal },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-mono whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#172231] text-[#D99A4E] border border-[#D99A4E]/40 font-bold shadow-sm'
                  : 'text-[#8795A7] hover:text-[#DCE8F5] hover:bg-[#111B2A]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: DASHBOARD & 4 PILLARS OVERVIEW */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <div>
            <h3 className="text-xs font-mono uppercase tracking-wider text-[#D99A4E] font-semibold mb-3">
              The Four Pillars of OOP in AFTERLIGHT
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="surface-card rounded-2xl p-5">
                <div className="flex items-center space-x-2.5 text-[#D99A4E] mb-2">
                  <ShieldAlert className="w-5 h-5" />
                  <h4 className="font-semibold text-sm text-[#DCE8F5] font-sans">1. Encapsulation</h4>
                </div>
                <p className="text-xs text-[#91A3B5] leading-relaxed mb-3">
                  The <code className="text-[#D99A4E]">Board</code> grid state is strictly private (<code className="text-[#DCE8F5]">_grid</code>). Callers cannot modify cells directly. The public method <code className="text-[#D99A4E]">place_mark()</code> validates cell boundaries and occupied states, throwing domain exceptions (<code className="text-[#DCE8F5]">OccupiedCellError</code>, <code className="text-[#DCE8F5]">PositionOutOfBoundsError</code>) to prevent invalid state corruption.
                </p>
                <div className="text-[10px] font-mono text-[#8795A7] pt-2 border-t border-[#293748]">
                  Key Files: <span className="text-[#DCE8F5]">backend/engine/board.py</span>, <span className="text-[#DCE8F5]">backend/engine/game.py</span>
                </div>
              </div>

              <div className="surface-card rounded-2xl p-5">
                <div className="flex items-center space-x-2.5 text-[#91B7CE] mb-2">
                  <Box className="w-5 h-5" />
                  <h4 className="font-semibold text-sm text-[#DCE8F5] font-sans">2. Abstraction</h4>
                </div>
                <p className="text-xs text-[#91A3B5] leading-relaxed mb-3">
                  <code className="text-[#D99A4E]">Player</code> is an Abstract Base Class (ABC) defining the abstract method <code className="text-[#DCE8F5]">get_move(board) -&gt; int</code>. The game engine does not care whether a move originates from human keyboard input, heuristic rule evaluation, or recursive Minimax search.
                </p>
                <div className="text-[10px] font-mono text-[#8795A7] pt-2 border-t border-[#293748]">
                  Key Files: <span className="text-[#DCE8F5]">backend/engine/player.py</span>
                </div>
              </div>

              <div className="surface-card rounded-2xl p-5">
                <div className="flex items-center space-x-2.5 text-[#32C997] mb-2">
                  <GitBranch className="w-5 h-5" />
                  <h4 className="font-semibold text-sm text-[#DCE8F5] font-sans">3. Inheritance</h4>
                </div>
                <p className="text-xs text-[#91A3B5] leading-relaxed mb-3">
                  A clean specialization hierarchy:
                  <br />
                  <code className="text-[#DCE8F5]">Player</code> &rarr; <code className="text-[#DCE8F5]">HumanPlayer</code>
                  <br />
                  <code className="text-[#DCE8F5]">Player</code> &rarr; <code className="text-[#DCE8F5]">BotPlayer</code> &rarr; <code className="text-[#D99A4E]">RandomBot</code> | <code className="text-[#D99A4E]">StrategicBot</code> | <code className="text-[#D99A4E]">UnbeatableBot</code>
                </p>
                <div className="text-[10px] font-mono text-[#8795A7] pt-2 border-t border-[#293748]">
                  Key Files: <span className="text-[#DCE8F5]">backend/engine/player.py</span>, <span className="text-[#DCE8F5]">backend/engine/bots.py</span>
                </div>
              </div>

              <div className="surface-card rounded-2xl p-5">
                <div className="flex items-center space-x-2.5 text-[#D99A4E] mb-2">
                  <Cpu className="w-5 h-5" />
                  <h4 className="font-semibold text-sm text-[#DCE8F5] font-sans">4. Polymorphism</h4>
                </div>
                <p className="text-xs text-[#91A3B5] leading-relaxed mb-3">
                  In <code className="text-[#D99A4E]">Game.make_move()</code>, the current player is invoked via <code className="text-[#DCE8F5]">player.get_move(board)</code>. At runtime, Python dynamically dispatches to the overridden method of the concrete subclass. Three completely different AI algorithms satisfy the same contract seamlessly.
                </p>
                <div className="text-[10px] font-mono text-[#8795A7] pt-2 border-t border-[#293748]">
                  Key Files: <span className="text-[#DCE8F5]">backend/engine/game.py</span>, <span className="text-[#DCE8F5]">backend/engine/bots.py</span>
                </div>
              </div>

            </div>
          </div>

          {/* Architectural Layers & Decoupling */}
          <div className="surface-card rounded-2xl p-6">
            <h3 className="text-xs font-mono uppercase tracking-wider text-[#D99A4E] font-semibold mb-3">
              Architectural Layers & Decoupling
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-[#080D16] border border-[#293748]">
                <span className="text-[#D99A4E] font-bold block mb-1">Domain Engine</span>
                <p className="text-[#91A3B5] text-[11px] leading-relaxed">
                  Board, Game, Player, Bots. 100% framework-independent pure Python.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#080D16] border border-[#293748]">
                <span className="text-[#D99A4E] font-bold block mb-1">Application Services</span>
                <p className="text-[#91A3B5] text-[11px] leading-relaxed">
                  GameService, PlayerStatisticsService, BotFactory. Orchestrates business logic.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#080D16] border border-[#293748]">
                <span className="text-[#D99A4E] font-bold block mb-1">Persistence Layer</span>
                <p className="text-[#91A3B5] text-[11px] leading-relaxed">
                  IGameRepository, SQLite relational schema, moves audit log.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#080D16] border border-[#293748]">
                <span className="text-[#D99A4E] font-bold block mb-1">Real-time / API</span>
                <p className="text-[#91A3B5] text-[11px] leading-relaxed">
                  WebSocket synchronization, REST endpoints, JSON-RPC bridge.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CLASS HIERARCHY EXPLORER */}
      {activeTab === 'hierarchy' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
          
          {/* Class List */}
          <div className="lg:col-span-5 space-y-2.5">
            <h3 className="text-[11px] font-mono uppercase tracking-wider text-[#8795A7] mb-1">
              Select Class to Inspect
            </h3>

            {Object.keys(classData).map((cName) => {
              const item = classData[cName];
              const isSelected = selectedClass === cName;
              return (
                <div
                  key={cName}
                  onClick={() => setSelectedClass(cName)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#172231] border-[#D99A4E] shadow-md shadow-[#D99A4E]/10 scale-[1.01]'
                      : 'bg-[#111B2A] border-[#293748] hover:border-[#91B7CE]/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-[#DCE8F5]">
                      {item.name}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#080D16] text-[#D99A4E] border border-[#293748]">
                      {item.parent}
                    </span>
                  </div>
                  <p className="text-xs text-[#91A3B5] mt-1 line-clamp-1">
                    {item.role}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {item.principles.map((p: string) => (
                      <span key={p} className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#080D16] text-[#8795A7] border border-[#293748]">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Details & Real Code */}
          <div className="lg:col-span-7">
            {selectedClass && classData[selectedClass] && (
              <div className="surface-card rounded-2xl p-6 backdrop-blur-xl">
                
                <div className="flex items-start justify-between pb-4 border-b border-[#293748]">
                  <div>
                    <h3 className="font-mono text-xl font-bold text-[#D99A4E]">
                      {classData[selectedClass].name}
                    </h3>
                    <p className="text-xs font-mono text-[#8795A7] mt-0.5">
                      Source: <span className="text-[#DCE8F5]">{classData[selectedClass].module}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-[#8795A7] block">Inherits:</span>
                    <span className="text-xs font-mono text-[#DCE8F5] font-semibold">
                      {classData[selectedClass].parent}
                    </span>
                  </div>
                </div>

                <div className="py-4 space-y-4 text-xs">
                  <div>
                    <span className="text-[#8795A7] font-mono uppercase text-[10px] tracking-wider block mb-1">
                      Primary Responsibility:
                    </span>
                    <p className="text-[#DCE8F5] bg-[#080D16] p-3 rounded-xl border border-[#293748] leading-relaxed">
                      {classData[selectedClass].role}
                    </p>
                  </div>

                  {/* Attributes & Methods */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-[#080D16] border border-[#293748] font-mono">
                      <span className="text-[10px] text-[#D99A4E] uppercase font-bold block mb-1.5">
                        Encapsulated Attributes
                      </span>
                      <ul className="space-y-1 text-[11px] text-[#DCE8F5]">
                        {classData[selectedClass].attributes.length > 0 ? (
                          classData[selectedClass].attributes.map((a: string) => (
                            <li key={a} className="flex items-center space-x-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#8795A7]" />
                              <span>{a}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-[#8795A7]">Stateless utility</li>
                        )}
                      </ul>
                    </div>

                    <div className="p-3 rounded-xl bg-[#080D16] border border-[#293748] font-mono">
                      <span className="text-[10px] text-[#32C997] uppercase font-bold block mb-1.5">
                        Public Methods Contract
                      </span>
                      <ul className="space-y-1 text-[11px] text-[#DCE8F5]">
                        {classData[selectedClass].methods.map((m: string) => (
                          <li key={m} className="flex items-center space-x-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#32C997]" />
                            <span>{m}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Python Source Code Snippet */}
                  <div>
                    <span className="text-[#8795A7] font-mono uppercase text-[10px] tracking-wider block mb-1.5">
                      Python Source Implementation:
                    </span>
                    <pre className="p-4 rounded-xl bg-[#080D16] border border-[#293748] text-xs font-mono text-[#32C997] overflow-x-auto leading-relaxed shadow-inner">
                      {classData[selectedClass].codeSnippet}
                    </pre>
                  </div>

                </div>

              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 3: LIVE POLYMORPHISM DEMO */}
      {activeTab === 'polymorphism' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="surface-card rounded-2xl p-6 backdrop-blur-md">
            
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-5 pb-4 border-b border-[#293748]">
              <div>
                <h3 className="text-base font-bold text-[#DCE8F5] font-mono flex items-center space-x-2">
                  <Cpu className="w-4 h-4 text-[#D99A4E]" />
                  <span>Live Polymorphic Interface Execution</span>
                </h3>
                <p className="text-xs text-[#91A3B5] mt-1">
                  Calls <code className="text-[#D99A4E]">player.get_move(board)</code> on three separate concrete subclasses (<code className="text-[#DCE8F5]">RandomBot</code>, <code className="text-[#DCE8F5]">StrategicBot</code>, <code className="text-[#DCE8F5]">UnbeatableBot</code>) through the real Python backend.
                </p>
              </div>

              {/* Presets */}
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono text-[#8795A7]">Presets:</span>
                {[
                  { label: 'Fork Threat', board: 'X.O...X..' },
                  { label: 'Immediate Win', board: 'OO.XX....' },
                  { label: 'Center Dominance', board: 'X........' },
                ].map((p) => (
                  <button
                    key={p.label}
                    onClick={() => {
                      setPolyBoard(p.board);
                      runPolymorphismDemo(p.board, polyMark);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#080D16] hover:bg-[#172231] border border-[#293748] text-[11px] font-mono text-[#DCE8F5] transition-colors cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input & Run */}
            <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4 mb-6">
              <div className="flex-1 w-full">
                <label className="block text-[10px] font-mono text-[#8795A7] uppercase mb-1">
                  Board String Representation (9 characters: X, O, .)
                </label>
                <input
                  type="text"
                  maxLength={9}
                  value={polyBoard}
                  onChange={(e) => setPolyBoard(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#080D16] border border-[#293748] text-[#DCE8F5] text-sm font-mono tracking-widest focus:outline-none focus:border-[#D99A4E]"
                />
              </div>

              <button
                onClick={() => runPolymorphismDemo()}
                disabled={polyLoading}
                className="btn-amber-primary w-full sm:w-auto mt-auto px-6 py-2.5 rounded-lg text-xs font-mono font-bold tracking-wider flex items-center justify-center space-x-2 cursor-pointer"
              >
                {polyLoading ? (
                  <span className="w-4 h-4 border-2 border-[#080D16] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Execute in Python</span>
                  </>
                )}
              </button>
            </div>

            {/* 3 Bots Side-by-Side Comparison */}
            {polyResults && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {polyResults.map((res) => (
                  <div
                    key={res.className}
                    className="p-4 rounded-xl bg-[#080D16] border border-[#293748] flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#293748]">
                        <span className="font-mono text-sm font-bold text-[#DCE8F5]">
                          {res.className}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#111B2A] text-[#D99A4E] border border-[#293748]">
                          {res.difficulty}
                        </span>
                      </div>

                      <div className="text-[10px] font-mono text-[#8795A7] mb-2">
                        Called: <span className="text-[#DCE8F5]">{res.polymorphicInterfaceCalled}</span>
                      </div>

                      <div className="p-3 rounded-lg bg-[#111B2A] border border-[#293748] mb-3 text-center">
                        <span className="text-[10px] font-mono text-[#8795A7] block">Returned Move:</span>
                        <span className="text-xl font-bold font-mono text-[#D99A4E]">
                          Cell {res.chosenMove}
                        </span>
                        <span className="text-[10px] text-[#8795A7] block font-mono">
                          Execution: {res.executionTimeMs} ms
                        </span>
                      </div>

                      <p className="text-xs text-[#91A3B5] bg-[#111B2A] p-3 rounded-lg border border-[#293748] leading-relaxed font-mono text-[11px]">
                        {res.explanation.rationale}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-[#293748] text-[10px] font-mono text-[#8795A7]">
                      Algorithm: <span className="text-[#DCE8F5]">{res.explanation.algorithm}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      )}

      {/* TAB 4: LIVE ENCAPSULATION DEMO */}
      {activeTab === 'encapsulation' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="surface-card rounded-2xl p-6 backdrop-blur-md">
            <h3 className="text-base font-bold text-[#DCE8F5] font-mono flex items-center space-x-2 mb-2">
              <ShieldAlert className="w-4 h-4 text-[#D99A4E]" />
              <span>Encapsulation & Domain Invariant Protection</span>
            </h3>
            <p className="text-xs text-[#91A3B5] mb-6">
              Test how the domain engine prevents illegal state mutations through strict method invariants and domain exceptions.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
              {[
                {
                  id: 'occupied_cell',
                  label: 'Try Occupied Cell',
                  desc: 'Attempts placing mark in cell 0 which already has X',
                  pos: 0,
                  board: 'X........',
                },
                {
                  id: 'out_of_bounds',
                  label: 'Try Out-of-Bounds',
                  desc: 'Attempts placing mark at index 9 (bounds 0..8)',
                  pos: 9,
                  board: '.........',
                },
                {
                  id: 'post_game_move',
                  label: 'Move After Game Over',
                  desc: 'Attempts move on completed match',
                  pos: 8,
                  board: 'XXX......',
                },
                {
                  id: 'valid_move',
                  label: 'Valid Legal Move',
                  desc: 'Places mark in empty cell 4 (Center)',
                  pos: 4,
                  board: 'X........',
                },
              ].map((test) => (
                <button
                  key={test.id}
                  onClick={() => {
                    setEncapAction(test.id);
                    setEncapPos(test.pos);
                    setEncapBoard(test.board);
                    runEncapsulationDemo(test.id, test.board, test.pos);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    encapAction === test.id
                      ? 'bg-[#172231] border-[#D99A4E] text-[#DCE8F5]'
                      : 'bg-[#080D16] border-[#293748] text-[#8795A7] hover:bg-[#111B2A]'
                  }`}
                >
                  <span className="font-mono text-xs font-bold block mb-1 text-[#D99A4E]">
                    {test.label}
                  </span>
                  <span className="text-[10px] text-[#8795A7] leading-tight block font-sans">
                    {test.desc}
                  </span>
                </button>
              ))}
            </div>

            {encapResult && (
              <div className="p-5 rounded-xl bg-[#080D16] border border-[#293748] font-mono text-xs">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#293748]">
                  <div className="flex items-center space-x-2">
                    {encapResult.success ? (
                      <CheckCircle className="w-4 h-4 text-[#32C997]" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-[#D99A4E]" />
                    )}
                    <span className="font-bold text-[#DCE8F5]">
                      {encapResult.success ? 'Operation Permitted' : 'Invariant Enforced & Exception Raised'}
                    </span>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-[#111B2A] text-[#D99A4E]">
                    State Protected: 100%
                  </span>
                </div>

                {!encapResult.success ? (
                  <div className="space-y-3">
                    <div>
                      <span className="text-[#8795A7] text-[10px] uppercase">Exception Class:</span>
                      <p className="text-[#F16D78] font-bold text-sm">{encapResult.exceptionClass}</p>
                    </div>

                    <div>
                      <span className="text-[#8795A7] text-[10px] uppercase">Error Message:</span>
                      <p className="text-[#DCE8F5] bg-[#111B2A] p-2.5 rounded-lg border border-[#293748]">
                        {encapResult.errorMessage}
                      </p>
                    </div>

                    <div>
                      <span className="text-[#8795A7] text-[10px] uppercase">Enforcing Domain Method:</span>
                      <p className="text-[#D99A4E]">{encapResult.methodEnforcingInvariant}</p>
                    </div>

                    <div>
                      <span className="text-[#8795A7] text-[10px] uppercase">Academic Explanation:</span>
                      <p className="text-[#91A3B5] leading-relaxed">{encapResult.explanation}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[#32C997] font-semibold">{encapResult.message}</p>
                    <p className="text-[#DCE8F5]">Resulting Board: <code className="text-[#D99A4E]">{encapResult.resultingBoard}</code></p>
                    <p className="text-[11px] text-[#8795A7]">Method Called: {encapResult.methodCalled}</p>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* TAB 5: SOLID PRINCIPLES MATRIX */}
      {activeTab === 'solid' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="surface-card rounded-2xl p-6 backdrop-blur-md">
            <h3 className="text-base font-bold text-[#DCE8F5] font-mono flex items-center space-x-2 mb-2">
              <Box className="w-4 h-4 text-[#D99A4E]" />
              <span>SOLID Principles Implementation Matrix</span>
            </h3>
            <p className="text-xs text-[#91A3B5] mb-6">
              Exact mapping between SOLID principles and real source files in the AFTERLIGHT engine.
            </p>

            <div className="space-y-3 font-mono text-xs">
              {[
                {
                  letter: 'S',
                  name: 'Single Responsibility Principle',
                  class: 'Board, Game, GameService, PlayerStatisticsService',
                  file: 'backend/engine/board.py, game.py, services.py',
                  desc: 'Board only handles 3x3 grid geometry and line wins. Game only handles turn logic and player coordination. GameService handles persistence. PlayerStatisticsService computes player metrics.',
                },
                {
                  letter: 'O',
                  name: 'Open / Closed Principle',
                  class: 'BotPlayer, BotFactory',
                  file: 'backend/engine/player.py, bots.py, services.py',
                  desc: 'New bot intelligence algorithms (e.g. MCTSBot, GeneticBot) can be added by extending BotPlayer without modifying a single line of Game or Board code.',
                },
                {
                  letter: 'L',
                  name: 'Liskov Substitution Principle',
                  class: 'HumanPlayer, RandomBot, StrategicBot, UnbeatableBot',
                  file: 'backend/engine/player.py, bots.py',
                  desc: 'Every concrete player class can substitute for Player in Game.make_move(player) without altering the correctness or flow of the game.',
                },
                {
                  letter: 'I',
                  name: 'Interface Segregation Principle',
                  class: 'IGameRepository, IPlayerProfileRepository, IFriendshipRepository',
                  file: 'backend/engine/repositories.py',
                  desc: 'Clients depend only on small, focused repository interfaces rather than one monolithic database interface.',
                },
                {
                  letter: 'D',
                  name: 'Dependency Inversion Principle',
                  class: 'GameService -> IGameRepository',
                  file: 'backend/engine/services.py, repositories.py',
                  desc: 'GameService depends on the abstract IGameRepository interface. In-memory and SQLite repository implementations are injected at runtime.',
                },
              ].map((s) => (
                <div key={s.letter} className="p-4 rounded-xl bg-[#080D16] border border-[#293748]">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="w-6 h-6 rounded-md bg-[#D99A4E] text-[#080D16] font-bold text-xs flex items-center justify-center">
                      {s.letter}
                    </span>
                    <span className="font-bold text-sm text-[#DCE8F5] font-sans">{s.name}</span>
                  </div>
                  <p className="text-xs text-[#91A3B5] leading-relaxed mb-2 font-sans">
                    {s.desc}
                  </p>
                  <div className="text-[11px] text-[#8795A7] flex flex-wrap gap-x-4">
                    <span>Classes: <strong className="text-[#D99A4E]">{s.class}</strong></span>
                    <span>File: <strong className="text-[#DCE8F5]">{s.file}</strong></span>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* TAB 6: LECTURER PRESENTATION MODE (VIVA) */}
      {activeTab === 'presentation' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="surface-card rounded-2xl p-6 sm:p-8 backdrop-blur-2xl relative">
            
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#293748]">
              <span className="text-xs font-mono uppercase text-[#D99A4E] font-bold tracking-widest">
                Slide {currentSlide + 1} of {presentationSlides.length}
              </span>
              <div className="flex items-center space-x-2">
                <button
                  disabled={currentSlide === 0}
                  onClick={() => setCurrentSlide(c => Math.max(0, c - 1))}
                  className="px-3 py-1.5 rounded-lg bg-[#080D16] border border-[#293748] text-xs font-mono text-[#DCE8F5] disabled:opacity-30 cursor-pointer"
                >
                  Previous
                </button>
                <button
                  disabled={currentSlide === presentationSlides.length - 1}
                  onClick={() => setCurrentSlide(c => Math.min(presentationSlides.length - 1, c + 1))}
                  className="btn-amber-primary px-4 py-1.5 rounded-lg text-xs font-mono disabled:opacity-30 cursor-pointer"
                >
                  Next Slide
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-2xl font-serif font-bold text-[#DCE8F5]">
                  {presentationSlides[currentSlide].title}
                </h3>
                <p className="text-sm font-mono text-[#D99A4E] mt-1">
                  {presentationSlides[currentSlide].subtitle}
                </p>
              </div>

              <div className="py-4 space-y-3">
                {presentationSlides[currentSlide].points.map((pt, i) => (
                  <div key={i} className="flex items-start space-x-3 p-3.5 rounded-xl bg-[#080D16] border border-[#293748]">
                    <span className="w-5 h-5 rounded-full bg-[#D99A4E]/20 text-[#D99A4E] font-mono text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-xs text-[#91A3B5] leading-relaxed font-sans">
                      {pt}
                    </p>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-[#080D16] border border-[#D99A4E]/40 text-xs font-mono">
                <span className="text-[#D99A4E] font-bold block mb-1">
                  Oral Viva Presentation Tip:
                </span>
                <p className="text-[#DCE8F5] leading-relaxed">
                  "{presentationSlides[currentSlide].vivaTip}"
                </p>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* TAB 7: AUTOMATED TEST SUITE RUNNER */}
      {activeTab === 'tests' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="surface-card rounded-2xl p-6 backdrop-blur-md">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-[#293748]">
              <div>
                <h3 className="text-base font-bold text-[#DCE8F5] font-mono flex items-center space-x-2">
                  <Terminal className="w-4 h-4 text-[#D99A4E]" />
                  <span>Automated Python Test Suite Execution</span>
                </h3>
                <p className="text-xs text-[#91A3B5] mt-1">
                  Executes <code className="text-[#DCE8F5]">backend/tests/test_engine.py</code> via Python 3.10 unittest on the server.
                </p>
              </div>

              <button
                onClick={runTestSuite}
                disabled={testLoading}
                className="btn-amber-primary px-5 py-2.5 rounded-lg text-xs font-mono tracking-wider flex items-center space-x-2 cursor-pointer"
              >
                {testLoading ? (
                  <span className="w-4 h-4 border-2 border-[#080D16] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Run All 20 Python Tests</span>
                  </>
                )}
              </button>
            </div>

            {testResults ? (
              <div className="space-y-3 font-mono text-xs">
                <div className={`p-4 rounded-xl border flex items-center space-x-3 ${
                  testResults.success
                    ? 'bg-[#32C997]/10 border-[#32C997]/30 text-[#32C997]'
                    : 'bg-[#F16D78]/10 border-[#F16D78]/30 text-[#F16D78]'
                }`}>
                  <CheckCircle className="w-5 h-5 text-[#32C997] shrink-0" />
                  <div>
                    <span className="font-bold block text-sm">{testResults.summary}</span>
                    <span className="text-[11px] opacity-80">Exit Code: {testResults.exitCode}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#080D16] border border-[#293748] overflow-x-auto text-[#32C997]">
                  <pre className="text-[11px] leading-relaxed whitespace-pre-wrap">
                    {testResults.output}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-[#8795A7] font-mono text-xs">
                <Terminal className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#D99A4E]" />
                Click "Run All 20 Python Tests" to verify the domain engine and AI algorithms in real time.
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
