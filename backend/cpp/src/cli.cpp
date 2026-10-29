#include <iostream>
#include <string>
#include <vector>
#include <sstream>
#include <chrono>
#include <memory>
#include <stdexcept>
#include <utility>
#include "Board.hpp"
#include "Bots.hpp"
#include "Game.hpp"
#include "Templates.hpp"

using namespace afterlight;

// Helper to escape JSON string
std::string escapeJson(const std::string& s) {
    std::ostringstream o;
    for (char c : s) {
        if (c == '"') o << "\\\"";
        else if (c == '\\') o << "\\\\";
        else if (c == '\b') o << "\\b";
        else if (c == '\f') o << "\\f";
        else if (c == '\n') o << "\\n";
        else if (c == '\r') o << "\\r";
        else if (c == '\t') o << "\\t";
        else o << c;
    }
    return o.str();
}

// Validates a 9-character board string made only of 'X', 'O' and '.'.
// (Board's string constructor silently accepts anything; the CLI must not.)
static void requireValidBoard(const std::string& b) {
    if (b.size() != 9) {
        throw std::invalid_argument("Board must be exactly 9 characters (got " + std::to_string(b.size()) + ").");
    }
    for (char ch : b) {
        if (ch != 'X' && ch != 'O' && ch != '.') {
            throw std::invalid_argument("Board may only contain 'X', 'O' and '.'.");
        }
    }
}

static Cell requireMark(const std::string& s) {
    if (s.size() != 1) throw std::invalid_argument("Mark must be a single character 'X' or 'O'.");
    char ch = s[0];
    if (ch == 'x') ch = 'X';
    if (ch == 'o') ch = 'O';
    if (ch != 'X' && ch != 'O') throw std::invalid_argument("Mark must be 'X' or 'O'.");
    return charToCell(ch);
}

static int parseIntArg(const std::string& s, const char* what) {
    try {
        size_t used = 0;
        int v = std::stoi(s, &used);
        if (used != s.size()) throw std::invalid_argument("trailing characters");
        return v;
    } catch (const std::exception&) {
        throw std::invalid_argument(std::string("Invalid integer for ") + what + ": '" + s + "'");
    }
}

void handlePolymorphismCompare(const std::string& boardStr, Cell mark) {
    Board board(boardStr);

    std::vector<std::pair<std::string, std::unique_ptr<BotPlayer>>> bots;
    bots.push_back({"RandomBot", BotFactory::createBot("wanderer", mark)});
    bots.push_back({"StrategicBot", BotFactory::createBot("sentinel", mark)});
    bots.push_back({"UnbeatableBot", BotFactory::createBot("unbroken", mark)});

    std::cout << "{\n";
    std::cout << "  \"engine\": \"C++ 17 (GCC/Clang Native Binary)\",\n";
    std::cout << "  \"inputBoard\": \"" << board.toString() << "\",\n";
    std::cout << "  \"botMark\": \"" << cellToChar(mark) << "\",\n";
    std::cout << "  \"legalMoves\": [";
    auto legal = board.getLegalMoves();
    for (size_t i = 0; i < legal.size(); ++i) {
        std::cout << legal[i] << (i + 1 < legal.size() ? ", " : "");
    }
    std::cout << "],\n";
    std::cout << "  \"polymorphismResults\": [\n";

    for (size_t i = 0; i < bots.size(); ++i) {
        auto& item = bots[i];
        auto t0 = std::chrono::high_resolution_clock::now();
        int move = item.second->getMove(board);
        auto t1 = std::chrono::high_resolution_clock::now();
        double elapsedMs = std::chrono::duration<double, std::milli>(t1 - t0).count();
        auto exp = item.second->getLastExplanation();

        Board afterBoard = board.clone();
        afterBoard.placeMark(move, mark);

        std::cout << "    {\n";
        std::cout << "      \"className\": \"" << escapeJson(item.first) << "\",\n";
        std::cout << "      \"parentClass\": \"BotPlayer\",\n";
        std::cout << "      \"difficulty\": \"" << item.second->getDifficulty() << "\",\n";
        std::cout << "      \"polymorphicInterfaceCalled\": \"Player::getMove(const Board& board) -> int\",\n";
        std::cout << "      \"chosenMove\": " << move << ",\n";
        std::cout << "      \"executionTimeMs\": " << elapsedMs << ",\n";
        std::cout << "      \"boardAfterMove\": \"" << afterBoard.toString() << "\",\n";
        std::cout << "      \"explanation\": {\n";
        std::cout << "        \"algorithm\": \"" << escapeJson(exp.algorithm) << "\",\n";
        std::cout << "        \"principle\": \"" << escapeJson(exp.principle) << "\",\n";
        std::cout << "        \"chosenMove\": " << move << ",\n";
        std::cout << "        \"rationale\": \"" << escapeJson(exp.rationale) << "\",\n";
        std::cout << "        \"nodesEvaluated\": " << exp.nodesEvaluated << ",\n";
        std::cout << "        \"cutoffs\": " << exp.cutoffs << ",\n";
        std::cout << "        \"executionTimeMs\": " << elapsedMs << "\n";
        std::cout << "      }\n";
        std::cout << "    }" << (i + 1 < bots.size() ? ",\n" : "\n");
    }

    std::cout << "  ]\n";
    std::cout << "}\n";
}

