"""
AFTERLIGHT - Database JSON-RPC Bridge
Enables the Express/Node.js server to run ACID SQLite transactions, queries, and mutations.
"""

import sys
import json
import os
import time
import uuid

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
from database import (
    get_db_connection, hash_password, verify_password, needs_rehash, ensure_db,
)

AVATARS = {"hiker", "tower", "moon", "tree"}
FRIEND_REQUEST_ACTIONS = {"ACCEPTED", "REJECTED", "CANCELLED"}


def _like_escape(text: str) -> str:
    """Escape LIKE wildcards so searching for '%' or '_' does not match everything."""
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _user_exists(cursor, username: str) -> bool:
    cursor.execute("SELECT 1 FROM users WHERE username = ?", (username,))
    return cursor.fetchone() is not None


def execute_action(action: str, params: dict) -> dict:
    ensure_db()  # the bridge used to assume the DB already existed -> "no such table" on a fresh deploy
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        if action == "register":
            username = str(params["username"]).strip()
            email = str(params["email"]).strip().lower()
            password = str(params["password"])
            display_name = (str(params.get("displayName") or "").strip() or username)[:40]

            if len(username) < 3 or len(username) > 30:
                return {"error": "Username must be 3-30 characters."}
            if not all(c.isalnum() or c in "_-." for c in username):
                return {"error": "Username may only contain letters, numbers, '_', '-' and '.'."}
            if "@" not in email or "." not in email.split("@")[-1] or len(email) > 120:
                return {"error": "Please enter a valid email address."}
            if len(password) < 6:
                return {"error": "Password must be at least 6 characters."}

            # Check uniqueness
            cursor.execute("SELECT id FROM users WHERE LOWER(username) = LOWER(?) OR email = ?", (username, email))
            if cursor.fetchone():
                return {"error": "Username or email is already registered."}

            user_id = str(uuid.uuid4())
            now = time.time()
            cursor.execute("""
                INSERT INTO users (id, username, email, password_hash, created_at)
                VALUES (?, ?, ?, ?, ?)
            """, (user_id, username, email, hash_password(password), now))

            cursor.execute("""
                INSERT INTO player_profiles (user_id, display_name, avatar, bio, total_games, wins, losses, draws, win_rate, rating, is_online)
                VALUES (?, ?, 'hiker', 'Explorer under the moonlight.', 0, 0, 0, 0, 0.0, 1000, 1)
            """, (user_id, display_name))

            conn.commit()
            return {
                "success": True,
                "user": {
                    "id": user_id,
                    "username": username,
                    "email": email,
                    "displayName": display_name,
                    "avatar": "hiker",
                    "bio": "Explorer under the moonlight.",
                    "totalGames": 0,
                    "wins": 0,
                    "losses": 0,
                    "draws": 0,
                    "winRate": 0.0,
                    "rating": 1000,
                    "createdAt": now,
                }
            }

        elif action == "login":
            identifier = str(params["identifier"]).strip()
            password = str(params["password"])

            cursor.execute("""
                SELECT u.id, u.username, u.email, u.password_hash, u.created_at,
                       p.display_name, p.avatar, p.bio, p.total_games, p.wins, p.losses, p.draws, p.win_rate, p.rating
                FROM users u
                JOIN player_profiles p ON u.id = p.user_id
                WHERE (u.username = ? OR u.email = ?)
            """, (identifier, identifier.lower()))
            row = cursor.fetchone()

            if not row or not verify_password(password, row["password_hash"]):
                return {"error": "Invalid username/email or password."}

            if needs_rehash(row["password_hash"]):
                cursor.execute("UPDATE users SET password_hash = ? WHERE id = ?", (hash_password(password), row["id"]))
            cursor.execute("UPDATE player_profiles SET is_online = 1 WHERE user_id = ?", (row["id"],))
            conn.commit()

            return {
                "success": True,
                "user": {
                    "id": row["id"],
                    "username": row["username"],
                    "email": row["email"],
                    "displayName": row["display_name"],
                    "avatar": row["avatar"],
                    "bio": row["bio"],
                    "totalGames": row["total_games"],
                    "wins": row["wins"],
                    "losses": row["losses"],
                    "draws": row["draws"],
                    "winRate": row["win_rate"],
                    "rating": row["rating"],
                    "createdAt": row["created_at"],
                }
            }

        elif action == "logout":
            cursor.execute("""
                UPDATE player_profiles SET is_online = 0
                WHERE user_id = (SELECT id FROM users WHERE username = ?)
            """, (params["username"],))
            conn.commit()
            return {"success": True}

        elif action == "get_user":
            user_id = params["userId"]
            cursor.execute("""
                SELECT u.id, u.username, u.email, u.created_at,
                       p.display_name, p.avatar, p.bio, p.total_games, p.wins, p.losses, p.draws, p.win_rate, p.rating
                FROM users u
                JOIN player_profiles p ON u.id = p.user_id
                WHERE u.id = ?
            """, (user_id,))
            row = cursor.fetchone()
            if not row:
                return {"error": "User not found."}

            return {
                "success": True,
                "user": {
                    "id": row["id"],
                    "username": row["username"],
                    "email": row["email"],
                    "displayName": row["display_name"],
                    "avatar": row["avatar"],
                    "bio": row["bio"],
                    "totalGames": row["total_games"],
                    "wins": row["wins"],
                    "losses": row["losses"],
                    "draws": row["draws"],
                    "winRate": row["win_rate"],
                    "rating": row["rating"],
                    "createdAt": row["created_at"],
                }
            }

        elif action == "update_profile":
            user_id = params["userId"]
            display_name = params.get("displayName")
            bio = params.get("bio")
            avatar = params.get("avatar")

            updates = []
            vals = []
            if display_name is not None:
                display_name = str(display_name).strip()
                if not display_name:
                    return {"error": "Display name cannot be empty."}
                updates.append("display_name = ?")
                vals.append(display_name[:40])
            if bio is not None:
                updates.append("bio = ?")
                vals.append(str(bio)[:200])
            if avatar:
                if avatar not in AVATARS:
                    return {"error": "Unknown avatar."}
                updates.append("avatar = ?")
                vals.append(avatar)

            if updates:
                vals.append(user_id)
                cursor.execute(f"UPDATE player_profiles SET {', '.join(updates)} WHERE user_id = ?", tuple(vals))
                conn.commit()

            return {"success": True}

        elif action == "search_players":
            current_user = params.get("currentUser", "")
            query = params.get("query", "").strip()

            if query:
                cursor.execute("""
                    SELECT u.id, u.username, p.display_name, p.avatar, p.bio,
                           p.total_games, p.wins, p.losses, p.draws, p.win_rate, p.rating, p.is_online
                    FROM users u
                    JOIN player_profiles p ON u.id = p.user_id
                    WHERE u.username != ? AND (u.username LIKE ? ESCAPE '\\' OR p.display_name LIKE ? ESCAPE '\\')
                    LIMIT 20
                """, (current_user, f"%{_like_escape(query)}%", f"%{_like_escape(query)}%"))
            else:
                cursor.execute("""
                    SELECT u.id, u.username, p.display_name, p.avatar, p.bio,
                           p.total_games, p.wins, p.losses, p.draws, p.win_rate, p.rating, p.is_online
                    FROM users u
                    JOIN player_profiles p ON u.id = p.user_id
                    WHERE u.username != ?
                    LIMIT 20
                """, (current_user,))

            rows = cursor.fetchall()
            players = []
            for r in rows:
                players.append({
                    "id": r["id"],
                    "username": r["username"],
                    "displayName": r["display_name"],
                    "avatar": r["avatar"],
                    "bio": r["bio"],
                    "totalGames": r["total_games"],
                    "wins": r["wins"],
                    "losses": r["losses"],
                    "draws": r["draws"],
                    "winRate": r["win_rate"],
                    "rating": r["rating"],
                    "isOnline": bool(r["is_online"]),
                })
            return {"players": players}

        elif action == "save_match":
            game_id = params["id"]
            mode = params["mode"]
            bot_diff = params.get("botDifficulty")
            px_name = params["playerXName"]
            po_name = params["playerOName"]
            board = params["boardState"]
            turn = params.get("currentTurn", "X")
            status = params["status"]
            outcome = params["outcome"]
            winner = params.get("winnerName")
            win_line = json.dumps(params.get("winningLine")) if params.get("winningLine") else None
            room_code = params.get("roomCode")
            now = time.time()

            # Look at the existing row first: INSERT OR REPLACE used to reset created_at on every save,
            # and re-saving a finished game counted its result in the player's stats a second time.
            cursor.execute("SELECT status, created_at FROM games WHERE id = ?", (game_id,))
            existing = cursor.fetchone()
            already_completed = bool(existing and existing["status"] == "COMPLETED")
            created_at = existing["created_at"] if existing else now

            if already_completed:
                return {"success": True, "duplicate": True}

            cursor.execute("""
                INSERT OR REPLACE INTO games
                (id, mode, bot_difficulty, player_x_name, player_o_name, board_state, current_turn, status, outcome, winner_name, winning_line, room_code, created_at, completed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (game_id, mode, bot_diff, px_name, po_name, board, turn, status, outcome, winner, win_line, room_code, created_at, now if status == "COMPLETED" else None))

            # If completed, update player stats
            if status == "COMPLETED":
                for name, is_winner in [(px_name, winner == px_name), (po_name, winner == po_name)]:
                    cursor.execute("""
                        SELECT p.user_id, p.total_games, p.wins, p.losses, p.draws, p.rating
                        FROM users u JOIN player_profiles p ON u.id = p.user_id
                        WHERE u.username = ?
                    """, (name,))
                    prof = cursor.fetchone()
                    if prof:
                        tot = prof["total_games"] + 1
                        w = prof["wins"] + (1 if is_winner else 0)
                        d = prof["draws"] + (1 if outcome == "DRAW" else 0)
                        l = prof["losses"] + (1 if not is_winner and outcome != "DRAW" else 0)
                        wr = round((w / tot) * 100, 1)
                        # Incremental rating (+25 win, -15 loss). The old formula recomputed from
                        # 1000 + wins*25 - losses*15, wiping the seeded ratings (e.g. 1420) after one game.
                        delta = 25 if is_winner else (0 if outcome == "DRAW" else -15)
                        rat = max(800, prof["rating"] + delta)
                        cursor.execute("""
                            UPDATE player_profiles
                            SET total_games = ?, wins = ?, losses = ?, draws = ?, win_rate = ?, rating = ?
                            WHERE user_id = ?
                        """, (tot, w, l, d, wr, rat, prof["user_id"]))

            conn.commit()
            return {"success": True}

        elif action == "get_match_history":
            username = params.get("username")
            limit = max(1, min(int(params.get("limit", 30)), 200))
            if not username:
                return {"error": "username is required."}

            # Unfinished (abandoned) games used to be listed and rendered as "DEFEAT"
            cursor.execute("""
                SELECT * FROM games
                WHERE status = 'COMPLETED' AND (player_x_name = ? OR player_o_name = ?)
                ORDER BY created_at DESC LIMIT ?
            """, (username, username, limit))

            rows = cursor.fetchall()
            games = []
            for r in rows:
                games.append({
                    "id": r["id"],
                    "mode": r["mode"],
                    "botDifficulty": r["bot_difficulty"],
                    "playerXName": r["player_x_name"],
                    "playerOName": r["player_o_name"],
                    "boardState": r["board_state"],
                    "status": r["status"],
                    "outcome": r["outcome"],
                    "winnerName": r["winner_name"],
                    "winningLine": json.loads(r["winning_line"]) if r["winning_line"] else None,
                    "roomCode": r["room_code"],
                    "createdAt": r["created_at"],
                })
            return {"games": games}

        elif action == "get_social_overview":
            username = params["username"]

            # Friends
            cursor.execute("""
                SELECT user_b_name as friend FROM friendships WHERE user_a_name = ?
                UNION
                SELECT user_a_name as friend FROM friendships WHERE user_b_name = ?
            """, (username, username))
            friends = [r["friend"] for r in cursor.fetchall()]

            # Incoming requests
            cursor.execute("""
                SELECT id, sender_name, created_at FROM friend_requests
                WHERE recipient_name = ? AND status = 'PENDING'
            """, (username,))
            incoming = [{"id": r["id"], "senderName": r["sender_name"], "createdAt": r["created_at"]} for r in cursor.fetchall()]

            # Outgoing requests
            cursor.execute("""
                SELECT id, recipient_name, created_at FROM friend_requests
                WHERE sender_name = ? AND status = 'PENDING'
            """, (username,))
            outgoing = [{"id": r["id"], "recipientName": r["recipient_name"], "createdAt": r["created_at"]} for r in cursor.fetchall()]

            # Blocked users
            cursor.execute("SELECT blocked_name FROM user_blocks WHERE blocker_name = ?", (username,))
            blocked = [r["blocked_name"] for r in cursor.fetchall()]

            # Notifications
            cursor.execute("""
                SELECT * FROM notifications WHERE recipient_name = ? ORDER BY created_at DESC LIMIT 20
            """, (username,))
            notifications = [{
                "id": r["id"],
                "type": r["type"],
                "title": r["title"],
                "message": r["message"],
                "data": json.loads(r["data_json"]) if r["data_json"] else None,
                "isRead": bool(r["is_read"]),
                "createdAt": r["created_at"]
            } for r in cursor.fetchall()]

            return {
                "friends": friends,
                "incomingRequests": incoming,
                "outgoingRequests": outgoing,
                "blocked": blocked,
                "notifications": notifications,
            }

        elif action == "send_friend_request":
            sender = params["senderName"]
            recipient = params["recipientName"]

            if sender == recipient:
                return {"error": "Cannot send a friend request to yourself."}

            if not _user_exists(cursor, recipient):
                return {"error": "Player not found."}

            cursor.execute("""
                SELECT id FROM friend_requests
                WHERE sender_name = ? AND recipient_name = ? AND status = 'PENDING'
            """, (recipient, sender))
            if cursor.fetchone():
                return {"error": "This player has already sent you a request - check your incoming requests."}

            # Check if blocked
            cursor.execute("""
                SELECT id FROM user_blocks
                WHERE (blocker_name = ? AND blocked_name = ?) OR (blocker_name = ? AND blocked_name = ?)
            """, (sender, recipient, recipient, sender))
            if cursor.fetchone():
                return {"error": "Social interaction is blocked between these users."}

            # Check existing friendship
            cursor.execute("""
                SELECT id FROM friendships
                WHERE (user_a_name = ? AND user_b_name = ?) OR (user_a_name = ? AND user_b_name = ?)
            """, (sender, recipient, recipient, sender))
            if cursor.fetchone():
                return {"error": "You are already friends with this player."}

            # Check existing pending request
            cursor.execute("""
                SELECT id FROM friend_requests
                WHERE sender_name = ? AND recipient_name = ? AND status = 'PENDING'
            """, (sender, recipient))
            if cursor.fetchone():
                return {"error": "A pending request has already been sent to this player."}

            req_id = str(uuid.uuid4())
            now = time.time()
            cursor.execute("""
                INSERT INTO friend_requests (id, sender_name, recipient_name, status, created_at)
                VALUES (?, ?, ?, 'PENDING', ?)
            """, (req_id, sender, recipient, now))

            # Add notification for recipient
            notif_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO notifications (id, recipient_name, type, title, message, data_json, created_at)
                VALUES (?, ?, 'FRIEND_REQUEST', 'Friend Request', ?, ?, ?)
            """, (notif_id, recipient, f"{sender} sent you a friend request under the moonlight.", json.dumps({"requestId": req_id, "sender": sender}), now))

            conn.commit()
            return {"success": True, "requestId": req_id}

        elif action == "respond_friend_request":
            req_id = params["requestId"]
            status = params["status"]  # "ACCEPTED" or "REJECTED" or "CANCELLED"
            acting_user = params.get("username")
            now = time.time()

            if status not in FRIEND_REQUEST_ACTIONS:
                return {"error": "Invalid status."}

            cursor.execute("SELECT * FROM friend_requests WHERE id = ?", (req_id,))
            req = cursor.fetchone()
            if not req:
                return {"error": "Friend request not found."}
            if req["status"] != "PENDING":
                return {"error": "This request has already been handled."}
            # Only the recipient may accept/reject; only the sender may cancel
            if status == "CANCELLED" and acting_user != req["sender_name"]:
                return {"error": "Only the sender can cancel a request."}
            if status in ("ACCEPTED", "REJECTED") and acting_user != req["recipient_name"]:
                return {"error": "Only the recipient can respond to a request."}

            cursor.execute("UPDATE friend_requests SET status = ?, responded_at = ? WHERE id = ?", (status, now, req_id))

            if status == "ACCEPTED":
                # Create mutual friendship
                fid = str(uuid.uuid4())
                cursor.execute("""
                    INSERT OR IGNORE INTO friendships (id, user_a_name, user_b_name, created_at)
                    VALUES (?, ?, ?, ?)
                """, (fid, req["sender_name"], req["recipient_name"], now))

                # Notify sender
                notif_id = str(uuid.uuid4())
                cursor.execute("""
                    INSERT INTO notifications (id, recipient_name, type, title, message, created_at)
                    VALUES (?, ?, 'FRIEND_ACCEPTED', 'Friend Request Accepted', ?, ?)
                """, (notif_id, req["sender_name"], f"{req['recipient_name']} accepted your friend request.", now))

            conn.commit()
            return {"success": True}

        elif action == "remove_friend":
            user_a = params["userA"]
            user_b = params["userB"]
            cursor.execute("""
                DELETE FROM friendships
                WHERE (user_a_name = ? AND user_b_name = ?) OR (user_a_name = ? AND user_b_name = ?)
            """, (user_a, user_b, user_b, user_a))
            conn.commit()
            return {"success": True}

        elif action == "block_user":
            blocker = params["blocker"]
            blocked = params["blocked"]
            bid = str(uuid.uuid4())
            now = time.time()
            cursor.execute("""
                INSERT OR IGNORE INTO user_blocks (id, blocker_name, blocked_name, created_at)
                VALUES (?, ?, ?, ?)
            """, (bid, blocker, blocked, now))
            if blocker == blocked:
                return {"error": "You cannot block yourself."}
            # Also remove any friendship and cancel pending requests between the pair
            cursor.execute("""
                DELETE FROM friendships
                WHERE (user_a_name = ? AND user_b_name = ?) OR (user_a_name = ? AND user_b_name = ?)
            """, (blocker, blocked, blocked, blocker))
            cursor.execute("""
                UPDATE friend_requests SET status = 'CANCELLED', responded_at = ?
                WHERE status = 'PENDING'
                  AND ((sender_name = ? AND recipient_name = ?) OR (sender_name = ? AND recipient_name = ?))
            """, (now, blocker, blocked, blocked, blocker))
            conn.commit()
            return {"success": True}

        elif action == "unblock_user":
            blocker = params["blocker"]
            blocked = params["blocked"]
            cursor.execute("DELETE FROM user_blocks WHERE blocker_name = ? AND blocked_name = ?", (blocker, blocked))
            conn.commit()
            return {"success": True}

        elif action == "read_notification":
            notif_id = params["notificationId"]
            cursor.execute(
                "UPDATE notifications SET is_read = 1 WHERE id = ? AND recipient_name = ?",
                (notif_id, params.get("username")),
            )
            conn.commit()
            return {"success": True}

        elif action == "read_all_notifications":
            user = params["username"]
            cursor.execute("UPDATE notifications SET is_read = 1 WHERE recipient_name = ?", (user,))
            conn.commit()
            return {"success": True}

        elif action == "send_game_invitation":
            sender = params["senderName"]
            recipient = params["recipientName"]
            room_code = str(params["roomCode"])[:20]
            if sender == recipient:
                return {"error": "You cannot invite yourself."}
            if not _user_exists(cursor, recipient):
                return {"error": "Player not found."}
            cursor.execute("""
                SELECT 1 FROM user_blocks
                WHERE (blocker_name = ? AND blocked_name = ?) OR (blocker_name = ? AND blocked_name = ?)
            """, (sender, recipient, recipient, sender))
            if cursor.fetchone():
                return {"error": "Social interaction is blocked between these users."}
            inv_id = str(uuid.uuid4())
            now = time.time()
            expires = now + 300  # 5 minutes expiry

            cursor.execute("""
                INSERT INTO game_invitations (id, sender_name, recipient_name, room_code, status, created_at, expires_at)
                VALUES (?, ?, ?, ?, 'PENDING', ?, ?)
            """, (inv_id, sender, recipient, room_code, now, expires))

            notif_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO notifications (id, recipient_name, type, title, message, data_json, created_at)
                VALUES (?, ?, 'GAME_INVITATION', 'Game Invitation', ?, ?, ?)
            """, (notif_id, recipient, f"{sender} invited you to a moonlit match in room {room_code}!", json.dumps({"invitationId": inv_id, "roomCode": room_code, "sender": sender}), now))

            conn.commit()
            return {"success": True, "invitationId": inv_id}

        elif action == "get_invitations":
            user = params["username"]
            now = time.time()
            cursor.execute("""
                SELECT * FROM game_invitations
                WHERE recipient_name = ? AND status = 'PENDING' AND expires_at > ?
                ORDER BY created_at DESC
            """, (user, now))
            rows = cursor.fetchall()
            return {
                "invitations": [{
                    "id": r["id"],
                    "senderName": r["sender_name"],
                    "roomCode": r["room_code"],
                    "createdAt": r["created_at"],
                    "expiresAt": r["expires_at"],
                } for r in rows]
            }

        else:
            return {"error": f"Unknown database action '{action}'"}

    except Exception as e:
        return {"error": str(e), "type": e.__class__.__name__}
    finally:
        conn.close()


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No action provided"}))
        sys.exit(1)

    action = sys.argv[1]
    params = {}
    if len(sys.argv) > 2:
        try:
            params = json.loads(sys.argv[2])
        except Exception:
            print(json.dumps({"error": "Invalid JSON parameters."}))
            sys.exit(1)

    res = execute_action(action, params)
    print(json.dumps(res))


if __name__ == "__main__":
    main()
