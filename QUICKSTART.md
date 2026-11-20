# Quick Start: Deterministic Bot Player

## What Was Built

Three new files enable rule-based chess players:

1. **`chess_player.js`** - Bot with 3 strategies (random, greedy, defensive)
2. **`chess_bot_manager.js`** - Game orchestration and automation
3. **`PLAYER_GUIDE.md`** - Full documentation

Updated:
- **`chess_board.js`** - Now integrates BotManager
- **`index.html`** - New UI for bot controls and game modes

## Quickest Start (Browser)

The HTML now has dropdown menus to select bot strategies. Load `index.html` and:

1. Choose player types (Human, Bot-Random, Bot-Greedy, Bot-Defensive)
2. Click "Auto Play (Both Bots)" to run bot vs bot
3. Or play Human vs Bot by selecting Human for one side

## Quickest Start (Node/Testing)

```bash
node -e "
import('./chess_player.js').then(({ ChessPlayer }) => {
  import('./chess_initializer.js').then(({ initialize_board, ce }) => {
    const game = initialize_board('standard');
    const bot = new ChessPlayer('greedy');
    
    // Play 10 moves
    for (let i = 0; i < 10; i++) {
      bot.playMove(game, game.whose_turn);
    }
    
    console.log('White moves:', game.player[0].moves.length);
    console.log('Black moves:', game.player[1].moves.length);
  });
});"
```

## Key Classes

### ChessPlayer

```javascript
const bot = new ChessPlayer('greedy'); // or 'random', 'defensive'

// Get best move without executing
const move = bot.chooseMove(game, 0); // white

// Execute move and advance turn
bot.playMove(game, 0);

// Change strategy dynamically
bot.setStrategy('defensive');

// Clone game for analysis
const copy = ChessPlayer.cloneGame(game);
```

### BotManager

```javascript
const manager = new BotManager(game, boardElement);

// Assign players
manager.setPlayer(0, new ChessPlayer('greedy')); // white bot
manager.setPlayer(1, null); // black human

// Set speed
manager.setMoveDelay(1000); // 1 second

// Run automation
await manager.playAutomated();

// Or single moves
await manager.nextMove();
```

## Strategies Comparison

| Strategy | Strength | Speed | Style |
|----------|----------|-------|-------|
| **Random** | Weak | Instant | Unpredictable |
| **Greedy** | Good | Instant | Tactical, captures |
| **Defensive** | Okay | Instant | Cautious, safe |

## Three Ways to Play

### 1. Human vs Bot (Browser)
- Select "Human" for white, "Bot (Greedy)" for black
- Play normally (drag pieces)
- Bot responds automatically

### 2. Bot vs Bot (Browser)
- Select bot strategies for both
- Click "Auto Play"
- Watch them play

### 3. Programmatic Testing
```javascript
import { ChessPlayer } from './chess_player.js';
import * as ci from './chess_initializer.js';

const game = ci.initialize_board('standard');
const whiteBot = new ChessPlayer('greedy');
const blackBot = new ChessPlayer('random');

while (!isGameOver(game)) {
  whiteBot.playMove(game, 0);
  if (!isGameOver(game)) blackBot.playMove(game, 1);
}
```

## Customization

### Add a New Strategy

Edit `chess_player.js`:

```javascript
chooseMove(game, color) {
  switch (this.strategy) {
    case "myStrategy":
      return this._myStrategy(game, moves, color);
  }
}

_myStrategy(game, moves, color) {
  // Your logic
  return bestMove;
}
```

### Change Move Scoring

Override `_scoreMove()` in ChessPlayer:

```javascript
_scoreMove(game, move, color) {
  let score = 0;
  score += captureValue(game, move);
  score += myCustomHeuristic(game, move);
  return score;
}
```

### Speed Control

```javascript
manager.setMoveDelay(500); // Faster
manager.setMoveDelay(3000); // Slower
```

## Files Overview

```
chess_player.js          ← Implements strategies
chess_bot_manager.js     ← Orchestrates gameplay
chess_board.js           ← Updated to support bots
index.html               ← Updated with bot controls
PLAYER_GUIDE.md          ← Full documentation
examples.js              ← Example code (runnable)
```

## Next Steps

1. **Try the UI** - Load `index.html`, play bot vs bot
2. **Read PLAYER_GUIDE.md** - Understand strategies in depth
3. **Extend** - Add custom strategies or scoring rules
4. **Test** - Use `examples.js` or Node.js for benchmarking
5. **Improve** - Upgrade from static scoring to lookahead/minimax

---

**Status:** ✅ Fully functional, ready for use or extension