void handleBotMove(const std::string& boardStr, const std::string& difficulty, Cell mark) {
    Board board(boardStr);
    auto bot = BotFactory::createBot(difficulty, mark);

    auto t0 = std::chrono::high_resolution_clock::now();
    int move = bot->getMove(board);
    auto t1 = std::chrono::high_resolution_clock::now();
    double elapsedMs = std::chrono::duration<double, std::milli>(t1 - t0).count();
    auto exp = bot->getLastExplanation();

    std::cout << "{\n";
    std::cout << "  \"engine\": \"C++ 17 (GCC/Clang Native Binary)\",\n";
    std::cout << "  \"move\": " << move << ",\n";
    std::cout << "  \"difficulty\": \"" << bot->getDifficulty() << "\",\n";
    std::cout << "  \"className\": \"" << (difficulty == "unbroken" ? "UnbeatableBot" : (difficulty == "sentinel" ? "StrategicBot" : "RandomBot")) << "\",\n";
    std::cout << "  \"executionTimeMs\": " << elapsedMs << ",\n";
    std::cout << "  \"board\": \"" << boardStr << "\",\n";
    std::cout << "  \"explanation\": {\n";
    std::cout << "    \"algorithm\": \"" << escapeJson(exp.algorithm) << "\",\n";
    std::cout << "    \"principle\": \"" << escapeJson(exp.principle) << "\",\n";
    std::cout << "    \"chosenMove\": " << move << ",\n";
    std::cout << "    \"rationale\": \"" << escapeJson(exp.rationale) << "\",\n";
    std::cout << "    \"nodesEvaluated\": " << exp.nodesEvaluated << ",\n";
    std::cout << "    \"cutoffs\": " << exp.cutoffs << ",\n";
    std::cout << "    \"executionTimeMs\": " << elapsedMs << "\n";
    std::cout << "  }\n";
    std::cout << "}\n";
}

