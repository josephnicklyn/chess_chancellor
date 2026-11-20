const MOVE_DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const MOVE_FILE = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const MOVE_KNIGHT = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const MOVE_ELEPHANT = [[-2, -2], [-2, 2], [2, -2], [2, 2]];
const MOVE_ANY = [...MOVE_DIAG, ...MOVE_FILE];
const MOVE_LORD = [...MOVE_FILE, ...MOVE_KNIGHT];

const PLAYERS = ['White', 'Black'];
const KINGS_STATUS = ["CHECK", "CHECKMATE"];
const PROMOTION_PIECES = new Set(["q", "r", "b", "n"]);

// Toast helper: browser only, no-op in Node
const toast = typeof window !== 'undefined' ? window.toast || (() => {}) : () => {};

const PIECE_NAMES = ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn', 'chancellor', 'elephant'];

const PIECE_DEFS = {
  pawn: {
    name: "pawn",
    value: 1,
    slide: false,
    dirs:  [[1, 0]],               // white (row 0 side); make_piece flips these for black
    captures: [[1, -1], [1, 1]],
    icon: "♙"
  },
  knight: {
    name: "knight",
    value: 3,
    slide: false,
    dirs: MOVE_KNIGHT,
    icon: "♞"
  },
  bishop: {
    name: "bishop",
    value: 3,
    slide: true,
    dirs: MOVE_DIAG,
    icon: "♝"
  },
  rook: {
    name: "rook",
    value: 5,
    slide: true,
    dirs: MOVE_FILE,
    hasMoved: false,
    icon: "♜"
  },
  queen: {
    name: "queen",
    value: 9,
    slide: true,
    dirs: MOVE_ANY,
    icon: "♛"
  },
  king: {
    name: "king",
    value: 0,
    slide: false,
    dirs: MOVE_ANY,
    hasMoved: false,
    icon: "♚"
  },

  chancellor: {
    name: "chancellor",
    value: 8,
    slide: true,
    dirs: MOVE_LORD,
    hasMoved: false,
    icon: "⛨"
  },
  elephant: {
    name: "elephant",
    value: 4,
    slide: false,
    dirs: MOVE_ELEPHANT,
    icon: "𓃰"
  }


  
};

const inBounds = (r, c, size) => r >= 0 && r < size && c >= 0 && c < size;

// Each board square holds its own copy of a piece, so per-piece state
// (hasMoved, pawn direction) never leaks into PIECE_DEFS or other pieces.
function make_piece(name, color) {
    const def = PIECE_DEFS[name];
    if (!def) throw new Error(`Unknown piece: ${name}`);
    const piece = { ...def, hasMoved: false };
    if (name === "pawn") {
        const d = color === 1 ? -1 : 1;   // white moves +1 row, black -1
        piece.dirs = [[d, 0]];
        piece.captures = [[d, -1], [d, 1]];
    }
    return { color, piece };
}

function promoted_queen(mover) {
    return make_piece("queen", mover.color);
}

function promote_mover_if_needed(game, mover, toIndex) {
    const row = Math.floor(toIndex / game.size);
    return mover.piece.name === "pawn" && (row === 0 || row === (game.size-1))
        ? promoted_queen(mover)
        : mover;
}

function castle_legal_moves(game, fromIndex) {
    if (game.size !== 8) return [];

    const board = game.board;
    const sq = board[fromIndex];
    if (!sq || sq.piece.name !== "king") return [];

    const color = sq.color;
    const row = Math.floor(fromIndex / game.size);
    const kingStartFile = Math.floor(game.size / 2);
    const startIndex = color === 1
        ? ((game.size - 1) * game.size) + kingStartFile
        : kingStartFile;
    const moves = [];
    const castleRights = game.castle_rights[color];
    if (castleRights.castled || sq.piece.hasMoved || fromIndex !== startIndex) return [];

    if (!is_square_attacked(game, fromIndex, 1 - color)) {
        // Kingside
        const kingsideRook = board[row * 8 + 7];
        if (castleRights.kingside &&
            kingsideRook &&
            kingsideRook.color === color &&
            kingsideRook.piece.name === "rook" &&
            !kingsideRook.piece.hasMoved &&
            !board[row * 8 + 5] &&
            !board[row * 8 + 6] &&
            !is_square_attacked(game, row * 8 + 5, 1 - color) &&
            !is_square_attacked(game, row * 8 + 6, 1 - color)) {
                moves.push(row * 8 + 6);
        }
        // Queenside
        const queensideRook = board[row * 8 + 0];
        if (castleRights.queenside &&
            queensideRook &&
            queensideRook.color === color &&
            queensideRook.piece.name === "rook" &&
            !queensideRook.piece.hasMoved &&
            !board[row * 8 + 1] &&
            !board[row * 8 + 2] &&
            !board[row * 8 + 3] &&
            !is_square_attacked(game, row * 8 + 3, 1 - color) &&
            !is_square_attacked(game, row * 8 + 2, 1 - color)) {
                moves.push(row * 8 + 2);
        }
    }

    return moves;
}


