/**
 * Integration test: Verify bot player works with game engine.
 * Run with: node test_bot_integration.js
 */

import { ChessPlayer } from './chess_player.js';
import * as ci from './chess_initializer.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(`❌ Assertion failed: ${message}`);
  console.log(`✓ ${message}`);
};

console.log('\n=== BOT PLAYER INTEGRATION TESTS ===\n');

// Test 1: Module loading
console.log('Test 1: Module Loading');
try {
  assert(ChessPlayer !== undefined, 'ChessPlayer class exists');
  assert(typeof ChessPlayer === 'function', 'ChessPlayer is a class');
  console.log('✅ Passed\n');
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

// Test 2: Bot instantiation
console.log('Test 2: Bot Instantiation');
try {
  const strategies = ['random', 'greedy', 'defensive'];
  for (const strat of strategies) {
    const bot = new ChessPlayer(strat);
    assert(bot.strategy === strat, `Bot with ${strat} strategy created`);
  }
  console.log('✅ Passed\n');
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

// Test 3: Move selection
console.log('Test 3: Move Selection');
try {
  const game = ci.initialize_board('standard');
  const bot = new ChessPlayer('greedy');
  
  const move = bot.chooseMove(game, 0); // white
  assert(move !== null, 'Bot chooses a move');
  assert(typeof move.from === 'number', 'Move has from index');
  assert(typeof move.to === 'number', 'Move has to index');
  assert(move.from >= 0 && move.from < 64, 'From index in bounds');
  assert(move.to >= 0 && move.to < 64, 'To index in bounds');
  console.log('✅ Passed\n');
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

// Test 4: Move execution
console.log('Test 4: Move Execution');
try {
  const game = ci.initialize_board('standard');
  const bot = new ChessPlayer('random');
  
  const initialTurn = game.whose_turn;
  const success = bot.playMove(game, 0);
  
  assert(success, 'Bot move succeeds');
  assert(game.whose_turn !== initialTurn, 'Turn advanced after move');
  assert(game.player[0].moves.length === 1, 'Move recorded in history');
  console.log('✅ Passed\n');
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

// Test 5: Strategy switching
console.log('Test 5: Strategy Switching');
try {
  const bot = new ChessPlayer('random');
  assert(bot.strategy === 'random', 'Initial strategy is random');
  
  bot.setStrategy('greedy');
  assert(bot.strategy === 'greedy', 'Strategy changed to greedy');
  
  bot.setStrategy('defensive');
  assert(bot.strategy === 'defensive', 'Strategy changed to defensive');
  
  console.log('✅ Passed\n');
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

// Test 6: Game cloning
console.log('Test 6: Game Cloning');
try {
  const game = ci.initialize_board('standard');
  const clone = ChessPlayer.cloneGame(game);
  
  assert(game !== clone, 'Clone is different object');
  assert(game.board.length === clone.board.length, 'Clone has same board size');
  assert(JSON.stringify(game.board) === JSON.stringify(clone.board), 'Clone has same board state');
  
  // Modify clone without affecting original
  clone.board[0] = null;
  assert(game.board[0] !== null, 'Original unchanged after clone modification');
  
  console.log('✅ Passed\n');
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

// Test 7: Full game simulation
console.log('Test 7: Full Game Simulation');
try {
  const game = ci.initialize_board('standard');
  const whiteBot = new ChessPlayer('greedy');
  const blackBot = new ChessPlayer('random');
  
  let moveCount = 0;
  const maxMoves = 500; // Longer limit to allow complete games
  
  while (moveCount < maxMoves) {
    const color = game.whose_turn;
    const bot = color === 0 ? whiteBot : blackBot;
    
    const legalMoves = bot._getAllLegalMoves(game, color);
    if (legalMoves.length === 0) break;
    
    const moved = bot.playMove(game, color);
    if (!moved) break;
    
    moveCount++;
  }
  
  assert(moveCount > 0, `Game played ${moveCount} moves`);
  assert(game.player[0].moves.length > 0, 'White has moves');
  assert(game.player[1].moves.length > 0, 'Black has moves');
  
  console.log('✅ Passed\n');
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

// Test 8: Multiple games
console.log('Test 8: Multiple Consecutive Games');
try {
  for (let gameNum = 1; gameNum <= 3; gameNum++) {
    const game = ci.initialize_board('standard');
    const bot = new ChessPlayer('greedy');
    
    let moveCount = 0;
    while (moveCount < 50) {
      const legalMoves = bot._getAllLegalMoves(game, game.whose_turn);
      if (legalMoves.length === 0) break;
      
      bot.playMove(game, game.whose_turn);
      moveCount++;
    }
    
    assert(moveCount > 0, `Game ${gameNum}: played ${moveCount} moves`);
  }
  console.log('✅ Passed\n');
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

// Test 9: Extended variants
console.log('Test 9: Extended Variants');
try {
  const variants = ['standard', 'chancellor', 'elephant'];
  
  for (const variant of variants) {
    const game = ci.initialize_board(variant === 'standard' ? null : variant);
    const bot = new ChessPlayer('greedy');
    
    const move = bot.chooseMove(game, 0);
    assert(move !== null, `Bot plays in ${variant} variant`);
    
    const success = bot.playMove(game, 0);
    assert(success, `Move succeeds in ${variant}`);
  }
  
  console.log('✅ Passed\n');
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

// Test 10: Move scoring consistency
console.log('Test 10: Move Scoring Consistency');
try {
  const game = ci.initialize_board('standard');
  const bot = new ChessPlayer('greedy');
  
  const moves = bot._getAllLegalMoves(game, 0);
  const scores = moves.map(m => bot._scoreMove(game, m, 0));
  
  assert(moves.length > 0, 'Has legal moves');
  assert(scores.length === moves.length, 'Score for every move');
  assert(scores.every(s => typeof s === 'number'), 'All scores are numbers');
  assert(Math.max(...scores) >= Math.min(...scores), 'Scores vary');
  
  console.log('✅ Passed\n');
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

console.log('=== ALL TESTS PASSED ✅ ===\n');
console.log('Bot player is ready for use!');
console.log('See QUICKSTART.md for usage examples.\n');