void handleEncapsulationTest(const std::string& action, const std::string& boardStr, int position, Cell mark) {
    Board board(boardStr);
    std::cout << "{\n";
    std::cout << "  \"engine\": \"C++ 17 (GCC/Clang Native Binary)\",\n";

    try {
        if (action == "valid_move") {
            board.placeMark(position, mark);
            std::cout << "  \"success\": true,\n";
            std::cout << "  \"action\": \"" << action << "\",\n";
            std::cout << "  \"position\": " << position << ",\n";
            std::cout << "  \"methodCalled\": \"Board::placeMark(int, Cell)\",\n";
            std::cout << "  \"stateProtected\": true,\n";
            std::cout << "  \"resultingBoard\": \"" << board.toString() << "\",\n";
            std::cout << "  \"message\": \"Successfully placed '" << cellToChar(mark) << "' at cell " << position << ". C++ invariants satisfied.\"\n";
        } else if (action == "occupied_cell") {
            board.placeMark(position, mark);
            std::cout << "  \"success\": true,\n";
            std::cout << "  \"action\": \"" << action << "\",\n";
            std::cout << "  \"position\": " << position << ",\n";
            std::cout << "  \"resultingBoard\": \"" << board.toString() << "\"\n";
        } else if (action == "out_of_bounds") {
            board.placeMark(position, mark);
            std::cout << "  \"success\": true,\n";
            std::cout << "  \"action\": \"" << action << "\"\n";
        } else if (action == "post_game_move") {
            auto p1 = std::make_shared<HumanPlayer>("Alice", Cell::X);
            auto p2 = std::make_shared<HumanPlayer>("Bob", Cell::O);
            Game game(p1, p2);
            // X wins on column 0: 0, 3, 6
            p1->setNextMove(0); game.makeMove(*p1);
            p2->setNextMove(1); game.makeMove(*p2);
            p1->setNextMove(3); game.makeMove(*p1);
            p2->setNextMove(4); game.makeMove(*p2);
            p1->setNextMove(6); game.makeMove(*p1);
            // Attempt 6th move on completed game
            p2->setNextMove(8); game.makeMove(*p2);
            std::cout << "  \"success\": true\n";
        } else {
            std::cout << "  \"error\": \"Unknown action: " << action << "\"\n";
        }
    } catch (const OccupiedCellException& e) {
        std::cout << "  \"success\": false,\n";
        std::cout << "  \"action\": \"" << action << "\",\n";
        std::cout << "  \"position\": " << position << ",\n";
        std::cout << "  \"exceptionClass\": \"OccupiedCellException\",\n";
        std::cout << "  \"errorCode\": \"OCCUPIED_CELL\",\n";
        std::cout << "  \"errorMessage\": \"" << escapeJson(e.what()) << "\",\n";
        std::cout << "  \"methodEnforcingInvariant\": \"Board::placeMark()\",\n";
        std::cout << "  \"stateProtected\": true,\n";
        std::cout << "  \"explanation\": \"C++ Encapsulation prevented state corruption! The private m_grid array is strictly protected; the public mutator threw an OccupiedCellException.\"\n";
    } catch (const PositionOutOfBoundsException& e) {
        std::cout << "  \"success\": false,\n";
        std::cout << "  \"action\": \"" << action << "\",\n";
        std::cout << "  \"position\": " << position << ",\n";
        std::cout << "  \"exceptionClass\": \"PositionOutOfBoundsException\",\n";
        std::cout << "  \"errorCode\": \"OUT_OF_BOUNDS\",\n";
        std::cout << "  \"errorMessage\": \"" << escapeJson(e.what()) << "\",\n";
        std::cout << "  \"methodEnforcingInvariant\": \"Board::placeMark()\",\n";
        std::cout << "  \"stateProtected\": true,\n";
        std::cout << "  \"explanation\": \"C++ Encapsulation prevented state corruption! The bounds check failed and threw a PositionOutOfBoundsException.\"\n";
    } catch (const GameOverException& e) {
        std::cout << "  \"success\": false,\n";
        std::cout << "  \"action\": \"" << action << "\",\n";
        std::cout << "  \"exceptionClass\": \"GameOverException\",\n";
        std::cout << "  \"errorCode\": \"GAME_OVER\",\n";
        std::cout << "  \"errorMessage\": \"" << escapeJson(e.what()) << "\",\n";
        std::cout << "  \"methodEnforcingInvariant\": \"Game::makeMove()\",\n";
        std::cout << "  \"stateProtected\": true,\n";
        std::cout << "  \"explanation\": \"C++ Domain rules prevented moving in a finished game! Threw GameOverException.\"\n";
    } catch (const std::exception& e) {
        std::cout << "  \"success\": false,\n";
        std::cout << "  \"exceptionClass\": \"std::exception\",\n";
        std::cout << "  \"errorMessage\": \"" << escapeJson(e.what()) << "\"\n";
    }

    std::cout << "}\n";
}

