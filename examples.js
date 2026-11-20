/**
 * Example: Running a chess game with deterministic bots or human players.
 * 
 * This file demonstrates how to use ChessPlayer and BotManager
 * to run various game scenarios.
 */

import { ChessPlayer } from "./chess_player.js";
import * as ci from "./chess_initializer.js";

// Example 1: Simple bot vs bot game (programmatic)
export function botVsBot() {
    const game = ci.initialize_board("standard");
    
    const whiteBot = new ChessPlayer("greedy");
    const blackBot = new ChessPlayer("greedy");
    
    let moveCount = 0;
    const maxMoves = 500; // Prevent infinite loops
    
    while (moveCount < maxMoves) {
        const color = game.whose_turn;
        const bot = color === 0 ? whiteBot : blackBot;
        
        // Check game status
        if (ci.ce.is_checkmate(game, color)) {
            console.log(`${color === 0 ? "White" : "Black"} is in checkmate!`);
            break;
        }
        if (ci.ce.is_stalemate(game, color)) {
            console.log(`Game is stalemate!`);
            break;
        }
        
        // Play move
        const moved = bot.playMove(game, color);
        if (!moved) {
            console.log(`${color === 0 ? "White" : "Black"} has no legal moves.`);
            break;
        }
        
        moveCount++;
        
        // Log move
        const lastMove = game.player[color].moves[game.player[color].moves.length - 1];
        const from = ci.ce.index_to_address(lastMove.from, game.size);
        const to = ci.ce.index_to_address(lastMove.to, game.size);
        console.log(`${moveCount}. ${color === 0 ? "White" : "Black"}: ${from} → ${to}`);
    }
    
    console.log("Game complete!");
    return game;
}

// Example 2: Different strategies
export function compareStrategies() {
    const strategies = ["random", "greedy", "defensive"];
    
    for (const strategy of strategies) {
        console.log(`\n========== Testing ${strategy.toUpperCase()} strategy ==========`);
        
        const game = ci.initialize_board("standard");
        const whiteBot = new ChessPlayer(strategy);
        const blackBot = new ChessPlayer("random"); // Always opponent random
        
        let moveCount = 0;
        const maxMoves = 100;
        
        while (moveCount < maxMoves) {
            const color = game.whose_turn;
            const bot = color === 0 ? whiteBot : blackBot;
            
            if (ci.ce.is_checkmate(game, color)) {
                console.log(`${strategy}: Checkmate! (${moveCount} moves)`);
                break;
            }
            if (ci.ce.is_stalemate(game, color)) {
                console.log(`${strategy}: Stalemate (${moveCount} moves)`);
                break;
            }
            
            if (!bot.playMove(game, color)) {
                console.log(`${strategy}: No legal moves (${moveCount} moves)`);
                break;
            }
            
            moveCount++;
        }
        
        // Print final score
        const whiteScore = game.player[0].score;
        const blackScore = game.player[1].score;
        console.log(`${strategy}: White score=${whiteScore}, Black score=${blackScore}`);
    }
}

// Example 3: Analyze a specific position
export function analyzePosition() {
    const game = ci.initialize_board("standard");
    const player = new ChessPlayer("greedy");
    
    // After 1. e2-e4
    ci.ce.move_piece(game, 12, 20); // white pawn e2->e4
    ci.ce.next_turn(game);
    
    // Get all legal moves for Black
    const moves = player._getAllLegalMoves(game, 1); // black (1)
    console.log(`Black has ${moves.length} legal moves after 1.e4`);
    
    // Show top 5 moves by score
    const scored = moves.map(move => ({
        from: ci.ce.index_to_address(move.from, game.size),
        to: ci.ce.index_to_address(move.to, game.size),
        score: player._scoreMove(game, move, 1)
    })).sort((a, b) => b.score - a.score);
    
    console.log("Top 5 moves for Black:");
    scored.slice(0, 5).forEach((m, i) => {
        console.log(`  ${i + 1}. ${m.from}→${m.to} (score: ${m.score.toFixed(2)})`);
    });
}

// Example 4: Clone game state for analysis without side effects
export function cloneGameExample() {
    const game = ci.initialize_board("standard");
    const originalMoves = game.player[0].moves.length;
    
    // Clone before making a move
    const clonedGame = ChessPlayer.cloneGame(game);
    
    // Make move on clone
    ci.ce.move_piece(clonedGame, 12, 20); // white pawn e2->e4
    ci.ce.next_turn(clonedGame);
    
    // Original is unchanged
    console.log(`Original moves: ${game.player[0].moves.length}`);
    console.log(`Cloned moves: ${clonedGame.player[0].moves.length}`);
    console.log(`Clone independent: ${game.player[0].moves.length === originalMoves}`);
}

// Run examples
if (typeof window === "undefined") {
    // Node.js environment (for testing)
    console.log("=== Bot vs Bot ===");
    botVsBot();
    
    console.log("\n=== Compare Strategies ===");
    compareStrategies();
    
    console.log("\n=== Analyze Position ===");
    analyzePosition();
    
    console.log("\n=== Clone Game ===");
    cloneGameExample();
}
