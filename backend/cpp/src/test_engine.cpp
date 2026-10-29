#ifdef NDEBUG
#undef NDEBUG
#endif
#include <iostream>
#include <cassert>
#include <string>
#include <vector>
#include <memory>
#include "Board.hpp"
#include "Bots.hpp"
#include "Game.hpp"
#include "Templates.hpp"

using namespace afterlight;

static int g_passCount = 0;
static int g_failCount = 0;

#define TEST(name) \
    void test_##name(); \
    struct Register_##name { \
        Register_##name() { \
            std::cout << "Running " #name "... "; \
            try { \
                test_##name(); \
                std::cout << "PASSED\n"; \
                g_passCount++; \
            } catch (const std::exception& e) { \
                std::cout << "FAILED: " << e.what() << "\n"; \
                g_failCount++; \
            } \
        } \
    } reg_##name; \
    void test_##name()

// 1. Board initialized empty
TEST(board_default_empty) {
    Board b;
    for (int i = 0; i < 9; ++i) {
        assert(b.getCell(i) == Cell::EMPTY);
    }
    assert(b.toString() == ".........");
    assert(!b.isFull());
    assert(!b.isTerminal());
}

// 2. Board string constructor
TEST(board_from_string) {
    Board b("X.O.X.O.X");
    assert(b.getCell(0) == Cell::X);
    assert(b.getCell(1) == Cell::EMPTY);
    assert(b.getCell(2) == Cell::O);
    assert(b.toString() == "X.O.X.O.X");
}

// 3. Board place valid mark
TEST(board_place_valid_mark) {
    Board b;
    b.placeMark(4, Cell::X);
    assert(b.getCell(4) == Cell::X);
}

// 4. Board out of bounds throws exception
TEST(board_out_of_bounds_exception) {
    Board b;
    bool caught = false;
    try {
        b.placeMark(9, Cell::X);
    } catch (const PositionOutOfBoundsException&) {
        caught = true;
    }
    assert(caught);
}

// 5. Board occupied cell throws exception
TEST(board_occupied_cell_exception) {
    Board b;
    b.placeMark(0, Cell::X);
    bool caught = false;
    try {
        b.placeMark(0, Cell::O);
    } catch (const OccupiedCellException&) {
        caught = true;
    }
    assert(caught);
}

// 6. Board check winner rows, cols, diagonals
TEST(board_check_winner_lines) {
    Board rowWin("XXX......");
    auto resRow = rowWin.checkWinner();
    assert(resRow.first == Cell::X);

    Board colWin("O..O..O..");
    auto resCol = colWin.checkWinner();
    assert(resCol.first == Cell::O);

    Board diagWin("X...X...X");
    auto resDiag = diagWin.checkWinner();
    assert(resDiag.first == Cell::X);
}

// 7. Board is full & terminal
TEST(board_is_full_and_terminal) {
    Board fullBoard("XOXOXOXOX");
    assert(fullBoard.isFull());
    assert(fullBoard.isTerminal());
}

// 8. Board defensive copying
TEST(board_defensive_copying) {
    Board b;
    auto cells = b.getCells();
    cells[0] = Cell::X; // mutate copy
    assert(b.getCell(0) == Cell::EMPTY); // original untouched
}

// 9. Human player queued move
TEST(human_player_queue_move) {
    HumanPlayer p("Alice", Cell::X, "user-123");
    p.setNextMove(4);
    Board b;
    assert(p.getMove(b) == 4);
}

// 10. RandomBot selects only legal moves
TEST(random_bot_legal_selection) {
    RandomBot bot("Wanderer", Cell::O);
    Board b("X.O.X.O..");
    for (int i = 0; i < 20; ++i) {
        int m = bot.getMove(b);
        assert(b.getCell(m) == Cell::EMPTY);
    }
}

// 11. StrategicBot takes immediate win
TEST(strategic_bot_takes_win) {
    StrategicBot bot("Sentinel", Cell::O);
    Board b("OO.XX...."); // cell 2 gives immediate O win
    int m = bot.getMove(b);
    assert(m == 2);
}

// 12. StrategicBot blocks immediate opponent win
TEST(strategic_bot_blocks_win) {
    StrategicBot bot("Sentinel", Cell::O);
    Board b("XX.O....."); // X threatens win at cell 2
    int m = bot.getMove(b);
    assert(m == 2);
}

// 13. StrategicBot center control
TEST(strategic_bot_center_control) {
    StrategicBot bot("Sentinel", Cell::O);
    Board b("X........"); // center 4 is empty
    int m = bot.getMove(b);
    assert(m == 4);
}

// 14. UnbeatableBot vs RandomBot (30 matches - zero losses!)
TEST(unbeatable_vs_random_30_games) {
    UnbeatableBot ai("Unbroken", Cell::X);
    RandomBot rand("Random", Cell::O);

    int aiWins = 0, draws = 0;
    for (int g = 0; g < 30; ++g) {
        Board b;
        while (!b.isTerminal()) {
            int mX = ai.getMove(b);
            b.placeMark(mX, Cell::X);
            if (b.isTerminal()) break;
            int mO = rand.getMove(b);
            b.placeMark(mO, Cell::O);
        }
        auto win = b.checkWinner();
        assert(win.first != Cell::O); // AI NEVER LOSES
        if (win.first == Cell::X) aiWins++;
        else draws++;
    }
    assert(aiWins + draws == 30);
}