function pseudo_legal_moves(game, fromIndex, { attacksOnly = false } = {}) {
    const board = game.board;
    
    const size = game.size || 8;
    const sq = board[fromIndex];
    if (!sq) return [];

    const { color, piece } = sq;
    const row = Math.floor(fromIndex / size);
    const col = fromIndex % size;
    const moves = [];
    if (piece.name === "pawn") {
        const dir = piece.dirs[0][0];            // +1 white, -1 black
        const startRow = color === 1 ? (size - 2) : 1;

        // Diagonal captures (also what a pawn "attacks")
        for (const [dr, dc] of piece.captures) {
            const r = row + dr, c = col + dc;
            if (!inBounds(r, c, size)) continue;
            const idx = r * size + c;
            const target = board[idx];
            if (attacksOnly) { moves.push(idx); continue; }
            if ((target && target.color !== color) || idx === game.en_passant_target) {
                moves.push(idx);
            }
        }
        if (attacksOnly) return moves;

        // Forward pushes
        const r1 = row + dir;
        if (inBounds(r1, col, size) && !board[r1 * size + col]) {
            moves.push(r1 * size + col);
            const r2 = row + 2 * dir;
            if (row === startRow && !board[r2 * size + col]) {
                moves.push(r2 * size + col);
            }
        }
        return moves;
    }

    if (piece.name === "king") {
        if (!attacksOnly) {
            moves.push(...castle_legal_moves(game, fromIndex));
        }
    }

    for (const [dr, dc] of piece.dirs) {
        let r = row + dr, c = col + dc;
        while (inBounds(r, c, size)) {
            const idx = r * size + c;
            const target = board[idx];
            if (!target) {
                moves.push(idx);
            } else {
                if (target.color !== color || attacksOnly) moves.push(idx);
                break;                            // blocked either way
            }
            // chancellor: slides like a rook, but its knight jumps are one step
            const canSlide = piece.name === "chancellor"
                ? Math.max(Math.abs(dr), Math.abs(dc)) === 1
                : piece.slide;
            if (!canSlide) break;                 // knight/king/elephant: one step
            r += dr; c += dc;
        }
    }
    return moves;
}

function find_king(board, color) {
    return board.findIndex(s => s && s.color === color && s.piece.name === "king");
}

function is_square_attacked(game, index, byColor) {
    for (let i = 0; i < game.board.length; i++) {
        const s = game.board[i];
        if (s && s.color === byColor &&
            pseudo_legal_moves(game, i, { attacksOnly: true }).includes(index)) {
            return true;
        }
    }
    return false;
}

function legal_moves(game, fromIndex) {
    // const board = game.board;
    const board = game.board;
    const mover = board[fromIndex];
    if (!mover) return [];
    const color = mover.color;

    return pseudo_legal_moves(game, fromIndex).filter(toIndex => {
        const captured = board[toIndex];

        // En passant: the captured pawn sits behind the target square
        let epIndex = null, epPiece = null;
        if (mover.piece.name === "pawn" && toIndex === game.en_passant_target && !captured) {
            epIndex = toIndex + (color === 1 ? game.size : -game.size);
            epPiece = board[epIndex];
            board[epIndex] = null;
        }

        board[toIndex] = promote_mover_if_needed(game, mover, toIndex);
        board[fromIndex] = null;

        const kingIdx = find_king(board, color);
        const inCheck = is_square_attacked(game, kingIdx, 1 - color);

        // Undo
        board[fromIndex] = mover;
        board[toIndex] = captured;
        if (epIndex !== null) board[epIndex] = epPiece;

        return !inCheck;
    });
}


