# Deterministic Chess Player

A rule-based, non-AI chess player for the miniature-funicular project. No machine learning—just deterministic strategies that follow static evaluation rules.

## Architecture

### Core Components

1. **`chess_player.js`** - The bot player engine
   - Evaluates positions based on strategies
   - Selects moves deterministically
   - Three built-in strategies: random, greedy, defensive

2. **`chess_bot_manager.js`** - Game orchestration
   - Manages bot vs human, bot vs bot gameplay
   - Handles turn timing and automation
   - Coordinates UI updates

3. **`chess_board.js`** (updated) - Integrates bot support
   - Initializes BotManager
   - Renders moves automatically

## Strategies

### Random Strategy
Picks any legal move at random.
- **Use case:** Baseline for testing
- **Characteristics:** Unpredictable but weak

### Greedy Strategy (Recommended)
Prioritizes moves in order:
1. Capturing opponent pieces (weighted by value)
2. Controlling the center
3. Developing pieces from the back rank
4. Pawn advancement

**Move scoring:**
```
score = 0
score += target.piece.value * 10  (capture bonus)
score += 2                         (center control)
score += 1                         (development)
score += advance * 0.5             (pawn progress)
```

- **Use case:** Strong baseline for single-game play
- **Characteristics:** Tactical, captures material when possible

### Defensive Strategy
Prioritizes safety:
1. Only considers "safe" moves (piece won't hang)
2. Prefers capturing attacking pieces
3. Avoids hanging pieces
4. Never moves into direct attack

- **Use case:** Survival-focused, rarely makes blunders
- **Characteristics:** Cautious but can be passive

## Usage

### Browser (Human vs Bot)

```html
<script type="module">
  import { ChessPlayer } from "./chess_player.js";
  
  const board = document.getElementById("chess_board");
  const whiteBot = new ChessPlayer("greedy");
  
  // After human moves, trigger bot response:
  whiteBot.playMove(board.game, 0); // white plays
  board.render();
</script>
```

### Browser (Bot vs Bot)

```html
<script type="module">
  import { BotManager } from "./chess_bot_manager.js";
  import { ChessPlayer } from "./chess_player.js";
  
  const board = document.getElementById("chess_board");
  const manager = board.botManager;
  
  manager.setPlayer(0, new ChessPlayer("greedy"));
  manager.setPlayer(1, new ChessPlayer("defensive"));
  manager.setMoveDelay(1000); // 1 second between moves
  
  // Run until game ends
  await manager.playAutomated();
</script>
```

### Node.js (Programmatic Testing)

```javascript
import { ChessPlayer } from "./chess_player.js";
import * as ci from "./chess_initializer.js";

const game = ci.initialize_board("standard");
const whiteBot = new ChessPlayer("greedy");
const blackBot = new ChessPlayer("random");

while (!isGameOver(game)) {
  const color = game.whose_turn;
  const bot = color === 0 ? whiteBot : blackBot;
  bot.playMove(game, color);
}
```

## API Reference

### ChessPlayer

#### Constructor
```javascript
new ChessPlayer(strategy)
```
- **strategy** `string`: "random", "greedy", or "defensive"

#### Methods

##### `chooseMove(game, color)`
Evaluates position and returns best move.
- **game** `object`: Game state
- **color** `number`: 0=white, 1=black
- **returns** `{from, to}`: Move indices, or null if no legal moves

##### `playMove(game, color)`
Executes best move and advances turn.
- **game** `object`: Game state
- **color** `number`: 0=white, 1=black
- **returns** `boolean`: Success

##### `setStrategy(strategy)`
Change strategy at runtime.
- **strategy** `string`: "random", "greedy", "defensive"

##### `static cloneGame(game)`
Deep copy game state for analysis without side effects.
- **game** `object`: Game state
- **returns** `object`: Independent game copy

### BotManager

#### Constructor
```javascript
new BotManager(game, boardElement)
```
- **game** `object`: Game state
- **boardElement** `HTMLElement`: Chess board element

#### Methods

##### `setPlayer(color, player)`
Assign player type (bot or human).
- **color** `number`: 0=white, 1=black
- **player** `ChessPlayer|null`: Bot instance or null for human

##### `setMoveDelay(ms)`
Set delay between bot moves.
- **ms** `number`: Milliseconds

##### `playAutomated()`
Run automatic play (async).
- Continues until game ends or stopped
- Respects human players (stops when it's their turn)

##### `nextMove()`
Execute current player's move (async).
- Respects bot vs human assignment

##### `stop()`
Stop automated play.

##### `newGame(variant)`
Reset with new game variant.
- **variant** `string`: "standard", "chancellor", "elephant"

##### `setOnMoveCallback(callback)`
Trigger callback after each move.
- **callback** `(color, game) => void`

## Implementation Details

### Move Evaluation

Each strategy evaluates moves based on heuristics:

```javascript
_scoreMove(game, move, color) {
  let score = 0;
  
  // Capture? Add piece value
  const target = game.board[move.to];
  if (target && target.color !== color) {
    score += target.piece.value * 10;
  }
  
  // Control center?
  if (isCenter(move.to, game.size)) {
    score += 2;
  }
  
  // Develop piece?
  if (isBackRank(move.from, color, game.size)) {
    score += 1;
  }
  
  return score;
}
```

### Game State Cloning

Since the engine modifies game state in-place, bot lookahead requires cloning:

```javascript
const clone = ChessPlayer.cloneGame(game);
// Modify clone without affecting original
clone.board[toIndex] = clone.board[fromIndex];
// Original game unchanged
```

## Extending

### Custom Strategies

Add new strategies to `ChessPlayer`:

```javascript
class ChessPlayer {
  chooseMove(game, color) {
    switch (this.strategy) {
      case "myStrategy":
        return this._myStrategy(game, moves, color);
    }
  }
  
  _myStrategy(game, moves, color) {
    // Your logic here
    return bestMove;
  }
}
```

### Scoring Improvements

Override `_scoreMove` for custom evaluation:

```javascript
_scoreMove(game, move, color) {
  let score = super._scoreMove(game, move, color);
  
  // Add custom heuristics
  if (movesControlKey) score += 50;
  if (movesProtectKing) score += 20;
  
  return score;
}
```

## Performance Considerations

- **Move generation:** O(n) where n = pieces on board
- **Legal move checking:** O(n*m) where m = max moves per piece
- **Strategy evaluation:** Scores all legal moves (typically 20-40 moves)
- **No caching:** Each `chooseMove()` recalculates

For deeper analysis (lookahead), consider:
- Caching evaluated positions
- Alpha-beta pruning for minimax
- Transposition tables

## Testing

Run the examples:
```bash
node examples.js
```

Or in browser:
```html
<script type="module">
  import * as ex from "./examples.js";
  ex.botVsBot();
  ex.compareStrategies();
  ex.analyzePosition();
</script>
```

## Limitations

- **No lookahead:** Evaluates only current position
- **No endgame logic:** Doesn't distinguish endgames
- **Material-focused:** Weights captures heavily
- **Static evaluation:** No positional learning
- **No time management:** Instant move selection

These are intentional—the goal is deterministic, understandable behavior, not competitive AI.
