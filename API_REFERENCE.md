# Bot Player API Reference

## ChessPlayer Class

### Constructor
```javascript
new ChessPlayer(strategy)
```
**Parameters:**
- `strategy` {string} - "random", "greedy", or "defensive"

**Example:**
```javascript
const bot = new ChessPlayer("greedy");
```

---

### Methods

#### chooseMove(game, color)
Evaluate position and return best move without executing it.

```javascript
chooseMove(game, color) → {from, to} | null
```

**Parameters:**
- `game` {object} - Game state
- `color` {number} - 0=white, 1=black

**Returns:**
- `{from, to}` - Move with from/to indices
- `null` - No legal moves

**Example:**
```javascript
const move = bot.chooseMove(game, 0);
if (move) {
  console.log(`Best move: ${move.from} → ${move.to}`);
}
```

---

#### playMove(game, color)
Execute the best move for a player and advance turn.

```javascript
playMove(game, color) → boolean
```

**Parameters:**
- `game` {object} - Game state
- `color` {number} - 0=white, 1=black

**Returns:**
- `true` - Move executed successfully
- `false` - No legal moves available

**Example:**
```javascript
if (bot.playMove(game, 0)) {
  console.log("White moved");
  board.render();
}
```

---

#### setStrategy(strategy)
Change the bot's strategy at runtime.

```javascript
setStrategy(strategy) → void
```

**Parameters:**
- `strategy` {string} - "random", "greedy", or "defensive"

**Example:**
```javascript
bot.setStrategy("defensive");
```

---

#### static cloneGame(game)
Create a deep copy of game state for analysis without side effects.

```javascript
ChessPlayer.cloneGame(game) → object
```

**Parameters:**
- `game` {object} - Game state to clone

**Returns:**
- {object} - Independent copy of game state

**Example:**
```javascript
const clone = ChessPlayer.cloneGame(game);
// Modify clone without affecting original
clone.board[0] = null;
console.log(game.board[0]); // Still unchanged
```

---

### Internal Methods (Advanced)

#### _getAllLegalMoves(game, color)
Get all legal moves for a player.

**Returns:** Array of `{from, to}` moves

#### _scoreMove(game, move, color)
Evaluate a single move based on strategy.

**Returns:** {number} - Move score

#### _greedyStrategy(game, moves, color)
Greedy strategy implementation.

**Returns:** {from, to} - Best move

#### _defensiveStrategy(game, moves, color)
Defensive strategy implementation.

**Returns:** {from, to} - Best move

#### _isDefended(game, index, byColor)
Check if a square is defended by a player.

**Returns:** {boolean}

---

## BotManager Class

### Constructor
```javascript
new BotManager(game, boardElement)
```

**Parameters:**
- `game` {object} - Game state
- `boardElement` {HTMLElement} - Chess board element

**Example:**
```javascript
const manager = new BotManager(game, document.getElementById("chess_board"));
```

---

### Methods

#### setPlayer(color, player)
Assign a player (bot or human) to a color.

```javascript
setPlayer(color, player) → void
```

**Parameters:**
- `color` {number} - 0=white, 1=black
- `player` {ChessPlayer|null} - Bot instance or null for human

**Example:**
```javascript
manager.setPlayer(0, new ChessPlayer("greedy")); // white bot
manager.setPlayer(1, null); // black human
```

---

#### setMoveDelay(ms)
Set delay between bot moves in milliseconds.

```javascript
setMoveDelay(ms) → void
```

**Parameters:**
- `ms` {number} - Milliseconds (0-3000+)

**Example:**
```javascript
manager.setMoveDelay(1000); // 1 second between moves
```

---

#### playAutomated()
Run automatic play until game ends (async).

```javascript
playAutomated() → Promise
```