function is_in_check(game, color) {          // boolean
    const kingIdx = find_king(game.board, color);
    return is_square_attacked(game, kingIdx, 1 - color);
}

function is_checkmate(game, color) {         // boolean
    if (!is_in_check(game, color)) return false;
    for (let i = 0; i < game.board.length; i++) {
        const s = game.board[i];
        if (s && s.color === color) {
            if (legal_moves(game, i).length > 0) return false;
        }
    }
    return true;
}

function is_stalemate(game, color) {         // boolean
    if (is_in_check(game, color)) return false;
    for (let i = 0; i < game.board.length; i++) {
        const s = game.board[i];
        if (s && s.color === color) {
            if (legal_moves(game, i).length > 0) return false;
        }
    }
    return true;
}

function would_leave_king_in_check(game, fromIndex, toIndex) {
    const board = game.board;
    const mover = board[fromIndex];
    if (!mover) return false;

    const captured = board[toIndex];
    let epIndex = null;
    let epPiece = null;

    if (mover.piece.name === "pawn" &&
        toIndex === game.en_passant_target &&
        !captured) {
        epIndex = toIndex + (mover.color === 1 ? game.size : -game.size);
        epPiece = board[epIndex];
        board[epIndex] = null;
    }

    board[toIndex] = promote_mover_if_needed(game, mover, toIndex);
    board[fromIndex] = null;

    const kingIdx = find_king(board, mover.color);
    const inCheck = kingIdx !== -1 &&
        is_square_attacked(game, kingIdx, 1 - mover.color);

    board[fromIndex] = mover;
    board[toIndex] = captured;
    if (epIndex !== null) board[epIndex] = epPiece;

    return inCheck;
}

function game_status(game, fromIndex = null, toIndex = null) {
    
    const color = game.whose_turn;
    if (is_checkmate(game, color)) return "CHECKMATE";
    
    if (fromIndex !== null && toIndex !== null &&
        would_leave_king_in_check(game, fromIndex, toIndex)) {
        return "WOULD_BE_CHECK";
    }
    
    if (is_in_check(game, color)) return "CHECK";
    if (is_stalemate(game, color)) return "STALEMATE";
    
    return "ONGOING";
}

function list_legal_moves(game, pieceIndex) {
    return legal_moves(game, pieceIndex);
}

function address_to_index(address, size=8, invert=false) {
    if (typeof(address) === "string") {
        if (address.length >= 2) {
            let c = address[0].toLowerCase();
            let rankText = address.slice(1);
            let rankNumber = parseInt(rankText, 10);

            const col = c.charCodeAt(0) - 'a'.charCodeAt(0);
            if (col >= 0 && col < size && Number.isInteger(rankNumber) && rankNumber >= 1 && rankNumber <= size) {
                const row = !invert ? size - rankNumber : rankNumber - 1;
                return ((row * size) + col);
            }
        }
    }
    return null;
}

function index_to_address(index, size=8) {
    if (index >= 0 && index < (size * size)) {
        let row = Math.floor(index / size);
        let col = index % size;
        
        // col 0 ('a') = 97 + 0 = 97 ('a')
        let fileChar = String.fromCharCode(col + 97);
        // row 0 (top of array) corresponds to rank 'size', row (size-1) to rank '1'
        let rankChar = size - row;
        
        return `${fileChar}${rankChar}`;
    }
    return null;
}

function promote_piece(game, board, piece, toIndex) {
    const size = game.size || 8;
    const row = Math.floor(toIndex / size);
    if (piece.piece.name !== "pawn" || (row !== 0 && row !== (size - 1))) {
        return false;
    }

    let selection = "queen";
    if (typeof game.auto_promote_handler === "function") {
        const result = game.auto_promote_handler({
            game,
            piece,
            toIndex,
            toAddress: index_to_address(toIndex, size),
            choices: ["queen", "rook", "bishop", "knight"]
        });

        if (typeof result === "string") {
            selection = result.toLowerCase();
        } else if (result && typeof result === "object" && result.name) {
            const names = { queen: "queen", rook: "rook", bishop: "bishop", knight: "knight" };
            selection = names[result.name.toLowerCase()] || selection;
        }
    }

    if (!PROMOTION_PIECES.has(selection)) {
        toast(`Invalid promotion piece: ${selection}; using queen`);
        selection = "queen";
    }

    const promotedPiece = PIECE_DEFS[selection];
    board[toIndex] = {
        color: piece.color,
        piece: { ...promotedPiece, hasMoved: true }
    };

    toast(`Pawn promoted to ${promotedPiece.name}`);
    return true;
}