// 15. UnbeatableBot as Player O vs StrategicBot (5 matches - zero losses!)
TEST(unbeatable_vs_strategic_5_games) {
    StrategicBot strat("Sentinel", Cell::X);
    UnbeatableBot ai("Unbroken", Cell::O);

    for (int g = 0; g < 5; ++g) {
        Board b;
        while (!b.isTerminal()) {
            int mX = strat.getMove(b);
            b.placeMark(mX, Cell::X);
            if (b.isTerminal()) break;
            int mO = ai.getMove(b);
            b.placeMark(mO, Cell::O);
        }
        auto win = b.checkWinner();
        assert(win.first != Cell::X); // Sentinel CANNOT beat Unbroken
    }
}

// 16. UnbeatableBot self-play is 100% draw
TEST(unbeatable_self_play_always_draws) {
    UnbeatableBot aiX("X", Cell::X);
    UnbeatableBot aiO("O", Cell::O);

    Board b;
    while (!b.isTerminal()) {
        int mX = aiX.getMove(b);
        b.placeMark(mX, Cell::X);
        if (b.isTerminal()) break;
        int mO = aiO.getMove(b);
        b.placeMark(mO, Cell::O);
    }
    auto win = b.checkWinner();
    assert(win.first == Cell::EMPTY);
    assert(b.isFull()); // Perfect play in Tic-Tac-Toe is a Draw
}

// 17. Game aggregate turn validation
TEST(game_turn_validation) {
    auto pX = std::make_shared<HumanPlayer>("Alice", Cell::X);
    auto pO = std::make_shared<HumanPlayer>("Bob", Cell::O);
    Game g(pX, pO);

    assert(g.getCurrentTurn() == Cell::X);
    pX->setNextMove(0);
    g.makeMove(*pX);

    assert(g.getCurrentTurn() == Cell::O);
    assert(g.getBoard().getCell(0) == Cell::X);
}

// 18. Game throws NotYourTurnException
TEST(game_not_your_turn_exception) {
    auto pX = std::make_shared<HumanPlayer>("Alice", Cell::X);
    auto pO = std::make_shared<HumanPlayer>("Bob", Cell::O);
    Game g(pX, pO);

    bool caught = false;
    try {
        pO->setNextMove(0);
        g.makeMove(*pO); // O tries to move on X's turn
    } catch (const NotYourTurnException&) {
        caught = true;
    }
    assert(caught);
}

// 19. Game throws GameOverException
TEST(game_game_over_exception) {
    auto pX = std::make_shared<HumanPlayer>("Alice", Cell::X);
    auto pO = std::make_shared<HumanPlayer>("Bob", Cell::O);
    Game g(pX, pO);

    // Make X win: (0, 1, 2)
    pX->setNextMove(0); g.makeMove(*pX);
    pO->setNextMove(3); g.makeMove(*pO);
    pX->setNextMove(1); g.makeMove(*pX);
    pO->setNextMove(4); g.makeMove(*pO);
    pX->setNextMove(2); g.makeMove(*pX);

    assert(g.getStatus() == GameStatus::WON_X);

    bool caught = false;
    try {
        pX->setNextMove(8);
        g.makeMove(*pX);
    } catch (const GameOverException&) {
        caught = true;
    }
    assert(caught);
}

// 20. BotFactory instantiates correct subtypes
TEST(bot_factory_instantiation) {
    auto w = BotFactory::createBot("wanderer");
    assert(w->getDifficulty() == "wanderer");

    auto s = BotFactory::createBot("sentinel");
    assert(s->getDifficulty() == "sentinel");

    auto u = BotFactory::createBot("unbroken");
    assert(u->getDifficulty() == "unbroken");
}

// 21. Operator Overload: Subscript operator (board[i])
TEST(operator_subscript) {
    Board b("X.O......");
    assert(b[0] == Cell::X);
    assert(b[1] == Cell::EMPTY);
    assert(b[2] == Cell::O);

    // Mutable subscript
    b[4] = Cell::X;
    assert(b[4] == Cell::X);

    // Out of bounds throws PositionOutOfBoundsException
    bool caught = false;
    try {
        Cell val = b[9];
        (void)val;
    } catch (const PositionOutOfBoundsException&) {
        caught = true;
    }
    assert(caught);
}

// 22. Operator Overload: Equality and Inequality (==, !=)
TEST(operator_equality) {
    Board b1("X.O.X.O..");
    Board b2("X.O.X.O..");
    Board b3(".........");

    assert(b1 == b2);
    assert(b1 != b3);
    assert(!(b1 == b3));
}

// 23. Operator Overload: Move struct equality (==, !=)
TEST(operator_move_equality) {
    Move m1(4, Cell::X);
    Move m2(4, Cell::X);
    Move m3(4, Cell::O);

    assert(m1 == m2);
    assert(m1 != m3);
}

