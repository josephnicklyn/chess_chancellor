import * as ce from "./chess_engine.js";

/**
 * Deterministic chess player with configurable strategies.
 * No AI/learning—purely rule-based move selection.
 */

class ChessPlayer {
    constructor(strategy = "greedy") {
        this.strategy = strategy; // "random", "greedy", "defensive"
        this.transitionTable = new Map(); // For caching evaluations
    }

    /**
     * Choose the best move for a given side based on the strategy.
     * @param {object} game - Game state
     * @param {number} color - 0=white, 1=black
     * @returns {object} {from, to} indices, or null if no legal moves
     */
    chooseMove(game, color) {
        const moves = this._getAllLegalMoves(game, color);
        if (moves.length === 0) return null;

        switch (this.strategy) {
            case "random":
                return moves[Math.floor(Math.random() * moves.length)];
            case "greedy":
                return this._greedyStrategy(game, moves, color);
            case "defensive":
                return this._defensiveStrategy(game, moves, color);
            default:
                return moves[0];
        }
    }

    /**
     * Execute a move for the player.
     * @param {object} game - Game state
     * @param {number} color - 0=white, 1=black
     * @returns {boolean} true if move succeeded
     */
    playMove(game, color) {
        if (game.whose_turn !== color) {
            console.warn(`Not ${color === 0 ? "white" : "black"}'s turn`);
            return false;
        }

        const move = this.chooseMove(game, color);
        if (!move) return false;

        return ce.move_piece(game, move.from, move.to);
    }

    // =========================================================================
    // Strategy Implementations
    // =========================================================================

    _greedyStrategy(game, moves, color) {
        /**
         * Priority:
         * 1. Capturing opponent's pieces (higher value = better)
         * 2. Controlling center
         * 3. Developing pieces from back rank
         * 4. Random among remaining
         */
        const scored = moves.map(move => ({
            move,
            score: this._scoreMove(game, move, color)
        }));

        scored.sort((a, b) => b.score - a.score);
        return scored[0].move;
    }

    _defensiveStrategy(game, moves, color) {
        /**
         * Priority:
         * 1. Block checks (move king or block)
         * 2. Capture attacking pieces
         * 3. Avoid moving undefended pieces
         * 4. Avoid moving into attack
         * 5. Control center
         */
        const opponent = 1 - color;

        // Filter out dangerous moves (puts piece in hanging position)
        const safeMoves = moves.filter(move => {
            const piece = game.board[move.from];
            if (!piece) return true;

            // After this move, would this piece be under attack?
            const tempBoard = game.board.map(sq => sq);
            tempBoard[move.to] = tempBoard[move.from];
            tempBoard[move.from] = null;

            const mockGame = { ...game, board: tempBoard };
            const underAttack = ce.is_square_attacked(mockGame, move.to, opponent);
            const defends = this._isDefended(mockGame, move.to, color);

            return !underAttack || defends;
        });

        if (safeMoves.length === 0) return moves[0];

        // Among safe moves, prefer captures
        const capturing = safeMoves.filter(m => game.board[m.to]);
        if (capturing.length > 0) {
            return capturing.sort((a, b) => {
                const aVal = game.board[a.to]?.piece.value || 0;
                const bVal = game.board[b.to]?.piece.value || 0;
                return bVal - aVal; // Capture highest value
            })[0];
        }

        return safeMoves[0];
    }

    // =========================================================================
    // Scoring & Evaluation
    // =========================================================================

    _scoreMove(game, move, color) {
        let score = 0;

        // Capture bonus (weighted by piece value)
        const target = game.board[move.to];
        if (target && target.color !== color) {
            score += target.piece.value * 10;
        }

        // Control center bonus
        const size = game.size;
        const centerMin = Math.floor(size / 2) - 1;
        const centerMax = Math.floor(size / 2);
        const toRow = Math.floor(move.to / size);
        const toCol = move.to % size;
        if (toRow >= centerMin && toRow <= centerMax &&
            toCol >= centerMin && toCol <= centerMax) {
            score += 2;
        }

        // Development bonus (move piece from back rank)
        const fromRow = Math.floor(move.from / size);
        const piece = game.board[move.from];
        if (piece && piece.piece.name !== "pawn") {
            const backRank = color === 0 ? 0 : size - 1;
            if (fromRow === backRank) {
                score += 1;
            }
        }

        // Pawn advancement bonus
        if (piece && piece.piece.name === "pawn") {
            const toRow = Math.floor(move.to / size);
            const advance = color === 0 ? (size - 1 - toRow) : toRow;
            score += Math.max(0, advance * 0.5);
        }

        return score;
    }

    _isDefended(game, index, byColor) {
        const size = game.size;
        const board = game.board;
        for (let i = 0; i < board.length; i++) {
            const sq = board[i];
            if (sq && sq.color === byColor) {
                const moves = ce.pseudo_legal_moves(game, i, { attacksOnly: false });
                if (moves.includes(index)) return true;
            }
        }
        return false;
    }

    // =========================================================================
    // Utilities
    // =========================================================================

    _getAllLegalMoves(game, color) {
        const moves = [];
        const size = game.size;
        const board = game.board;

        for (let i = 0; i < board.length; i++) {
            const sq = board[i];
            if (sq && sq.color === color) {
                const legalMoves = ce.legal_moves(game, i);
                for (const to of legalMoves) {
                    moves.push({ from: i, to });
                }
            }
        }
        return moves;
    }

    /**
     * Clone the game state for lookahead/analysis.
     * @param {object} game
     * @returns {object} Deep copy
     */
    static cloneGame(game) {
        return {
            moves: [...game.moves],
            player: game.player.map(p => ({
                ...p,
                moves: [...p.moves]
            })),
            en_passant_target: game.en_passant_target,
            castle_rights: game.castle_rights.map(cr => ({ ...cr })),
            size: game.size,
            title: game.title,
            auto_promote_handler: game.auto_promote_handler,
            whose_turn: game.whose_turn,
            board: game.board.map(sq => sq ? { 
                color: sq.color, 
                piece: { ...sq.piece } 
            } : null)
        };
    }

    /**
     * Set the player's strategy.
     * @param {string} strategy - "random", "greedy", or "defensive"
     */
    setStrategy(strategy) {
        if (!["random", "greedy", "defensive"].includes(strategy)) {
            console.warn(`Unknown strategy: ${strategy}. Using 'greedy'.`);
            this.strategy = "greedy";
        } else {
            this.strategy = strategy;
        }
    }
}

export { ChessPlayer };
