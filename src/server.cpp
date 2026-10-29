/**
 * @file server.cpp
 * @brief Authoritative C++ Crow HTTP & WebSocket Server for AFTERLIGHT.
 *
 * All game logic, bot decisions, move validation, multiplayer synchronization,
 * authentication, and match persistence are owned by this C++ server.
 */

#define CROW_MAIN
#include "crow_all.h"

#include "Board.hpp"
#include "Game.hpp"
#include "EasyBot.hpp"
#include "MediumBot.hpp"
#include "UnbeatableBot.hpp"
#include "Database.hpp"
#include "AuthService.hpp"
#include "MatchHistory.hpp"
#include "RoomManager.hpp"

#include <nlohmann/json.hpp>
#include <iostream>
#include <fstream>
#include <sstream>
#include <memory>
#include <mutex>
#include <unordered_map>

using json = nlohmann::json;

// Helper to read file contents
std::string readFileContents(const std::string& path) {
    std::ifstream f(path);
    if (!f.is_open()) return "";
    std::stringstream ss;
    ss << f.rdbuf();
    return ss.str();
}

// WebSocket connection tracking data
struct WsClientInfo {
    std::string token;
    int userId = 0;
    std::string username;
    std::string roomCode;
};

int main(int argc, char* argv[]) {
    int port = 3000;
    if (argc > 1) {
        port = std::stoi(argv[1]);
    }

    std::cout << "===============================================\n";
    std::cout << "  AFTERLIGHT — Cyberpunk C++17 Crow Server    \n";
    std::cout << "  Port: " << port << "                            \n";
    std::cout << "===============================================\n";

    // 1. Initialize SQLite Database & Schema
    Database db("afterlight.db");
    if (!db.initializeSchema("database/schema.sql")) {
        std::cerr << "[Warning] Could not initialize database/schema.sql, using fallback schema.\n";
    }

    // 2. Initialize Core Services
    AuthService authService(db);
    MatchHistory matchHistory(db);
    RoomManager roomManager;

    crow::SimpleApp app;

    // WebSocket connection state management
    std::mutex wsMutex;
    std::unordered_map<crow::websocket::connection*, WsClientInfo> wsClients;
    // Map of roomCode -> list of connections
    std::unordered_map<std::string, std::vector<crow::websocket::connection*>> roomConnections;

    // Helper to broadcast room state to all clients in a room
    auto broadcastRoomState = [&](const std::string& roomCode, const std::string& extraEvent = "") {
        auto room = roomManager.getRoom(roomCode);
        if (!room) return;

        json payload;
        payload["type"] = "room_state";
        payload["roomCode"] = roomCode;
        payload["isFull"] = room->isFull();

        // Player details
        payload["playerX"] = {
            {"id", room->getPlayerX().getId()},
            {"username", room->getPlayerX().getUsername()},
            {"mark", "X"},
            {"rematchRequested", room->isRematchRequestedBy('X')}
        };

        if (room->getPlayerO().has_value()) {
            payload["playerO"] = {
                {"id", room->getPlayerO()->getId()},
                {"username", room->getPlayerO()->getUsername()},
                {"mark", "O"},
                {"rematchRequested", room->isRematchRequestedBy('O')}
            };
        } else {
            payload["playerO"] = nullptr;
        }

        // Game state
        const auto& game = room->getGame();
        payload["board"] = game.getBoard().toString();
        payload["currentTurn"] = std::string(1, game.getCurrentTurn());
        payload["status"] = game.getStatusString();
        payload["winningLine"] = game.getWinningLine();
        payload["moveCount"] = game.getMoveCount();

        if (!extraEvent.empty()) {
            payload["event"] = extraEvent;
        }

        std::string serialized = payload.dump();

        std::lock_guard<std::mutex> lock(wsMutex);
        auto it = roomConnections.find(roomCode);
        if (it != roomConnections.end()) {
            for (auto* conn : it->second) {
                if (conn) {
                    conn->send_text(serialized);
                }
            }
        }
    };

    // Helper: Extract Bearer token from headers
    auto extractToken = [](const crow::request& req) -> std::string {
        auto authHeader = req.get_header_value("Authorization");
        if (!authHeader.empty() && authHeader.rfind("Bearer ", 0) == 0) {
            return authHeader.substr(7);
        }
        return req.url_params.get("token") ? req.url_params.get("token") : "";
    };

    // -------------------------------------------------------------
    // STATIC ASSETS (Frontend Web Client)
    // -------------------------------------------------------------
    CROW_ROUTE(app, "/")([]() {
        crow::response res(readFileContents("web/index.html"));
        res.set_header("Content-Type", "text/html; charset=utf-8");
        return res;
    });

    CROW_ROUTE(app, "/style.css")([]() {
        crow::response res(readFileContents("web/style.css"));
        res.set_header("Content-Type", "text/css; charset=utf-8");
        return res;
    });

    CROW_ROUTE(app, "/app.js")([]() {
        crow::response res(readFileContents("web/app.js"));
        res.set_header("Content-Type", "application/javascript; charset=utf-8");
        return res;
    });

    // -------------------------------------------------------------
    // REST API: AUTHENTICATION
    // -------------------------------------------------------------
    CROW_ROUTE(app, "/api/auth/register").methods("POST"_method)([&authService](const crow::request& req) {
        try {
            auto body = json::parse(req.body);
            std::string username = body.value("username", "");
            std::string email = body.value("email", "");
            std::string password = body.value("password", "");

            auto result = authService.registerUser(username, email, password);
            json resp;
            resp["success"] = result.success;
            resp["message"] = result.message;

            if (result.success && result.user.has_value()) {
                resp["token"] = result.token;
                resp["user"] = {
                    {"id", result.user->id},
                    {"username", result.user->username},
                    {"email", result.user->email}
                };
                return crow::response(201, resp.dump());
            } else {
                return crow::response(400, resp.dump());
            }
        } catch (const std::exception& e) {
            json err = {{"success", false}, {"message", std::string("Bad request: ") + e.what()}};
            return crow::response(400, err.dump());
        }
    });

    CROW_ROUTE(app, "/api/auth/login").methods("POST"_method)([&authService](const crow::request& req) {
        try {
            auto body = json::parse(req.body);
            std::string usernameOrEmail = body.value("username", "");
            if (usernameOrEmail.empty()) {
                usernameOrEmail = body.value("email", "");
            }
            std::string password = body.value("password", "");

            auto result = authService.loginUser(usernameOrEmail, password);
            json resp;
            resp["success"] = result.success;
            resp["message"] = result.message;

            if (result.success && result.user.has_value()) {
                resp["token"] = result.token;
                resp["user"] = {
                    {"id", result.user->id},
                    {"username", result.user->username},
                    {"email", result.user->email}
                };
                return crow::response(200, resp.dump());
            } else {
                return crow::response(401, resp.dump());
            }
        } catch (const std::exception& e) {
            json err = {{"success", false}, {"message", std::string("Bad request: ") + e.what()}};
            return crow::response(400, err.dump());
        }
    });

    CROW_ROUTE(app, "/api/auth/logout").methods("POST"_method)([&authService, &extractToken](const crow::request& req) {
        std::string token = extractToken(req);
        if (token.empty() && !req.body.empty()) {
            try {
                auto body = json::parse(req.body);
                token = body.value("token", "");
            } catch (...) {}
        }
        authService.logout(token);
        json resp = {{"success", true}, {"message", "Logged out successfully"}};
        return crow::response(200, resp.dump());
    });

    CROW_ROUTE(app, "/api/auth/me").methods("GET"_method)([&authService, &extractToken](const crow::request& req) {
        std::string token = extractToken(req);
        auto user = authService.validateSession(token);
        if (!user.has_value()) {
            json err = {{"success", false}, {"message", "Unauthorized"}};
            return crow::response(401, err.dump());
        }
        json resp;
        resp["success"] = true;
        resp["user"] = {
            {"id", user->id},
            {"username", user->username},
            {"email", user->email}
        };
        return crow::response(200, resp.dump());
    });

    // -------------------------------------------------------------
    // REST API: BOT STRATEGY (Demonstrating Runtime Polymorphism)
    // -------------------------------------------------------------
    CROW_ROUTE(app, "/api/bot/move").methods("POST"_method)([&authService, &extractToken](const crow::request& req) {
        // Authenticate request
        std::string token = extractToken(req);
        auto user = authService.validateSession(token);
        if (!user.has_value()) {
            json err = {{"success", false}, {"message", "Unauthorized session"}};
            return crow::response(401, err.dump());
        }

        try {
            auto body = json::parse(req.body);
            std::string difficulty = body.value("difficulty", "easy");
            std::string boardStr = body.value("board", "         ");
            std::string botMarkStr = body.value("botMark", "O");
            char botMark = botMarkStr.empty() ? 'O' : botMarkStr[0];

            // Reconstruct Board
            Board board;
            if (boardStr.length() == 9) {
                for (int i = 0; i < 9; ++i) {
                    if (boardStr[i] == 'X' || boardStr[i] == 'O') {
                        board.makeMove(i, boardStr[i]);
                    }
                }
            }

            // OOP Concept: Runtime Polymorphism
            // Call selectMove through the abstract base pointer BotStrategy
            std::unique_ptr<BotStrategy> bot;
            if (difficulty == "medium") {
                bot = std::make_unique<MediumBot>();
            } else if (difficulty == "unbeatable") {
                bot = std::make_unique<UnbeatableBot>();
            } else {
                bot = std::make_unique<EasyBot>();
            }

            int selectedMove = bot->selectMove(board, botMark);

            json resp;
            resp["success"] = (selectedMove != -1);
            resp["move"] = selectedMove;
            resp["difficulty"] = bot->getDifficulty();
            return crow::response(200, resp.dump());
        } catch (const std::exception& e) {
            json err = {{"success", false}, {"message", e.what()}};
            return crow::response(400, err.dump());
        }
    });

    // -------------------------------------------------------------
    // REST API: ROOM MANAGEMENT
    // -------------------------------------------------------------
    CROW_ROUTE(app, "/api/rooms/create").methods("POST"_method)([&authService, &roomManager, &extractToken](const crow::request& req) {
        std::string token = extractToken(req);
        auto user = authService.validateSession(token);
        if (!user.has_value()) {
            json err = {{"success", false}, {"message", "Please log in first"}};
            return crow::response(401, err.dump());
        }

        Player host(user->id, user->username, 'X');
        auto room = roomManager.createRoom(host);

        json resp;
        resp["success"] = true;
        resp["roomCode"] = room->getRoomCode();
        resp["message"] = "Room created. Share the code with your opponent.";
        return crow::response(201, resp.dump());
    });

    CROW_ROUTE(app, "/api/rooms/join").methods("POST"_method)([&authService, &roomManager, &extractToken, &broadcastRoomState](const crow::request& req) {
        std::string token = extractToken(req);
        auto user = authService.validateSession(token);
        if (!user.has_value()) {
            json err = {{"success", false}, {"message", "Please log in first"}};
            return crow::response(401, err.dump());
        }

        try {
            auto body = json::parse(req.body);
            std::string roomCode = body.value("roomCode", "");

            Player guest(user->id, user->username, 'O');
            auto [joined, msg] = roomManager.joinRoom(roomCode, guest);

            if (!joined) {
                json err = {{"success", false}, {"message", msg}};
                return crow::response(400, err.dump());
            }

            broadcastRoomState(roomCode, "player_joined");

            json resp;
            resp["success"] = true;
            resp["message"] = msg;
            resp["roomCode"] = roomCode;
            return crow::response(200, resp.dump());
        } catch (const std::exception& e) {
            json err = {{"success", false}, {"message", e.what()}};
            return crow::response(400, err.dump());
        }
    });

    // -------------------------------------------------------------
    // REST API: MATCH HISTORY
    // -------------------------------------------------------------
    CROW_ROUTE(app, "/api/matches/record").methods("POST"_method)([&authService, &matchHistory, &extractToken](const crow::request& req) {
        std::string token = extractToken(req);
        auto user = authService.validateSession(token);
        if (!user.has_value()) {
            json err = {{"success", false}, {"message", "Unauthorized"}};
            return crow::response(401, err.dump());
        }

        try {
            auto body = json::parse(req.body);
            std::string gameMode = body.value("gameMode", "bot"); // "bot" or "pvp"
            std::string result = body.value("result", "DRAW");    // "X_WON", "O_WON", "DRAW"
            std::optional<std::string> botDifficulty = std::nullopt;
            if (body.contains("botDifficulty") && !body["botDifficulty"].is_null()) {
                botDifficulty = body["botDifficulty"].get<std::string>();
            }

            int playerXId = user->id;
            std::optional<int> playerOId = std::nullopt;
            std::optional<int> winnerId = std::nullopt;

            if (gameMode == "bot") {
                if (result == "X_WON") {
                    winnerId = user->id;
                }
            } else {
                if (body.contains("playerOId") && !body["playerOId"].is_null()) {
                    playerOId = body["playerOId"].get<int>();
                }
                if (result == "X_WON") {
                    winnerId = playerXId;
                } else if (result == "O_WON" && playerOId.has_value()) {
                    winnerId = playerOId.value();
                }
            }

            bool saved = matchHistory.recordMatch(playerXId, playerOId, gameMode, botDifficulty, winnerId, result);
            json resp;
            resp["success"] = saved;
            return crow::response(saved ? 200 : 500, resp.dump());
        } catch (const std::exception& e) {
            json err = {{"success", false}, {"message", e.what()}};
            return crow::response(400, err.dump());
        }
    });

    CROW_ROUTE(app, "/api/matches/history").methods("GET"_method)([&authService, &matchHistory, &extractToken](const crow::request& req) {
        std::string token = extractToken(req);
        auto user = authService.validateSession(token);
        if (!user.has_value()) {
            json err = {{"success", false}, {"message", "Unauthorized"}};
            return crow::response(401, err.dump());
        }

        auto matches = matchHistory.getUserMatches(user->id, 30);
        json list = json::array();

        for (const auto& m : matches) {
            json item;
            item["id"] = m.id;
            item["playerXId"] = m.playerXId;
            item["playerXUsername"] = m.playerXUsername;
            if (m.playerOId.has_value()) {
                item["playerOId"] = m.playerOId.value();
                item["playerOUsername"] = m.playerOUsername;
            } else {
                item["playerOId"] = nullptr;
                item["playerOUsername"] = "AFTERLIGHT Bot";
            }
            item["gameMode"] = m.gameMode;
            if (m.botDifficulty.has_value()) {
                item["botDifficulty"] = m.botDifficulty.value();
            } else {
                item["botDifficulty"] = nullptr;
            }
            if (m.winnerId.has_value()) {
                item["winnerId"] = m.winnerId.value();
            } else {
                item["winnerId"] = nullptr;
            }
            item["result"] = m.result;
            item["createdAt"] = m.createdAt;
            list.push_back(item);
        }

        json resp;
        resp["success"] = true;
        resp["matches"] = list;
        return crow::response(200, resp.dump());
    });

    // -------------------------------------------------------------
    // REAL-TIME WEBSOCKET PROTOCOL (/ws)
    // -------------------------------------------------------------
    CROW_WEBSOCKET_ROUTE(app, "/ws")
        .onopen([&](crow::websocket::connection& conn) {
            std::lock_guard<std::mutex> lock(wsMutex);
            wsClients[&conn] = WsClientInfo{};
        })
        .onclose([&](crow::websocket::connection& conn, const std::string& /*reason*/) {
            std::string roomToNotify = "";
            {
                std::lock_guard<std::mutex> lock(wsMutex);
                auto it = wsClients.find(&conn);
                if (it != wsClients.end()) {
                    roomToNotify = it->second.roomCode;
                    if (!roomToNotify.empty()) {
                        auto& conns = roomConnections[roomToNotify];
                        conns.erase(std::remove(conns.begin(), conns.end(), &conn), conns.end());
                    }
                    wsClients.erase(it);
                }
            }
            if (!roomToNotify.empty()) {
                broadcastRoomState(roomToNotify, "player_disconnected");
            }
        })
        .onmessage([&](crow::websocket::connection& conn, const std::string& data, bool /*is_binary*/) {
            try {
                auto msg = json::parse(data);
                std::string type = msg.value("type", "");

                if (type == "join") {
                    std::string token = msg.value("token", "");
                    std::string roomCode = msg.value("roomCode", "");

                    auto user = authService.validateSession(token);
                    if (!user.has_value()) {
                        json err = {{"type", "error"}, {"message", "Authentication required"}};
                        conn.send_text(err.dump());
                        return;
                    }

                    auto room = roomManager.getRoom(roomCode);
                    if (!room) {
                        json err = {{"type", "error"}, {"message", "Room does not exist"}};
                        conn.send_text(err.dump());
                        return;
                    }

                    // Register client with room
                    {
                        std::lock_guard<std::mutex> lock(wsMutex);
                        wsClients[&conn] = WsClientInfo{token, user->id, user->username, roomCode};
                        auto& conns = roomConnections[roomCode];
                        if (std::find(conns.begin(), conns.end(), &conn) == conns.end()) {
                            conns.push_back(&conn);
                        }
                    }

                    broadcastRoomState(roomCode, "client_sync");
                }
                else if (type == "move") {
                    WsClientInfo info;
                    {
                        std::lock_guard<std::mutex> lock(wsMutex);
                        auto it = wsClients.find(&conn);
                        if (it == wsClients.end() || it->second.userId == 0) {
                            json err = {{"type", "error"}, {"message", "Unauthorized"}};
                            conn.send_text(err.dump());
                            return;
                        }
                        info = it->second;
                    }

                    auto room = roomManager.getRoom(info.roomCode);
                    if (!room) {
                        json err = {{"type", "error"}, {"message", "Room not found"}};
                        conn.send_text(err.dump());
                        return;
                    }

                    int cell = msg.value("cell", -1);
                    bool moved = room->handleMove(info.userId, cell);
                    if (!moved) {
                        json err = {{"type", "error"}, {"message", "Invalid move or not your turn"}};
                        conn.send_text(err.dump());
                        return;
                    }

                    // If game finished, record match in database
                    if (room->getGame().isGameOver()) {
                        std::string resStr = room->getGame().getStatusString();
                        int xId = room->getPlayerX().getId();
                        std::optional<int> oId = room->getPlayerO().has_value()
                            ? std::make_optional(room->getPlayerO()->getId())
                            : std::nullopt;

                        std::optional<int> winnerId = std::nullopt;
                        if (resStr == "X_WON") winnerId = xId;
                        else if (resStr == "O_WON" && oId.has_value()) winnerId = oId.value();

                        matchHistory.recordMatch(xId, oId, "pvp", std::nullopt, winnerId, resStr);
                    }

                    broadcastRoomState(info.roomCode, "move_made");
                }
                else if (type == "rematch") {
                    WsClientInfo info;
                    {
                        std::lock_guard<std::mutex> lock(wsMutex);
                        auto it = wsClients.find(&conn);
                        if (it == wsClients.end() || it->second.userId == 0) return;
                        info = it->second;
                    }

                    auto room = roomManager.getRoom(info.roomCode);
                    if (!room) return;

                    bool resetOccurred = room->handleRematchRequest(info.userId);
                    broadcastRoomState(info.roomCode, resetOccurred ? "rematch_started" : "rematch_requested");
                }
            } catch (const std::exception& e) {
                json err = {{"type", "error"}, {"message", e.what()}};
                conn.send_text(err.dump());
            }
        });

    app.port(port).multithreaded().run();
    return 0;
}
