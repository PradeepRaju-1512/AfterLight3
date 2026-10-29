cmake_minimum_required(VERSION 3.16)
project(AfterlightTicTacToe VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Compiler flags
if (CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
    add_compile_options(-Wall -Wextra -Wpedantic -O2)
endif()

# Dependencies
find_package(Threads REQUIRED)

# SQLite3
find_path(SQLITE3_INCLUDE_DIR sqlite3.h)
find_library(SQLITE3_LIBRARY NAMES sqlite3)

# Argon2
find_path(ARGON2_INCLUDE_DIR argon2.h)
find_library(ARGON2_LIBRARY NAMES argon2)

# Include directories
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${CMAKE_CURRENT_SOURCE_DIR}/third_party
    ${CMAKE_CURRENT_SOURCE_DIR}/third_party/crow
    ${SQLITE3_INCLUDE_DIR}
    ${ARGON2_INCLUDE_DIR}
)

# Core game engine and business logic library
set(AFTERLIGHT_CORE_SOURCES
    src/Board.cpp
    src/Game.cpp
    src/EasyBot.cpp
    src/MediumBot.cpp
    src/UnbeatableBot.cpp
    src/Database.cpp
    src/AuthService.cpp
    src/MatchHistory.cpp
    src/Room.cpp
    src/RoomManager.cpp
)

add_library(afterlight_core STATIC ${AFTERLIGHT_CORE_SOURCES})
target_link_libraries(afterlight_core PUBLIC
    ${SQLITE3_LIBRARY}
    ${ARGON2_LIBRARY}
    Threads::Threads
)

# Main C++ Crow HTTP & WebSocket Server
add_executable(afterlight_server src/server.cpp)
target_link_libraries(afterlight_server PRIVATE
    afterlight_core
    ${SQLITE3_LIBRARY}
    ${ARGON2_LIBRARY}
    Threads::Threads
)

# Unit Tests
add_executable(test_game tests/test_game.cpp)
target_link_libraries(test_game PRIVATE afterlight_core)

add_executable(test_server_logic tests/test_server_logic.cpp)
target_link_libraries(test_server_logic PRIVATE afterlight_core)

enable_testing()
add_test(NAME GameAndBotTests COMMAND test_game)
add_test(NAME ServerLogicTests COMMAND test_server_logic)
