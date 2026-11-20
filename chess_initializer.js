import * as ce from "./chess_engine.js"

// ---------------------------------------------------------------------------
// View helpers (DOM). These only touch the document when called, so this
// module can still be imported from Node to build a game for testing.
// ---------------------------------------------------------------------------

function createCell(is_black=false, piece="") {
    const cell = document.createElement('div');
    cell.className = "board_cell";
    if (piece === "drag_mask") {
        cell.classList.add("drag_mask");
        return cell;
    }
    setCellPiece(cell, piece, is_black);
    return cell;
}

// Cells carry no game state; they only mirror it as attributes for CSS.
function setCellPiece(cell, piece_name, is_black=false) {
    if (ce.PIECE_NAMES.includes(piece_name)) {
        cell.setAttribute("piece", piece_name);
        cell.toggleAttribute("black", is_black);
    } else {
        cell.removeAttribute("piece");
        cell.removeAttribute("black");
    }
}

// ---------------------------------------------------------------------------
// Model (no DOM). game.board is a flat array: null or {color, piece}.
// ---------------------------------------------------------------------------

function getPieceNameForIndex(index, extended=null) {
    let black=false;
    let name="";
    const extendable = ["chancellor", "elephant"].includes(extended);
    const brd_size = extendable?10:8;
    const names = extendable?
    ['rook', 'knight', 'bishop', extended, 'queen', 'king', extended, 'bishop', 'knight', 'rook'] :
    ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];

    let col = index % brd_size;
    let row = Math.floor(index/brd_size);

    if (row == 1 || row == brd_size-2) {
        name = "pawn";
        black =  row == brd_size-2;
    } else if (row == 0) {
        name = names[col];
        black = false;
    } else if (row == brd_size-1) {
        name = names[col];
        black = true;
    }

    return {black, name};
}

function initialize_board(ext=null) {
    let brd_size = 8;
    let title = "Standard";
    if (ext === 'chancellor') {
        title = "Chancellor";
        brd_size = 10;
    } else if (ext === 'elephant') {
        title = "Elephant";
        brd_size = 10;
    }

    const board = Array(brd_size * brd_size).fill(null);
    for (let i = 0; i < board.length; i++) {
        const {black, name} = getPieceNameForIndex(i, ext);
        if (name) board[i] = ce.make_piece(name, black ? 1 : 0);
    }

    return {
        moves: [], // list of moves
        player: [
            {position: Math.floor(brd_size*1.5), moves: [], score: 0}, // e7 (black)
            {position: Math.floor(brd_size*(brd_size-2)+(brd_size/2)), moves: [], score: 0}  // e2 (white)
        ],
        en_passant_target: null,
        castle_rights: [
            { kingside: true, queenside: true, castled: false },
            { kingside: true, queenside: true, castled: false }
        ],
        // for now since user choice would require additional input logic/paths
        // auto to queen promotion for pawns reaching the last rank
        size: brd_size,
        title: title,
        auto_promote_handler: null,
        whose_turn: 0,  // White moves first
        board: board
    };
}

export {
    initialize_board,
    createCell,
    setCellPiece,
    ce
}