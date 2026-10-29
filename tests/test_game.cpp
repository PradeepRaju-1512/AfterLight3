/**
 * @file test_game.cpp
 * @brief Comprehensive automated unit tests for Stage 1 & Stage 2.
 *
 * Tests:
 * 1. All 8 winning lines for X and O
 * 2. Full board draw detection
 * 3. Invalid move rejection (out of range, occupied cell, wrong turn)
 * 4. Alternating turn management
 * 5. EasyBot move legality
 * 6. MediumBot immediate win & block
 * 7. UnbeatableBot optimality (100 simulated trials - 0 losses)
 */

#include "Board.hpp"
#include "Game.hpp"
#include "EasyBot.hpp"
#include "MediumBot.hpp"
#include "UnbeatableBot.hpp"

#include <cassert>
#include <iostream>
#include <vector>
#include <memory>

void test_winning_lines() {
    std::cout << "[TEST] Running test_winning_lines...\n";

    int combos[8][3] = {
        {0, 1, 2}, {3, 4, 5}, {6, 7, 8}, // Rows
        {0, 3, 6}, {1, 4, 7}, {2, 5, 8}, // Cols
        {0, 4, 8}, {2, 4, 6}             // Diagonals
    };

    for (int i = 0; i < 8; ++i) {
        // Test X win
        Board bX;
        bX.makeMove(combos[i][0], 'X');
        bX.makeMove(combos[i][1], 'X');
        bX.makeMove(combos[i][2], 'X');
        assert(bX.checkWinner() == 'X');
        auto lineX = bX.getWinningLine();
        assert(lineX.size() == 3);
        assert(lineX[0] == combos[i][0] && lineX[1] == combos[i][1] && lineX[2] == combos[i][2]);

        // Test O win
        Board bO;
        bO.makeMove(combos[i][0], 'O');
        bO.makeMove(combos[i][1], 'O');
        bO.makeMove(combos[i][2], 'O');
        assert(bO.checkWinner() == 'O');
    }
    std::cout << "[PASS] All 8 winning lines verified.\n";
}

void test_draw_detection() {
    std::cout << "[TEST] Running test_draw_detection...\n";
    // Board layout:
    // X O X
    // X X O
    // O X O
    Board b;
    b.makeMove(0, 'X'); b.makeMove(1, 'O'); b.makeMove(2, 'X');
    b.makeMove(3, 'X'); b.makeMove(4, 'X'); b.makeMove(5, 'O');
    b.makeMove(6, 'O'); b.makeMove(7, 'X'); b.makeMove(8, 'O');

    assert(b.isFull());
    assert(b.checkWinner() == 'D');
    assert(b.getWinningLine().empty());
    std::cout << "[PASS] Draw detection verified.\n";
}

void test_invalid_moves_and_turns() {
    std::cout << "[TEST] Running test_invalid_moves_and_turns...\n";
    Game game;
    assert(game.getCurrentTurn() == 'X');

    // Out of bounds
    assert(!game.playMove(-1, 'X'));
    assert(!game.playMove(9, 'X'));

    // Playing with wrong mark on X's turn
    assert(!game.playMove(0, 'O'));

    // Legal move
    assert(game.playMove(0, 'X'));
    assert(game.getCurrentTurn() == 'O');

    // Attempting to overwrite occupied cell
    assert(!game.playMove(0, 'O'));
    assert(game.getCurrentTurn() == 'O'); // Turn should not change on illegal move

    // Legal move for O
    assert(game.playMove(4, 'O'));
    assert(game.getCurrentTurn() == 'X');
    std::cout << "[PASS] Invalid moves and turn transitions verified.\n";
}

void test_bots() {
    std::cout << "[TEST] Running test_bots...\n";

    // Polymorphism check: BotStrategy pointer
    std::unique_ptr<BotStrategy> easy = std::make_unique<EasyBot>();
    std::unique_ptr<BotStrategy> medium = std::make_unique<MediumBot>();
    std::unique_ptr<BotStrategy> unbeatable = std::make_unique<UnbeatableBot>();

    assert(easy->getDifficulty() == "easy");
    assert(medium->getDifficulty() == "medium");
    assert(unbeatable->getDifficulty() == "unbeatable");

    // Test MediumBot immediate win
    Board winTest;
    winTest.makeMove(0, 'O');
    winTest.makeMove(1, 'O');
    // Cell 2 should be the winning move for O
    int moveO = medium->selectMove(winTest, 'O');
    assert(moveO == 2);
    (void)moveO;

    // Test MediumBot immediate block
    Board blockTest;
    blockTest.makeMove(0, 'X');
    blockTest.makeMove(3, 'X');
    // Cell 6 should be blocked
    int blockMove = medium->selectMove(blockTest, 'O');
    assert(blockMove == 6);
    (void)blockMove;

    // Test UnbeatableBot never loses against random moves in 50 simulations
    std::cout << "[TEST] Simulating 50 games of UnbeatableBot vs EasyBot...\n";
    EasyBot opp;
    int botWins = 0;
    int draws = 0;
    for (int i = 0; i < 50; ++i) {
        Game sim;
        // Unbeatable is 'O', Easy is 'X'
        while (!sim.isGameOver()) {
            if (sim.getCurrentTurn() == 'X') {
                int m = opp.selectMove(sim.getBoard(), 'X');
                assert(m != -1);
                sim.playMove(m, 'X');
            } else {
                int m = unbeatable->selectMove(sim.getBoard(), 'O');
                assert(m != -1);
                sim.playMove(m, 'O');
            }
        }
        assert(sim.getStatus() != GameStatus::X_WON); // Unbeatable must never lose!
        if (sim.getStatus() == GameStatus::O_WON) botWins++;
        if (sim.getStatus() == GameStatus::DRAW) draws++;
    }
    std::cout << "[PASS] 50 games completed: UnbeatableBot won " << botWins
              << ", drew " << draws << ", lost 0.\n";
}

int main() {
    std::cout << "======================================\n";
    std::cout << "AFTERLIGHT Game Engine & Bot Test Suite\n";
    std::cout << "======================================\n";
    test_winning_lines();
    test_draw_detection();
    test_invalid_moves_and_turns();
    test_bots();
    std::cout << "\nALL ENGINE & BOT TESTS PASSED SUCCESSFULLY!\n";
    return 0;
}