void handleOperatorOverloadTest(const std::string& boardStr, int position, Cell mark) {
    Board b1(boardStr);
    Board b2(boardStr);
    Board b3(".........");

    // 1. operator[]
    Cell readCell = Cell::EMPTY;
    bool readInBounds = true;
    try {
        readCell = b1[position];
    } catch (const PositionOutOfBoundsException&) {
        readInBounds = false;
    }
    (void)readInBounds;
    bool caughtBounds = false;
    try {
        Cell dummy = b1[9]; // Out of bounds
        (void)dummy;
    } catch (const PositionOutOfBoundsException&) {
        caughtBounds = true;
    }

    // 2. operator== and operator!=
    bool eqSelf = (b1 == b2);
    bool neqDiff = (b1 != b3);

    // 3. operator+
    Move move(position, mark);
    std::string boardAfterAdd;
    bool addSuccess = false;
    try {
        Board bPlus = b1 + move;
        boardAfterAdd = bPlus.toString();
        addSuccess = true;
    } catch (const std::exception&) {
        boardAfterAdd = b1.toString();
    }

    // 4. operator+=
    std::string boardAfterCompound;
    bool compoundSuccess = false;
    Board bCompound = b1;
    try {
        bCompound += move;
        boardAfterCompound = bCompound.toString();
        compoundSuccess = true;
    } catch (const std::exception&) {
        boardAfterCompound = bCompound.toString();
    }

    // 5. operator<< stream formatting
    std::ostringstream ssBoard;
    ssBoard << b1;
    std::ostringstream ssMove;
    ssMove << move;

    std::cout << "{\n";
    std::cout << "  \"engine\": \"C++ 17 Native ISO Engine\",\n";
    std::cout << "  \"concept\": \"Operator Overloading\",\n";
    std::cout << "  \"initialBoard\": \"" << b1.toString() << "\",\n";
    std::cout << "  \"operators\": {\n";
    std::cout << "    \"subscript\": {\n";
    std::cout << "      \"signature\": \"Cell Board::operator[](int position)\",\n";
    std::cout << "      \"readIndex\": " << position << ",\n";
    std::cout << "      \"readValue\": \"" << cellToChar(readCell) << "\",\n";
    std::cout << "      \"boundsCheckEnforced\": " << (caughtBounds ? "true" : "false") << ",\n";
    std::cout << "      \"explanation\": \"Direct index access b[i] returns Cell reference with PositionOutOfBoundsException safeguard.\"\n";
    std::cout << "    },\n";
    std::cout << "    \"equality\": {\n";
    std::cout << "      \"signatures\": [\"bool operator==(const Board&) const\", \"bool operator!=(const Board&) const\"],\n";
    std::cout << "      \"b1_equals_b2\": " << (eqSelf ? "true" : "false") << ",\n";
    std::cout << "      \"b1_not_equals_empty\": " << (neqDiff ? "true" : "false") << ",\n";
    std::cout << "      \"explanation\": \"Deep grid state equality comparison between two Board instances in O(1) time.\"\n";
    std::cout << "    },\n";
    std::cout << "    \"addition\": {\n";
    std::cout << "      \"signature\": \"Board Board::operator+(const Move&) const\",\n";
    std::cout << "      \"moveApplied\": \"" << escapeJson(ssMove.str()) << "\",\n";
    std::cout << "      \"success\": " << (addSuccess ? "true" : "false") << ",\n";
    std::cout << "      \"resultBoard\": \"" << boardAfterAdd << "\",\n";
    std::cout << "      \"originalBoardUnchanged\": \"" << b1.toString() << "\",\n";
    std::cout << "      \"explanation\": \"Non-mutating state progression: board + move yields new Board while preserving immutability.\"\n";
    std::cout << "    },\n";
    std::cout << "    \"compoundAddition\": {\n";
    std::cout << "      \"signature\": \"Board& Board::operator+=(const Move&)\",\n";
    std::cout << "      \"success\": " << (compoundSuccess ? "true" : "false") << ",\n";
    std::cout << "      \"resultBoard\": \"" << boardAfterCompound << "\",\n";
    std::cout << "      \"explanation\": \"In-place mutating state application with domain rule invariant checks.\"\n";
    std::cout << "    },\n";
    std::cout << "    \"streamInsertion\": {\n";
    std::cout << "      \"signature\": \"std::ostream& operator<<(std::ostream&, const Board&)\",\n";
    std::cout << "      \"formattedStream\": \"" << escapeJson(ssBoard.str()) << "\",\n";
    std::cout << "      \"explanation\": \"Direct stream insertion allowing std::cout << board for formatted 3x3 visualization.\"\n";
    std::cout << "    }\n";
    std::cout << "  }\n";
    std::cout << "}\n";
}

