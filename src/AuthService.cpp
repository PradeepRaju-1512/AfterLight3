/**
 * @file AuthService.cpp
 * @brief Implementation of AuthService using Argon2id password hashing and SQLite.
 */

#include "AuthService.hpp"
#include <argon2.h>
#include <random>
#include <sstream>
#include <iomanip>
#include <iostream>
#include <cstring>

AuthService::AuthService(Database& db)
    : db_(db) {
}

std::string AuthService::generateSessionToken() {
    static thread_local std::random_device rd;
    static thread_local std::mt19937_64 gen(rd());
    static thread_local std::uniform_int_distribution<uint64_t> dist;

    std::stringstream ss;
    ss << std::hex << std::setfill('0')
       << std::setw(16) << dist(gen)
       << std::setw(16) << dist(gen);
    return ss.str();
}

std::string AuthService::hashPassword(const std::string& password) {
    // Generate 16 random salt bytes
    uint8_t salt[16];
    std::random_device rd;
    for (int i = 0; i < 16; ++i) {
        salt[i] = static_cast<uint8_t>(rd() & 0xFF);
    }

    uint32_t t_cost = 2;            // 2 iterations
    uint32_t m_cost = 1 << 14;      // 16 MB memory cost
    uint32_t parallelism = 1;       // 1 thread
    size_t hashlen = 32;

    size_t encodedlen = argon2_encodedlen(t_cost, m_cost, parallelism, sizeof(salt), hashlen, Argon2_id);
    std::vector<char> encoded(encodedlen);

    int rc = argon2id_hash_encoded(t_cost, m_cost, parallelism,
                                  password.c_str(), password.length(),
                                  salt, sizeof(salt),
                                  hashlen,
                                  encoded.data(), encodedlen);

    if (rc != ARGON2_OK) {
        std::cerr << "[AuthService] Argon2id hashing error: " << argon2_error_message(rc) << "\n";
        return "";
    }

    return std::string(encoded.data());
}

bool AuthService::verifyPassword(const std::string& encodedHash, const std::string& password) {
    int rc = argon2id_verify(encodedHash.c_str(), password.c_str(), password.length());
    return rc == ARGON2_OK;
}

AuthResult AuthService::registerUser(const std::string& username,
                                     const std::string& email,
                                     const std::string& password) {
    if (username.length() < 3 || username.length() > 30) {
        return {false, "Username must be between 3 and 30 characters", "", std::nullopt};
    }
    if (email.find('@') == std::string::npos || email.length() < 5) {
        return {false, "Please provide a valid email address", "", std::nullopt};
    }
    if (password.length() < 6) {
        return {false, "Password must be at least 6 characters", "", std::nullopt};
    }

    // Check if username or email is already taken
    {
        std::lock_guard<std::mutex> lock(db_.getMutex());
        const char* checkSql = "SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1;";
        sqlite3_stmt* stmt = nullptr;
        if (sqlite3_prepare_v2(db_.getRawDb(), checkSql, -1, &stmt, nullptr) == SQLITE_OK) {
            sqlite3_bind_text(stmt, 1, username.c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_text(stmt, 2, email.c_str(), -1, SQLITE_TRANSIENT);
            if (sqlite3_step(stmt) == SQLITE_ROW) {
                sqlite3_finalize(stmt);
                return {false, "Username or email is already registered", "", std::nullopt};
            }
            sqlite3_finalize(stmt);
        }
    }

    // Hash password with Argon2id
    std::string hash = hashPassword(password);
    if (hash.empty()) {
        return {false, "Internal error: Failed to hash password", "", std::nullopt};
    }

    // Insert user into SQLite
    int newUserId = 0;
    std::string createdAt;
    {
        std::lock_guard<std::mutex> lock(db_.getMutex());
        const char* insertSql = "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?);";
        sqlite3_stmt* stmt = nullptr;
        if (sqlite3_prepare_v2(db_.getRawDb(), insertSql, -1, &stmt, nullptr) != SQLITE_OK) {
            return {false, "Database insert preparation failed", "", std::nullopt};
        }
        sqlite3_bind_text(stmt, 1, username.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(stmt, 2, email.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(stmt, 3, hash.c_str(), -1, SQLITE_TRANSIENT);

        if (sqlite3_step(stmt) != SQLITE_DONE) {
            sqlite3_finalize(stmt);
            return {false, "Database error creating user account", "", std::nullopt};
        }
        newUserId = static_cast<int>(sqlite3_last_insert_rowid(db_.getRawDb()));
        sqlite3_finalize(stmt);
    }

    UserRecord user{newUserId, username, email, "just now"};
    std::string token = generateSessionToken();
    {
        std::lock_guard<std::mutex> lock(sessionMutex_);
        sessions_[token] = user;
    }

    return {true, "Registration successful", token, user};
}

AuthResult AuthService::loginUser(const std::string& usernameOrEmail,
                                  const std::string& password) {
    if (usernameOrEmail.empty() || password.empty()) {
        return {false, "Username and password are required", "", std::nullopt};
    }

    int userId = 0;
    std::string username;
    std::string email;
    std::string hash;
    std::string createdAt;
    bool found = false;

    {
        std::lock_guard<std::mutex> lock(db_.getMutex());
        const char* querySql = "SELECT id, username, email, password_hash, created_at FROM users WHERE username = ? OR email = ? LIMIT 1;";
        sqlite3_stmt* stmt = nullptr;
        if (sqlite3_prepare_v2(db_.getRawDb(), querySql, -1, &stmt, nullptr) == SQLITE_OK) {
            sqlite3_bind_text(stmt, 1, usernameOrEmail.c_str(), -1, SQLITE_TRANSIENT);
            sqlite3_bind_text(stmt, 2, usernameOrEmail.c_str(), -1, SQLITE_TRANSIENT);
            if (sqlite3_step(stmt) == SQLITE_ROW) {
                userId = sqlite3_column_int(stmt, 0);
                username = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
                email = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2));
                hash = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 3));
                const unsigned char* createdText = sqlite3_column_text(stmt, 4);
                createdAt = createdText ? reinterpret_cast<const char*>(createdText) : "";
                found = true;
            }
            sqlite3_finalize(stmt);
        }
    }

    if (!found) {
        return {false, "Invalid username or password", "", std::nullopt};
    }

    if (!verifyPassword(hash, password)) {
        return {false, "Invalid username or password", "", std::nullopt};
    }

    UserRecord user{userId, username, email, createdAt};
    std::string token = generateSessionToken();
    {
        std::lock_guard<std::mutex> lock(sessionMutex_);
        sessions_[token] = user;
    }

    return {true, "Login successful", token, user};
}

bool AuthService::logout(const std::string& token) {
    std::lock_guard<std::mutex> lock(sessionMutex_);
    return sessions_.erase(token) > 0;
}

std::optional<UserRecord> AuthService::validateSession(const std::string& token) const {
    if (token.empty()) return std::nullopt;
    std::lock_guard<std::mutex> lock(sessionMutex_);
    auto it = sessions_.find(token);
    if (it != sessions_.end()) {
        return it->second;
    }
    return std::nullopt;
}