// 24. Operator Overload: Board addition (board + move)
TEST(operator_addition) {
    Board b1(".........");
    Move m(4, Cell::X);

    Board b2 = b1 + m;
    assert(b2[4] == Cell::X);
    assert(b1[4] == Cell::EMPTY); // Original remains unchanged (immutability)
}

// 25. Operator Overload: Board compound addition (board += move)
TEST(operator_compound_addition) {
    Board b(".........");
    b += Move(0, Cell::X);
    b += Move(1, Cell::O);

    assert(b[0] == Cell::X);
    assert(b[1] == Cell::O);
    assert(b[2] == Cell::EMPTY);
}

// 26. Operator Overload: Stream insertion (<<)
TEST(operator_stream_insertion) {
    Board b("X.O.X.O..");
    std::ostringstream ss;
    ss << b;
    std::string out = ss.str();
    assert(out.find("X") != std::string::npos);
    assert(out.find("O") != std::string::npos);
}

// 27. Class Template: Grid<T, N> generic container
TEST(template_grid_container) {
    Grid<int, 9> intGrid(0);
    assert(intGrid.size() == 9);
    intGrid[0] = 100;
    intGrid[8] = 200;
    assert(intGrid[0] == 100);
    assert(intGrid[8] == 200);

    Grid<Cell, 9> cellGrid(Cell::EMPTY);
    cellGrid[4] = Cell::X;
    assert(cellGrid.count(Cell::X) == 1);
    assert(cellGrid.count(Cell::EMPTY) == 8);
}

// 28. Class Template: HistoryBuffer<T, Cap> generic buffer
TEST(template_history_buffer) {
    HistoryBuffer<Move, 16> buf;
    assert(buf.empty());
    buf.push(Move(4, Cell::X));
    buf.push(Move(0, Cell::O));
    assert(buf.size() == 2);
    assert(buf[0].position == 4);

    Move popped = buf.pop();
    assert(popped.position == 0);
    assert(buf.size() == 1);
}

// 29. Function Template & Template Specialization
TEST(template_function_and_specialization) {
    // Function template: clampScore<T>
    int c1 = clampScore<int>(500, 0, 100);
    assert(c1 == 100);
    double c2 = clampScore<double>(-25.5, -10.0, 10.0);
    assert(c2 == -10.0);

    // Template specialization: Grid<std::string, 9>
    Grid<std::string, 9> strGrid;
    strGrid[0] = "A";
    strGrid[1] = "B";
    std::string joined = strGrid.join("-");
    assert(joined.find("A-B") != std::string::npos);
}

// 30. Bots must refuse to move on a finished game
TEST(bots_refuse_finished_board) {
    Board won("XXXOO....");
    bool threw = false;
    for (const char* d : {"wanderer", "sentinel", "unbroken"}) {
        auto bot = BotFactory::createBot(d, Cell::O);
        try { bot->getMove(won); } catch (const std::runtime_error&) { threw = true; }
        assert(threw);
        threw = false;
    }
}

// 31. Bots must reject an EMPTY mark (would silently play as both sides)
TEST(bots_reject_empty_mark) {
    Board b;
    bool threw = false;
    auto bot = BotFactory::createBot("unbroken", Cell::EMPTY);
    try { bot->getMove(b); } catch (const std::invalid_argument&) { threw = true; }
    assert(threw);
}

// 32. Unknown difficulty is rejected by the factory
TEST(bot_factory_unknown_difficulty) {
    bool threw = false;
    try { BotFactory::createBot("godlike", Cell::O); } catch (const std::invalid_argument&) { threw = true; }
    assert(threw);
}

// 33. Unbroken takes an immediate win and blocks an immediate loss
TEST(unbeatable_win_then_block) {
    UnbeatableBot o("T", Cell::O);
    assert(o.getMove(Board("OO.XX....")) == 2);   // wins at 2
    assert(o.getMove(Board("XX.O.....")) == 2);   // blocks X at 2
}

// 34. RandomBot is no longer seeded with a constant (sequence must vary between runs);
//     here we just verify it only ever returns legal cells over many calls.
TEST(random_bot_always_legal) {
    RandomBot r("R", Cell::O);
    Board b("XO.X.O...");
    for (int i = 0; i < 200; ++i) {
        int m = r.getMove(b);
        assert(b.getCell(m) == Cell::EMPTY);
    }
}

static const int TOTAL_TESTS_DECLARED = 34;

int main() {
    std::cout << "\n========================================\n";
    std::cout << "AFTERLIGHT C++ Test Suite (34 Tests)\n";
    std::cout << "========================================\n";
    std::cout << "Total Passed: " << g_passCount << " / " << TOTAL_TESTS_DECLARED << "\n";
    std::cout << "Total Failed: " << g_failCount << "\n";
    if (g_failCount == 0 && g_passCount == TOTAL_TESTS_DECLARED) {
        std::cout << "ALL " << TOTAL_TESTS_DECLARED << " C++ UNIT TESTS PASSED SUCCESSFULLY! (100% OK)\n";
        return 0;
    }
    return 1;
}