void handleTemplatesTest() {
    // 1. Grid<Cell, 9>
    Grid<Cell, 9> cellGrid(Cell::EMPTY);
    cellGrid[0] = Cell::X;
    cellGrid[4] = Cell::O;
    cellGrid[8] = Cell::X;

    // 2. Grid<int, 9> (Heuristic weights)
    Grid<int, 9> weightGrid(2);
    weightGrid[0] = 3; weightGrid[2] = 3; weightGrid[6] = 3; weightGrid[8] = 3;
    weightGrid[4] = 4;

    // 3. HistoryBuffer<Move, 64>
    HistoryBuffer<Move, 64> history;
    history.push(Move(4, Cell::X));
    history.push(Move(0, Cell::O));
    history.push(Move(8, Cell::X));

    // 4. Function Template: clampScore<int> and clampScore<double>
    int clampedInt = clampScore<int>(1500, -1000, 1000);
    double clampedDouble = clampScore<double>(-12.5, -5.0, 5.0);

    // 5. Template Specialization: Grid<std::string, 9>
    Grid<std::string, 9> strGrid;
    strGrid[0] = "NorthWest";
    strGrid[4] = "CenterSanctum";
    strGrid[8] = "SouthEast";
    std::string joined = strGrid.join(" | ");

    std::cout << "{\n";
    std::cout << "  \"engine\": \"C++ 17 Native ISO Engine\",\n";
    std::cout << "  \"concept\": \"C++ Templates & Generics\",\n";
    std::cout << "  \"templates\": {\n";
    std::cout << "    \"classTemplateGrid\": {\n";
    std::cout << "      \"declaration\": \"template <typename T, std::size_t N = 9> class Grid\",\n";
    std::cout << "      \"instanceTypeCell\": \"Grid<Cell, 9>\",\n";
    std::cout << "      \"cellCountX\": " << cellGrid.count(Cell::X) << ",\n";
    std::cout << "      \"cellCountO\": " << cellGrid.count(Cell::O) << ",\n";
    std::cout << "      \"instanceTypeInt\": \"Grid<int, 9>\",\n";
    std::cout << "      \"centerWeight\": " << weightGrid[4] << ",\n";
    std::cout << "      \"explanation\": \"Type-independent fixed-size container encapsulating heap-free array with bounds checking.\"\n";
    std::cout << "    },\n";
    std::cout << "    \"classTemplateHistory\": {\n";
    std::cout << "      \"declaration\": \"template <typename T, std::size_t Capacity = 64> class HistoryBuffer\",\n";
    std::cout << "      \"instanceType\": \"HistoryBuffer<Move, 64>\",\n";
    std::cout << "      \"recordedMoves\": " << history.size() << ",\n";
    std::cout << "      \"lastMovePosition\": " << history[history.size() - 1].position << ",\n";
    std::cout << "      \"explanation\": \"Generic move-history log parameterizable across Move structs, strings, or audit events.\"\n";
    std::cout << "    },\n";
    std::cout << "    \"functionTemplateScoring\": {\n";
    std::cout << "      \"declaration\": \"template <typename ScoreT> ScoreT clampScore(ScoreT val, ScoreT min, ScoreT max)\",\n";
    std::cout << "      \"intResult\": " << clampedInt << ",\n";
    std::cout << "      \"doubleResult\": " << clampedDouble << ",\n";
    std::cout << "      \"explanation\": \"Generic mathematical algorithm instantiated at compile-time for both discrete and floating-point ratings.\"\n";
    std::cout << "    },\n";
    std::cout << "    \"templateSpecialization\": {\n";
    std::cout << "      \"declaration\": \"template <> class Grid<std::string, 9>\",\n";
    std::cout << "      \"specializedMethod\": \"std::string join(const std::string&)\",\n";
    std::cout << "      \"joinedSample\": \"" << escapeJson(joined) << "\",\n";
    std::cout << "      \"explanation\": \"Full explicit specialization optimizing string grid serialization with custom join API.\"\n";
    std::cout << "    }\n";
    std::cout << "  }\n";
    std::cout << "}\n";
}

