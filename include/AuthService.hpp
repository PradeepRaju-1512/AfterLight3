/**
 * @file AuthService.hpp
 * @brief Authentication service with Argon2id password hashing and session tokens.
 *
 * OOP Concept: Single Responsibility Principle & Service Abstraction.
 * AuthService encapsulates all registration, credential verification, and session management.
 */

#pragma once

#include "Database.hpp"
#include <string>
#include <optional>
#include <unordered_map>
#include <mutex>

struct UserRecord {
    int id;
    std::string username;
    std::string email;
    std::string createdAt;
};

struct AuthResult {
    bool success;
    std::string message;
    std::string token;
    std::optional<UserRecord> user;
};

class AuthService {
private:
    Database& db_;
    std::unordered_map<std::string, UserRecord> sessions_; // token -> UserRecord
    mutable std::mutex sessionMutex_;

    // Generates a cryptographically random 32-character hex token
    std::string generateSessionToken();

    // Hashes password using Argon2id with random 16-byte salt
    std::string hashPassword(const std::string& password);

    // Verifies password against Argon2id encoded hash
    bool verifyPassword(const std::string& encodedHash, const std::string& password);

public:
    explicit AuthService(Database& db);

    // Register a new user
    AuthResult registerUser(const std::string& username,
                            const std::string& email,
                            const std::string& password);

    // Authenticate user with username/email and password
    AuthResult loginUser(const std::string& usernameOrEmail,
                         const std::string& password);

    // Invalidate user session
    bool logout(const std::string& token);

    // Validate active session token
    std::optional<UserRecord> validateSession(const std::string& token) const;
};
