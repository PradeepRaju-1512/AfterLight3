/**
 * @file Room.cpp
 * @brief Implementation of Room class.
 */

#include "Room.hpp"

Room::Room(const std::string& code, const Player& host)
    : roomCode_(code), playerX_(host), lastActivity_(std::chrono::system_clock::now()) {
    playerX_.setMark('X');
}

bool Room::join(const Player& guest) {
    if (isFull()) {
        return false;
    }
    // Cannot join own room as opponent
    if (guest.getId() == playerX_.getId()) {
        return false;
    }

    playerO_ = guest;
    playerO_->setMark('O');
    updateActivity();
    return true;
}

bool Room::removePlayer(int userId) {
    updateActivity();
    if (playerX_.getId() == userId) {
        // If host leaves, room is disbanded
        return true;
    }
    if (playerO_.has_value() && playerO_->getId() == userId) {
        playerO_ = std::nullopt;
        rematchRequestedO_ = false;
        return true;
    }
    return false;
}

bool Room::handleMove(int userId, int cellIndex) {
    updateActivity();

    // Check if the game is already over
    if (game_.isGameOver()) {
        return false;
    }

    // Determine which mark belongs to this user
    char userMark = ' ';
    if (playerX_.getId() == userId) {
        userMark = 'X';
    } else if (playerO_.has_value() && playerO_->getId() == userId) {
        userMark = 'O';
    } else {
        return false; // Not a member of this room
    }

    // Verify it is this user's turn
    if (game_.getCurrentTurn() != userMark) {
        return false;
    }

    return game_.playMove(cellIndex, userMark);
}

bool Room::handleRematchRequest(int userId) {
    updateActivity();

    if (playerX_.getId() == userId) {
        rematchRequestedX_ = true;
    } else if (playerO_.has_value() && playerO_->getId() == userId) {
        rematchRequestedO_ = true;
    } else {
        return false;
    }

    // If both agreed, reset the game for a fresh round
    if (rematchRequestedX_ && rematchRequestedO_) {
        game_.reset();
        rematchRequestedX_ = false;
        rematchRequestedO_ = false;
        return true;
    }

    return false;
}

bool Room::isRematchRequestedBy(char mark) const {
    if (mark == 'X') return rematchRequestedX_;
    if (mark == 'O') return rematchRequestedO_;
    return false;
}

void Room::updateActivity() {
    lastActivity_ = std::chrono::system_clock::now();
}