void handleClassRegistry() {
    std::cout << "{\n";
    std::cout << "  \"engine\": \"C++ 17 (GCC/Clang Native Binary)\",\n";
    std::cout << "  \"classes\": [\n";
    std::cout << "    {\"name\": \"Board\", \"module\": \"backend/cpp/include/Board.hpp\", \"baseClasses\": [], \"isAbstract\": false, \"methods\": [\"placeMark\", \"clearMark\", \"getLegalMoves\", \"checkWinner\", \"operator[]\", \"operator==\", \"operator+\", \"operator+=\"]},\n";
    std::cout << "    {\"name\": \"Grid<T, N>\", \"module\": \"backend/cpp/include/Templates.hpp\", \"baseClasses\": [], \"isAbstract\": false, \"isTemplate\": true, \"methods\": [\"operator[]\", \"operator==\", \"count\", \"fill\"]},\n";
    std::cout << "    {\"name\": \"HistoryBuffer<T, Cap>\", \"module\": \"backend/cpp/include/Templates.hpp\", \"baseClasses\": [], \"isAbstract\": false, \"isTemplate\": true, \"methods\": [\"push\", \"pop\", \"operator[]\"]},\n";
    std::cout << "    {\"name\": \"Move\", \"module\": \"backend/cpp/include/Models.hpp\", \"baseClasses\": [], \"isAbstract\": false, \"methods\": [\"operator==\", \"operator!=\", \"operator<<\"]},\n";
    std::cout << "    {\"name\": \"Player\", \"module\": \"backend/cpp/include/Player.hpp\", \"baseClasses\": [], \"isAbstract\": true, \"methods\": [\"getMove\", \"getName\", \"getMark\"]},\n";
    std::cout << "    {\"name\": \"HumanPlayer\", \"module\": \"backend/cpp/include/Player.hpp\", \"baseClasses\": [\"Player\"], \"isAbstract\": false, \"methods\": [\"setNextMove\", \"getMove\"]},\n";
    std::cout << "    {\"name\": \"BotPlayer\", \"module\": \"backend/cpp/include/Bots.hpp\", \"baseClasses\": [\"Player\"], \"isAbstract\": true, \"methods\": [\"explainDecision\", \"getDifficulty\"]},\n";
    std::cout << "    {\"name\": \"RandomBot\", \"module\": \"backend/cpp/include/Bots.hpp\", \"baseClasses\": [\"BotPlayer\"], \"isAbstract\": false, \"methods\": [\"getMove\", \"explainDecision\"]},\n";
    std::cout << "    {\"name\": \"StrategicBot\", \"module\": \"backend/cpp/include/Bots.hpp\", \"baseClasses\": [\"BotPlayer\"], \"isAbstract\": false, \"methods\": [\"getMove\", \"explainDecision\"]},\n";
    std::cout << "    {\"name\": \"UnbeatableBot\", \"module\": \"backend/cpp/include/Bots.hpp\", \"baseClasses\": [\"BotPlayer\"], \"isAbstract\": false, \"methods\": [\"getMove\", \"explainDecision\", \"minimax\"]},\n";
    std::cout << "    {\"name\": \"Game\", \"module\": \"backend/cpp/include/Game.hpp\", \"baseClasses\": [], \"isAbstract\": false, \"methods\": [\"makeMove\", \"getCurrentPlayer\", \"getStatus\"]},\n";
    std::cout << "    {\"name\": \"BotFactory\", \"module\": \"backend/cpp/include/Bots.hpp\", \"baseClasses\": [], \"isAbstract\": false, \"methods\": [\"createBot\"]}\n";
    std::cout << "  ]\n";
    std::cout << "}\n";
}

