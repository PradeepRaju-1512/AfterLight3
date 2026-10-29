/**
 * @file RoomManager.cpp
 * @brief Implementation of RoomManager.
 */

#include "RoomManager.hpp"
#include <random>
#include <sstream>

std::string RoomManager::generateUniqueCode() {
    static const char ALPHANUM[] = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // No ambiguous 0/O, 1/I
    static thread_local std::random_device rd;
    static thread_local std::mt19937 gen(rd());
    std::uniform_int_distribution<size_t> dist(0, sizeof(ALPHANUM) - 2);

    for (int attempts = 0; attempts < 1000; ++attempts) {
        std::string code = "AL-";
        for (int i = 0; i < 4; ++i) {
            code += ALPHANUM[dist(gen)];
        }
        if (rooms_.find(code) == rooms_.end()) {
            return code;
        }
    }
    return "AL-" + std::to_string(rooms_.size() + 1000);
}

std::shared_ptr<Room> RoomManager::createRoom(const Player& host) {
    std::lock_guard<std::mutex> lock(mutex_);
    std::string code = generateUniqueCode();
    auto room = std::make_shared<Room>(code, host);
    rooms_[code] = room;
    return room;
}

std::shared_ptr<Room> RoomManager::getRoom(const std::string& code) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = rooms_.find(code);
    if (it != rooms_.end()) {
        return it->second;
    }
    return nullptr;
}

std::pair<bool, std::string> RoomManager::joinRoom(const std::string& code, const Player& guest) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = rooms_.find(code);
    if (it == rooms_.end()) {
        return {false, "Room code not found"};
    }

    auto room = it->second;
    if (room->isFull()) {
        return {false, "Room is already full"};
    }
    if (room->getPlayerX().getId() == guest.getId()) {
        return {false, "You cannot join your own room as an opponent"};
    }

    if (!room->join(guest)) {
        return {false, "Unable to join room"};
    }

    return {true, "Joined room successfully"};
}

bool RoomManager::removeRoom(const std::string& code) {
    std::lock_guard<std::mutex> lock(mutex_);
    return rooms_.erase(code) > 0;
}

void RoomManager::cleanupInactiveRooms(int timeoutMinutes) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto now = std::chrono::system_clock::now();
    for (auto it = rooms_.begin(); it != rooms_.end(); ) {
        auto elapsed = std::chrono::duration_cast<std::chrono::minutes>(now - it->second->getLastActivity()).count();
        if (elapsed > timeoutMinutes) {
            it = rooms_.erase(it);
        } else {
            ++it;
        }
    }
}

size_t RoomManager::getRoomCount() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return rooms_.size();
}
