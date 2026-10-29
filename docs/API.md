# AFTERLIGHT — REST API Contract

All endpoints return JSON responses. Authentication uses `x-user-id` and `x-username` session headers.

## 1. Authentication
- `POST /api/auth/register` — Registers a new user and creates an initialized player profile.
- `POST /api/auth/login` — Verifies password hash and logs in user.
- `POST /api/auth/logout` — Destroys session.
- `GET /api/auth/me` — Retrieves current authenticated profile.

## 2. Profiles & Discovery
- `PUT /api/profile` — Updates display name, bio, and visual avatar.
- `GET /api/players?q=<search>` — Searches players by username or display name.

## 3. Matches & AI Engine
- `POST /api/games/bot` — Creates a match against Wanderer, Sentinel, or The Unbroken.
- `POST /api/games/bot/move` — Submits human move and invokes Python AI counter-move.
- `GET /api/games/history?username=<user>` — Returns match history and board thumbnails.

## 4. Social & Friends
- `GET /api/social/overview` — Retrieves friends, incoming/outgoing requests, blocked users, and notifications.
- `POST /api/friend-requests` — Sends a new friend request.
- `POST /api/friend-requests/:id/respond` — Accepts or rejects a friend request.
- `DELETE /api/friends/:friendName` — Removes an accepted friend.
- `POST /api/users/:targetUser/block` — Blocks social interactions with a user.

## 5. Invitations & Notifications
- `POST /api/invitations` — Sends a direct game invitation with 5-minute expiry.
- `GET /api/invitations` — Retrieves active pending invitations.
- `POST /api/notifications/:id/read` — Marks a notification as read.
- `POST /api/notifications/read-all` — Marks all notifications as read.

## 6. Academic OOP Lab Endpoints
- `POST /api/oop/polymorphism-demo` — Runs `backend/engine_cli.py polymorphism-compare`.
- `POST /api/oop/encapsulation-demo` — Runs `backend/engine_cli.py test-encapsulation`.
- `GET /api/oop/class-registry` — Introspects Python classes and methods.
- `POST /api/oop/run-tests` — Executes `backend/tests/test_engine.py` on the server and returns pass/fail logs.
