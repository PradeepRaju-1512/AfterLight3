/**
 * @file Room.hpp
 * @brief Room model representing a private multiplayer session.
 *
 * OOP Concept: Composition.
 * A Room "has-a" Game and two Player slots.
 */

#pragma once

#include "Game.hpp"
#include "Player.hpp"
#include <string>
#include <optional>
#include <chrono>

class Room {
private:
    std::string roomCode_;
    Game game_;
    Player playerX_;
    std::optional<Player> playerO_;

    bool rematchRequestedX_ = false;
    bool rematchRequestedO_ = false;
    std::chrono::system_clock::time_point lastActivity_;

public:
    Room(const std::string& code, const Player& host);

    const std::string& getRoomCode() const { return roomCode_; }
    const Game& getGame() const { return game_; }
    Game& getGame() { return game_; }

    const Player& getPlayerX() const { return playerX_; }
    const std::optional<Player>& getPlayerO() const { return playerO_; }

    bool isFull() const { return playerO_.has_value(); }

    bool join(const Player& guest);
    bool removePlayer(int userId);

    // Attempt to play a move on behalf of a specific user
    bool handleMove(int userId, int cellIndex);

    // Rematch coordination
    // Returns true if both players have requested rematch and the board has been reset
    bool handleRematchRequest(int userId);
    bool isRematchRequestedBy(char mark) const;

    void updateActivity();
    std::chrono::system_clock::time_point getLastActivity() const { return lastActivity_; }
};