// out of move_piece_to, allows reporting the current game status
function report_status(game, ongoing=true, fromIndex=null, toIndex=null) {
    const status = game_status(game, fromIndex, toIndex);
    switch (status) {
        case "CHECK":
            toast("King is in check");
            break;
        case "CHECKMATE":
            toast("King is in checkmate");
            break;
        case "STALEMATE":
            toast("Game is in stalemate");
            break;
        case "WOULD_BE_CHECK":
            toast("Move would leave king in check");
            break;
        case "ONGOING":
            // if (ongoing) toast("Game is ongoing");
            break;
    }
}

// Move a piece from current position to a new address
// Returns true if move succeeds, false otherwise
function move_piece_to(game, toAddress) {
    const size = game.size || 8;
    const toIndex = address_to_index(toAddress, size);
    
    // Validate target address
    if (toIndex === null) {
        toast(`Invalid address: ${toAddress}`);
        return false;
    }
    
    const currentPlayer = game.player[game.whose_turn];
    const fromIndex = currentPlayer.position;
    const board = game.board;
    
    // Get piece at source
    const piece = board[fromIndex];
    if (!piece) {
        toast(`No piece at ${index_to_address(fromIndex, size)}`);
        return false;
    }
    
    // Verify it's the current player's piece
    if (piece.color !== game.whose_turn) {
        toast(`Not your piece! That's ${PLAYERS[piece.color]}'s piece`);
        return false;
    }
    
    // Check destination
    const target = board[toIndex];
    if (target && target.color === game.whose_turn) {
        toast(`Cannot capture your own piece at ${toAddress}`);
        return false;
    }
    // should return more than true/false - check/checkmate
    const legal = legal_moves(game, fromIndex);
    if (!legal.includes(toIndex)) {
        report_status(game, true, fromIndex, toIndex);
        toast(`Illegal move: ${index_to_address(fromIndex, size)} -> ${toAddress}`);
        return false;
    }
    
    // Execute move
    const isCastling = piece.piece.name === "king" && Math.abs(toIndex - fromIndex) === 2;
    if (isCastling) {
        const row = Math.floor(fromIndex / size);
        const kingside = toIndex > fromIndex;
        const kingStartFile = Math.floor(size / 2);
        const rookFrom = row * size + (kingside ? (size - 1) : 0);
        const rookTo = row * size + (kingside ? (kingStartFile + 1) : (kingStartFile - 1));
        const rook = board[rookFrom];

        if (!rook || rook.piece.name !== "rook" || rook.color !== piece.color) {
            toast("Castling rook is missing or invalid");
            return false;
        }

        board[rookTo] = rook;
        board[rookFrom] = null;
        rook.piece.hasMoved = true;
    }

    board[toIndex] = piece;
    board[fromIndex] = null;
    currentPlayer.position = toIndex;
    promote_piece(game, board, piece, toIndex);

    piece.piece.hasMoved = true;

    if (piece.piece.name === "king") {
        game.castle_rights[piece.color].kingside = false;
        game.castle_rights[piece.color].queenside = false;
        game.castle_rights[piece.color].castled = isCastling;
    } else if (piece.piece.name === "rook") {
        const blackKingsideRookIndex = size - 1;
        const whiteKingsideRookIndex = (size * size) - 1;
        const blackQueensideRookIndex = 0;
        const whiteQueensideRookIndex = size * (size - 1);
        if (fromIndex === blackKingsideRookIndex || fromIndex === whiteKingsideRookIndex) {
            game.castle_rights[piece.color].kingside = false;
        }
        if (fromIndex === blackQueensideRookIndex || fromIndex === whiteQueensideRookIndex) {
            game.castle_rights[piece.color].queenside = false;
        }
    }

    if (target && target.piece.name === "rook") {
        const blackKingsideRookIndex = size - 1;
        const whiteKingsideRookIndex = (size * size) - 1;
        const blackQueensideRookIndex = 0;
        const whiteQueensideRookIndex = size * (size - 1);
        if (toIndex === blackKingsideRookIndex || toIndex === whiteKingsideRookIndex) {
            game.castle_rights[target.color].kingside = false;
        }
        if (toIndex === blackQueensideRookIndex || toIndex === whiteQueensideRookIndex) {
            game.castle_rights[target.color].queenside = false;
        }
    }
    
    // en passant capture
    const isEnPassant = piece.piece.name === "pawn" &&
        toIndex === game.en_passant_target &&
        !target;
    let captured = target;
    if (isEnPassant) {
        const captureIndex = toIndex + (piece.color === 1 ? size : -size);
        captured = board[captureIndex];
        board[captureIndex] = null;
    }
    // set/clear en passant target
    game.en_passant_target = null;
    if (piece.piece.name === "pawn" && Math.abs(toIndex - fromIndex) === (size * 2)) {
        game.en_passant_target = (toIndex + fromIndex) / 2;
    }

    // Record every legal move
    update_moves(game, piece.color, fromIndex, toIndex, captured);
    
    return true;
}

