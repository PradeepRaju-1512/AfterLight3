# AFTERLIGHT — Database Design & Schema Specification

**Engine:** SQLite 3 (ACID-compliant relational database with foreign key enforcement)  
**Location:** `afterlight.db`  
**Initializer Script:** `backend/database.py`

## 1. Entity-Relationship Overview

```
 [ users ] 1 <----> 1 [ player_profiles ]
     |
     +---< [ friend_requests ] >---+
     |                             |
     +---< [ friendships ] >-------+
     |                             |
     +---< [ user_blocks ] >-------+
     |
     +---< [ game_invitations ]
     |
     +---< [ notifications ]

 [ games ] 1 <---- M [ moves ]
```

## 2. Table Schemas

### `users`
- `id` (TEXT, Primary Key)
- `username` (TEXT, Unique, Indexed)
- `email` (TEXT, Unique, Indexed)
- `password_hash` (TEXT, Salted SHA-256)
- `created_at` (REAL, Timestamp)

### `player_profiles`
- `user_id` (TEXT, Foreign Key -> `users.id`, ON DELETE CASCADE)
- `display_name` (TEXT)
- `avatar` (TEXT)
- `bio` (TEXT)
- `total_games` (INTEGER)
- `wins` (INTEGER)
- `losses` (INTEGER)
- `draws` (INTEGER)
- `win_rate` (REAL)
- `rating` (INTEGER)
- `is_online` (BOOLEAN)

### `games`
- `id` (TEXT, Primary Key)
- `mode` (TEXT: 'BOT' | 'ONLINE')
- `bot_difficulty` (TEXT: 'wanderer' | 'sentinel' | 'unbroken')
- `player_x_name` (TEXT, Indexed)
- `player_o_name` (TEXT, Indexed)
- `board_state` (TEXT, 9 chars: 'X.O......')
- `current_turn` (TEXT: 'X' | 'O')
- `status` (TEXT: 'ACTIVE' | 'COMPLETED' | 'CANCELLED')
- `outcome` (TEXT: 'WIN_X' | 'WIN_O' | 'DRAW' | 'IN_PROGRESS')
- `winner_name` (TEXT)
- `winning_line` (TEXT, JSON array of indices)
- `room_code` (TEXT)
- `created_at` (REAL)
- `completed_at` (REAL)

### `moves`
- `id` (TEXT, Primary Key)
- `game_id` (TEXT, Foreign Key -> `games.id`, ON DELETE CASCADE)
- `move_number` (INTEGER)
- `player_name` (TEXT)
- `mark` (TEXT)
- `position` (INTEGER, 0..8)
- `created_at` (REAL)
- Constraints: `UNIQUE(game_id, move_number)`, `UNIQUE(game_id, position)`

### `friendships`
- `id` (TEXT, Primary Key)
- `user_a_name` (TEXT, Indexed)
- `user_b_name` (TEXT)
- `created_at` (REAL)
- Constraints: `UNIQUE(user_a_name, user_b_name)`

### `friend_requests`
- `id` (TEXT, Primary Key)
- `sender_name` (TEXT)
- `recipient_name` (TEXT)
- `status` (TEXT: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED')
- `created_at` (REAL)
- `responded_at` (REAL)

### `game_invitations`
- `id` (TEXT, Primary Key)
- `sender_name` (TEXT)
- `recipient_name` (TEXT)
- `room_code` (TEXT)
- `status` (TEXT: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED')
- `created_at` (REAL)
- `expires_at` (REAL)

### `notifications`
- `id` (TEXT, Primary Key)
- `recipient_name` (TEXT, Indexed)
- `type` (TEXT)
- `title` (TEXT)
- `message` (TEXT)
- `data_json` (TEXT)
- `is_read` (BOOLEAN)
- `created_at` (REAL)
