/**
 * @file Player.hpp
 * @brief Player model representing a participant in a game.
 *
 * OOP Concept: Clean data abstraction and encapsulation.
 */

#pragma once

#include <string>

class Player {
private:
    int id_;
    std::string username_;
    char mark_; // 'X' or 'O'

public:
    Player(int id = 0, const std::string& username = "Guest", char mark = 'X')
        : id_(id), username_(username), mark_(mark) {}

    int getId() const { return id_; }
    const std::string& getUsername() const { return username_; }
    char getMark() const { return mark_; }

    void setId(int id) { id_ = id; }
    void setUsername(const std::string& username) { username_ = username; }
    void setMark(char mark) { mark_ = mark; }
};
