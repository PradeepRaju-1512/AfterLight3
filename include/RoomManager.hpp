/**
 * @file RoomManager.hpp
 * @brief Thread-safe room registry and lifecycle manager.
 *
 * OOP Concept: Encapsulation & Manager Pattern.
 * Coordinates multi-user room lifetimes in server memory.
 */

#pragma once

#include "Room.hpp"
#include <unordered_map>
#include <memory>
#include <mutex>
#include <string>

class RoomManager {
private:
    std::unordered_map<std::string, std::shared_ptr<Room>> rooms_;
    mutable std::mutex mutex_;

    std::string generateUniqueCode();

public:
    RoomManager() = default;

    // Create a new private room with a generated code
    std::shared_ptr<Room> createRoom(const Player& host);

    // Look up room by code
    std::shared_ptr<Room> getRoom(const std::string& code);

    // Join an existing room
    std::pair<bool, std::string> joinRoom(const std::string& code, const Player& guest);

    // Remove room when abandoned or finished
    bool removeRoom(const std::string& code);

    // Clean up inactive rooms older than timeoutMinutes
    void cleanupInactiveRooms(int timeoutMinutes = 60);

    // Count active rooms
    size_t getRoomCount() const;
};