**Behavior:**
- Runs until checkmate, stalemate, or human turn
- Respects human players (stops when it's their turn)
- Renders board after each move

**Example:**
```javascript
await manager.playAutomated();
console.log("Game ended");
```

---

#### nextMove()
Execute current player's move (async).

```javascript
nextMove() → Promise
```

**Behavior:**
- If bot's turn: plays move
- If human's turn: does nothing (or waits for input)

**Example:**
```javascript
await manager.nextMove();
board.render();
```

---

#### stop()
Stop automated play.

```javascript
stop() → void
```

**Example:**
```javascript
manager.stop();
```

---

#### newGame(variant)
Reset and start a new game.

```javascript
newGame(variant) → void
```

**Parameters:**
- `variant` {string} - "standard", "chancellor", or "elephant"

**Example:**
```javascript
manager.newGame("chancellor");
```

---

#### setOnMoveCallback(callback)
Set callback to fire after each move.

```javascript
setOnMoveCallback(callback) → void
```

**Parameters:**
- `callback` {function(color, game)} - Callback function

**Example:**
```javascript
manager.setOnMoveCallback((color, game) => {
  console.log(`${color === 0 ? "White" : "Black"} moved`);
});
```

---

### Properties

#### isRunning
{boolean} - Whether automated play is running.

```javascript
if (manager.isRunning) {
  manager.stop();
}
```

#### players
{object} - Player assignments {0: ChessPlayer|null, 1: ChessPlayer|null}

```javascript
console.log(manager.players[0]); // White player
```

#### game
{object} - Current game state.

```javascript
console.log(manager.game.whose_turn);
```

---

## Strategy Comparison

### Random Strategy
```javascript
new ChessPlayer("random")
```
- **Speed:** Instant
- **Strength:** Weak
- **Use:** Testing, baseline, fun
- **Behavior:** Any legal move picked randomly

### Greedy Strategy
```javascript
new ChessPlayer("greedy")
```
- **Speed:** Instant
- **Strength:** Good
- **Use:** Recommended for most games
- **Behavior:** 
  - Prioritize captures (weighted by piece value)
  - Control center (rank 3-6, file c-f)
  - Develop pieces from back rank
  - Advance pawns

**Scoring:**
```
score = 0
score += target.piece.value * 10  // capture
score += 2                        // center
score += 1                        // development
score += pawn_progress * 0.5      // pawn advance
```

### Defensive Strategy
```javascript
new ChessPlayer("defensive")
```
- **Speed:** Instant
- **Strength:** Moderate
- **Use:** Survival, long games
- **Behavior:**
  - Avoid hanging pieces
  - Prioritize safe squares
  - Capture attackers
  - Control center

---

## Common Patterns

### Bot vs Bot
```javascript
import { ChessPlayer } from "./chess_player.js";
import { BotManager } from "./chess_bot_manager.js";

const manager = new BotManager(game, board);
manager.setPlayer(0, new ChessPlayer("greedy"));
manager.setPlayer(1, new ChessPlayer("defensive"));
await manager.playAutomated();
```

### Human vs Bot
```javascript
manager.setPlayer(0, null); // Human plays white
manager.setPlayer(1, new ChessPlayer("greedy")); // Bot plays black

// After human moves:
await manager.nextMove(); // Bot responds
```

### Analysis Mode
```javascript
const bot = new ChessPlayer("greedy");
const moves = bot._getAllLegalMoves(game, 0);

for (const move of moves) {
  const score = bot._scoreMove(game, move, 0);
  console.log(`${move.from}→${move.to}: ${score}`);
}
```

### Cloning for Lookahead
```javascript
const original = game;
const clone = ChessPlayer.cloneGame(original);

// Experiment on clone
bot.playMove(clone, 0);
// Original untouched
console.log(original.whose_turn); // Still 0
```

---

## Error Handling

```javascript
// Choose move safely
const move = bot.chooseMove(game, 0);
if (move === null) {
  console.log("Game over or stalemate");
} else {
  const success = ce.move_piece(game, move.from, move.to);
  if (!success) {
    console.error("Move failed");
  }
}

// Play move with error check
if (!bot.playMove(game, 0)) {
  console.log("No legal moves for white");
}
```

---

## Performance Notes

| Operation | Time |
|-----------|------|
| chooseMove() | ~1ms |
| playMove() | ~1ms |
| Full game (500 moves) | <1s |
| cloneGame() | ~10ms |
| Memory per game | ~100KB |

---

## Limitations

- No lookahead (single-position evaluation only)
- No endgame logic
- No opening book
- Material-focused (captures weighted heavily)
- No time management
- Instant move selection

For more details, see PLAYER_GUIDE.md