function select_piece(game, fromIndex) {
    const size = game.size || 8;
    if (!Number.isInteger(fromIndex) || fromIndex < 0 || fromIndex >= size * size) {
        toast(`Invalid square index: ${fromIndex}`);
        return false;
    }

    const board = game.board;
    const piece = board[fromIndex];
    if (!piece) {
        toast(`No piece at square ${fromIndex}`);
        return false;
    }

    // Verify it's the current player's piece
    if (piece.color !== game.whose_turn) {
        toast(`Not your piece! That's ${PLAYERS[piece.color]}'s piece`);
        return false;
    }

    game.player[game.whose_turn].position = fromIndex;
    return true;
}

function update_moves(game, color, fromIndex, toIndex, captured) {
    // use toIndex since that is where the piece moved from before capture
    let from_icon = game.board[toIndex] ? game.board[toIndex].piece.icon : "-";    
    if (captured && captured.color !== color) {
        game.player[color].score+=captured.piece.value;
        game.player[color].moves.push({from: fromIndex, to: toIndex, captured, from_icon});
        
    } else {
        game.player[color].moves.push({from: fromIndex, to: toIndex, captured: null, from_icon});
    }
}


function move_piece(game, fromIndex, toIndex) {
    const size = game.size || 8;
    if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex)) {
        toast("Move indices must be integers");
        return false;
    }
    if (fromIndex < 0 || fromIndex >= size * size ||
        toIndex < 0 || toIndex >= size * size) {
        toast("Move index is outside the board");
        return false;
    }

    const piece = game.board[fromIndex];
    if (!piece) {
        toast(`No piece at square ${fromIndex}`);
        return false;
    }

    if (piece.color !== game.whose_turn) {
        toast(`Not your piece! That's ${PLAYERS[piece.color]}'s piece`);
        return false;
    }

    game.player[game.whose_turn].position = fromIndex;
    const moved = move_piece_to(game, index_to_address(toIndex, size));
    if (moved) next_turn(game);
    return moved;
}

function next_turn(game) {
    game.whose_turn = (game.whose_turn + 1) % 2;
}

// Address-based compatibility wrapper for non-browser callers.
function move_piece_from(game, addresses) {
    let [fromAddress, toAddress] = addresses.split("->");
    if (!fromAddress) {
        fromAddress = index_to_address(
            game.player[game.whose_turn].position,
            game.size || 8
        );
    }
    if (!fromAddress || !toAddress) {
        toast("Invalid format. Use: 'e2->e4'");
        return false;
    }

    const size = game.size || 8;
    const fromIndex = address_to_index(fromAddress.trim(), size);
    const toIndex = address_to_index(toAddress.trim(), size);
    if (fromIndex === null || toIndex === null) {
        toast("Invalid move address");
        return false;
    }
    return move_piece(game, fromIndex, toIndex);
}

export {
    pseudo_legal_moves,
    find_king,
    is_square_attacked,
    legal_moves,
    is_in_check,
    is_checkmate,
    is_stalemate,
    would_leave_king_in_check,
    game_status,
    list_legal_moves,
    make_piece,
    PIECE_DEFS, 
    PIECE_NAMES,
    select_piece,
    update_moves,
    move_piece,
    next_turn,
    move_piece_from,
    report_status,
    index_to_address,
    address_to_index
}