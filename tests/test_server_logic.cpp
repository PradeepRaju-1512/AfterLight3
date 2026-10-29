/**
 * @file test_server_logic.cpp
 * @brief Comprehensive automated unit tests for Database, AuthService, MatchHistory, and RoomManager.
 */

#include "Database.hpp"
#include "AuthService.hpp"
#include "MatchHistory.hpp"
#include "RoomManager.hpp"

#include <cassert>
#include <iostream>
#include <cstdio>

void test_auth_and_database() {
    std::cout << "[TEST] Running test_auth_and_database...\n";
    std::string testDbFile = "test_afterlight.db";
    std::remove(testDbFile.c_str());

    {
        Database db(testDbFile);
        assert(db.initializeSchema("database/schema.sql"));

        AuthService auth(db);

        // 1. Valid registration
        auto reg1 = auth.registerUser("viva_student", "viva@university.edu", "secret123");
        assert(reg1.success);
        assert(!reg1.token.empty());
        assert(reg1.user.has_value());
        assert(reg1.user->username == "viva_student");

        // 2. Duplicate registration attempt (same username)
        auto regDup = auth.registerUser("viva_student", "different@university.edu", "secret123");
        assert(!regDup.success);

        // 3. Duplicate email attempt
        auto regDupEmail = auth.registerUser("another_user", "viva@university.edu", "secret123");
        assert(!regDupEmail.success);

        // 4. Invalid login credentials
        auto badLogin = auth.loginUser("viva_student", "wrong_password");
        assert(!badLogin.success);

        // 5. Valid login
        auto goodLogin = auth.loginUser("viva_student", "secret123");
        assert(goodLogin.success);
        assert(!goodLogin.token.empty());

        // 6. Session token validation
        auto session = auth.validateSession(goodLogin.token);
        assert(session.has_value());
        assert(session->username == "viva_student");

        // 7. Logout and invalidation
        assert(auth.logout(goodLogin.token));
        assert(!auth.validateSession(goodLogin.token).has_value());

        // Register second user for multiplayer tests
        auto reg2 = auth.registerUser("opponent_ace", "ace@university.edu", "pass456");
        assert(reg2.success);

        // MatchHistory tests
        MatchHistory history(db);
        assert(history.recordMatch(reg1.user->id, reg2.user->id, "pvp", std::nullopt, reg1.user->id, "X_WON"));
        assert(history.recordMatch(reg1.user->id, std::nullopt, "bot", "unbeatable", std::nullopt, "DRAW"));

        auto user1Matches = history.getUserMatches(reg1.user->id, 10);
        assert(user1Matches.size() == 2);
        assert(user1Matches[0].result == "DRAW");
        assert(user1Matches[1].result == "X_WON");
        assert(user1Matches[1].playerXUsername == "viva_student");
        assert(user1Matches[1].playerOUsername == "opponent_ace");
    }

    std::remove(testDbFile.c_str());
    std::cout << "[PASS] Database, AuthService (Argon2id), and MatchHistory passed.\n";
}

void test_room_lifecycle() {
    std::cout << "[TEST] Running test_room_lifecycle...\n";
    RoomManager mgr;

    Player p1(1, "host_player", 'X');
    Player p2(2, "guest_player", 'O');

    auto room = mgr.createRoom(p1);
    assert(room != nullptr);
    assert(!room->isFull());
    std::string code = room->getRoomCode();

    // Cannot join own room as guest
    auto selfJoin = mgr.joinRoom(code, p1);
    assert(!selfJoin.first);

    // Guest joins
    auto guestJoin = mgr.joinRoom(code, p2);
    assert(guestJoin.first);
    assert(room->isFull());

    // Third player tries to join -> rejected
    Player p3(3, "third_wheel", 'X');
    auto fullJoin = mgr.joinRoom(code, p3);
    assert(!fullJoin.first);

    // Gameplay: Turn enforcement
    // Guest tries to move first -> rejected because it's X's turn
    assert(!room->handleMove(p2.getId(), 0));

    // Host moves at 0
    assert(room->handleMove(p1.getId(), 0));
    assert(room->getGame().getBoard().getCell(0) == 'X');

    // Host tries to move again immediately -> rejected because it's O's turn
    assert(!room->handleMove(p1.getId(), 1));

    // Guest moves at 4
    assert(room->handleMove(p2.getId(), 4));
    assert(room->getGame().getBoard().getCell(4) == 'O');

    // Continue to win for X:
    // X at 1, O at 3, X at 2 -> X wins top row (0, 1, 2)
    assert(room->handleMove(p1.getId(), 1));
    assert(room->handleMove(p2.getId(), 3));
    assert(room->handleMove(p1.getId(), 2));

    assert(room->getGame().getStatus() == GameStatus::X_WON);

    // Move after game over is rejected
    assert(!room->handleMove(p2.getId(), 5));

    // Rematch protocol:
    // Host requests rematch
    assert(!room->handleRematchRequest(p1.getId())); // false because guest hasn't requested yet
    assert(room->getGame().getStatus() == GameStatus::X_WON);

    // Guest accepts rematch
    assert(room->handleRematchRequest(p2.getId())); // true because both accepted!
    assert(room->getGame().getStatus() == GameStatus::ONGOING);
    assert(room->getGame().getBoard().isEmpty());

    std::cout << "[PASS] RoomManager, turn validation, and rematch handshake verified.\n";
}

int main() {
    std::cout << "==========================================\n";
    std::cout << "AFTERLIGHT Server Logic & Multiplayer Test\n";
    std::cout << "==========================================\n";
    test_auth_and_database();
    test_room_lifecycle();
    std::cout << "\nALL SERVER & MULTIPLAYER TESTS PASSED!\n";
    return 0;
}