static int run(int argc, char* argv[]) {
    if (argc < 2) {
        std::cerr << "{\"error\": \"No command specified\"}\n";
        return 1;
    }

    std::string cmd = argv[1];

    if (cmd == "polymorphism-compare" || cmd == "poly") {
        std::string board = (argc > 2) ? argv[2] : "X.O......";
        Cell mark = (argc > 3) ? requireMark(argv[3]) : Cell::O;
        requireValidBoard(board);
        handlePolymorphismCompare(board, mark);
    } else if (cmd == "bot-move" || cmd == "bot_move") {
        std::string board = (argc > 2) ? argv[2] : ".........";
        std::string diff = (argc > 3) ? argv[3] : "unbroken";
        Cell mark = (argc > 4) ? requireMark(argv[4]) : Cell::O;
        requireValidBoard(board);
        handleBotMove(board, diff, mark);
    } else if (cmd == "test-encapsulation" || cmd == "encap") {
        std::string action = (argc > 2) ? argv[2] : "occupied_cell";
        std::string board = (argc > 3) ? argv[3] : "X.O......";
        int pos = (argc > 4) ? parseIntArg(argv[4], "position") : 0;
        Cell mark = (argc > 5) ? requireMark(argv[5]) : Cell::X;
        requireValidBoard(board);
        handleEncapsulationTest(action, board, pos, mark);
    } else if (cmd == "test-operators" || cmd == "operators") {
        std::string board = (argc > 2) ? argv[2] : "X.O......";
        int pos = (argc > 3) ? parseIntArg(argv[3], "position") : 1;
        Cell mark = (argc > 4) ? requireMark(argv[4]) : Cell::X;
        requireValidBoard(board);
        handleOperatorOverloadTest(board, pos, mark);
    } else if (cmd == "test-templates" || cmd == "templates") {
        handleTemplatesTest();
    } else if (cmd == "class-registry") {
        handleClassRegistry();
    } else if (cmd == "status") {
        std::cout << "{\"engine\":\"C++ 17 Native\",\"status\":\"operational\"}\n";
    } else {
        std::cerr << "{\"error\": \"Unknown command: " << escapeJson(cmd) << "\"}\n";
        return 1;
    }

    return 0;
}

int main(int argc, char* argv[]) {
    // Any failure (bad input, unknown difficulty, full board...) becomes a JSON
    // error on stdout with a non-zero exit code instead of an uncaught-exception abort.
    try {
        return run(argc, argv);
    } catch (const std::exception& e) {
        std::cout << "{\"error\": \"" << escapeJson(e.what()) << "\"}\n";
        return 2;
    }
}
