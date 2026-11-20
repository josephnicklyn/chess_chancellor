import * as ci from "./chess_initializer.js";
import { ChessPlayer } from "./chess_player.js";

/**
 * Manages bot-vs-human or bot-vs-bot gameplay.
 * Handles turn timing, move execution, and UI feedback.
 */
class BotManager {
    constructor(game, boardElement) {
        this.game = game;
        this.boardElement = boardElement;
        this.players = {
            0: null, // white
            1: null  // black
        };
        this.isRunning = false;
        this.moveDelay = 1000; // milliseconds between bot moves
        this.onMoveCallback = null;
    }

    /**
     * Set a player (bot or human) for a color.
     * @param {number} color - 0=white, 1=black
     * @param {ChessPlayer|null} player - ChessPlayer instance, or null for human
     */
    setPlayer(color, player) {
        this.players[color] = player;
    }

    /**
     * Set delay between bot moves (in ms).
     * @param {number} ms
     */
    setMoveDelay(ms) {
        this.moveDelay = Math.max(0, ms);
    }

    /**
     * Start automated play (if bots are assigned).
     * Continues until game ends or stopped.
     */
    async playAutomated() {
        this.isRunning = true;
        while (this.isRunning && !this._isGameOver()) {
            const color = this.game.whose_turn;
            const player = this.players[color];

            if (player instanceof ChessPlayer) {
                await this._waitMs(this.moveDelay);
                const moved = player.playMove(this.game, color);
                
                if (moved) {
                    this.boardElement.render();
                    if (this.onMoveCallback) {
                        this.onMoveCallback(color, this.game);
                    }
                } else {
                    console.log(`${color === 0 ? "White" : "Black"} has no legal moves.`);
                    break;
                }
            } else {
                // Human's turn—stop automation
                break;
            }
        }
        this.isRunning = false;
    }

    /**
     * Trigger the current player's move (whether bot or human interaction expected).
     */
    async nextMove() {
        const color = this.game.whose_turn;
        const player = this.players[color];

        if (player instanceof ChessPlayer) {
            await this._waitMs(this.moveDelay);
            player.playMove(this.game, color);
            this.boardElement.render();
            if (this.onMoveCallback) {
                this.onMoveCallback(color, this.game);
            }
        }
    }

    /**
     * Stop automated play.
     */
    stop() {
        this.isRunning = false;
    }

    /**
     * Reset and start a new game.
     * @param {string} variant - "standard", "chancellor", or "elephant"
     */
    newGame(variant) {
        this.game = ci.initialize_board(variant === "standard" ? null : variant);
        this.boardElement.game = this.game;
        this.boardElement.render();
        this.isRunning = false;
    }

    // =========================================================================
    // Utilities
    // =========================================================================

    _isGameOver() {
        const color = this.game.whose_turn;
        const size = this.game.size;
        for (let i = 0; i < this.game.board.length; i++) {
            const sq = this.game.board[i];
            if (sq && sq.color === color) {
                if (ci.ce.legal_moves(this.game, i).length > 0) {
                    return false;
                }
            }
        }
        return true; // No legal moves = checkmate or stalemate
    }

    _waitMs(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Set callback to fire after each move.
     * @param {function} callback - (color, game) => void
     */
    setOnMoveCallback(callback) {
        this.onMoveCallback = callback;
    }
}

export { BotManager };
