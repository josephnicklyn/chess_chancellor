import * as ci from "./chess_initializer.js"
const DRAG_THRESHOLD = 5;
// View/controller only. Game state lives in this.game (plain data, no DOM);
// this.cells[i] is the div that displays this.game.board[i].
class ChessBoard extends HTMLElement {

    static observedAttributes = ["extended"];

    constructor() {
        super();
        this.cells = [];
        this.game = null;
        window.GAME = this;
        // Absolutely positioned overlay; appended after the cells in initialize_board.
        this.drag_mask = ci.createCell(false, "drag_mask");

        this.mouse_down_listener = this.onMouseDown.bind(this);
        this.mouse_up_listener = this.onMouseUp.bind(this);
        this.mouse_move_listener = this.onMouseMove.bind(this);
        this.mouse_drag_listener = this.onMouseDrag.bind(this);

        this.addEventListener('mousedown', this.mouse_down_listener);
        this.addEventListener('mouseup', this.mouse_up_listener);

        this._mouse_tracking = {selected: null, dragging: false};
    }

    onMouseDown(e) {
        e.preventDefault(); // Prevent text selection and other default actions on drag
        this._mouse_tracking.selected = null;
        if (e.button !== 0) {
            return; // Only respond to left mouse button
        }
        
        let target = e.target;
        
        if (target) {
            target = target.closest('.board_cell[piece]');
            if (target) {
                if (!this.__selectPiece(target)) return;
                this._mouse_tracking.selected = target.cellIndex;
                this._mouse_tracking.startCell = target.cellIndex;
                this._mouse_tracking.target = target;
                this._mouse_tracking.startX = e.clientX;
                this._mouse_tracking.startY = e.clientY;
                let rect = e.target.getBoundingClientRect();
                this._mouse_tracking.xOffset = e.clientX - rect.x;
                this._mouse_tracking.yOffset = e.clientY - rect.y;
                this._mouse_tracking.legalMoves = ci.ce.list_legal_moves(this.game, target.cellIndex)
                this.addEventListener('mousemove', this.mouse_move_listener);
                
            }
        }
    }

    onMouseMove(e) {
        
        if (this._mouse_tracking.selected !== null) {
            const ex = this._mouse_tracking.startX - e.clientX;
            const ey = this._mouse_tracking.startY - e.clientY;
            if (Math.abs(ex) >= DRAG_THRESHOLD || Math.abs(ey) >= DRAG_THRESHOLD) {
                this._mouse_tracking.dragging = true;
                this.removeEventListener('mousemove', this.mouse_move_listener);
                window.addEventListener('mousemove', this.mouse_drag_listener);
                this.drag_mask.style.display = "block";
                this.drag_mask.setAttribute("piece", this._mouse_tracking.target.getAttribute("piece"));
                if (this._mouse_tracking.target.hasAttribute('black')){
                    this.drag_mask.setAttribute("black", "");
                } else {
                    this.drag_mask.removeAttribute("black");
                }
                this._set_drag_mask_position(this.__mouse_over_cell(e.clientX, e.clientY));
            }
            
        }
    }

    onMouseUp(e) {
        
        this._mouse_tracking.dragging = false;
        if (this._mouse_tracking.selected !== null) {
            this.__highlightLegalMoves(null);
            window.removeEventListener('mousemove', this.mouse_drag_listener);
            this.removeEventListener('mousemove', this.mouse_move_listener);
            this._mouse_tracking.selected = null;
            this.drag_mask.style.display = "none";
            const dx = e.clientX - this.getBoundingClientRect().x;
            const dy = e.clientY - this.getBoundingClientRect().y;
            const co = this.__mouse_over_cell(dx, dy);
            const wasMoved = co != this._mouse_tracking.startCell;
            if (wasMoved) {
                const isValid = this._mouse_tracking.legalMoves.includes(co);
                if (isValid) {
                    // move & capture logic here
                    this._move_piece(this._mouse_tracking.startCell, co);
                } else {
                    toast("Invalid move");
                }
            }
        }
    }

    onMouseDrag(e) {
        if (this._mouse_tracking.dragging !== false) {
            const rect = this.getBoundingClientRect();
            const dx = e.clientX-rect.x; //e.clientX - this._mouse_tracking.startX - rect.x;
            const dy = e.clientY-rect.y; //e.clientY - this._mouse_tracking.startY - rect.y;
            const co = this.__mouse_over_cell(dx, dy);
            const isValid = this._mouse_tracking.legalMoves.includes(co);

            
            if (isValid) {
                this._set_drag_mask_position(co);
            } else {
                this.__drag_mask_float(dx, dy);
            }
        }
    }

    __drag_mask_float(x, y) {
        if (this._mouse_tracking.dragging !== false) {
            let dx = x -  this._mouse_tracking.xOffset;
            let dy = y -  this._mouse_tracking.yOffset;
            let cellSize = this.firstElementChild.clientWidth;
            let xMax = this.clientWidth-cellSize;
            let yMax = this.clientHeight-cellSize;
            dx = Math.min(Math.max(0, dx), xMax);
            dy = Math.min(Math.max(0, dy), yMax);
            this.drag_mask.style.transform = `translate(${dx-2.5}px, ${dy-2.5}px)`;
        }
    }

    _set_drag_mask_position(index) {
        if (index !== null) {
            const cell = this.cells[index];
            const rect = cell.getBoundingClientRect();
            const dx = rect.left - this.drag_mask.parentElement.getBoundingClientRect().left;
            const dy = rect.top - this.drag_mask.parentElement.getBoundingClientRect().top;
            this.drag_mask.style.transform = `translate(${dx-2.5}px, ${dy-2.5}px)`;
        }
    }

    __mouse_over_cell(x, y) {
        x-=2.5;
        y-=2.5;
        const pw = this.clientWidth;
        const ph = this.clientHeight
        if (x>=0 && x<pw && y>=0 && y<ph) {
            const size = this.boardSize;
            const col = Math.floor((x/pw)*size);
            const row = Math.floor((y/ph)*size);
            const cellIndex = (row*size)+col;
            return cellIndex;
        } else {
            return null;
        }
    }

    move_piece(startAddress, endAddress) {
        if (typeof startAddress !== "string" || typeof endAddress !== "string") {
            console.error("Move addresses must be strings");
            return false;
        }

        const startIndex = ci.ce.address_to_index(
            startAddress.trim().toLowerCase(),
            this.boardSize, false
        );
        const endIndex = ci.ce.address_to_index(
            endAddress.trim().toLowerCase(),
            this.boardSize, false
        );

        if (startIndex === null || endIndex === null) {
            console.error(`Invalid move: ${startAddress} -> ${endAddress}`);
            return false;
        }

        return this._move_piece(startIndex, endIndex);
    }

    _move_piece(startIndex, endIndex) {
        if (startIndex === null || endIndex === null) return false;

        const moved = ci.ce.move_piece(this.game, startIndex, endIndex);
        if (!moved) return false;

        ci.ce.report_status(this.game, true, startIndex, endIndex);
        this.render();
        return true;
    }
    
    __highlightLegalMoves = (index) => {
        for (const el of this.cells) {
            el.removeAttribute("highlight");
        }
        if (index !== null) {
            const moves = ci.ce.list_legal_moves(this.game, index);
            for (const move of moves) {
                if (this.cells[move]) {
                    this.cells[move].setAttribute("highlight", "");
                }
            }
        }
    };

    __selectPiece(target) {
        if (!ci.ce.select_piece(this.game, target.cellIndex)) {
            for (const el of this.cells) {
                el.removeAttribute("selected");
                el.removeAttribute("highlight");
            }
            return false;
        }

        for (const el of this.cells) {
            if (el === target) {
                el.setAttribute("selected", "");
            } else {
                el.removeAttribute("selected");
            }
        }

        this.__highlightLegalMoves(target.cellIndex);
        return true;
        
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === "extended") {
            this.initialize_board();
        }
    }

    connectedCallback() {
        // Children are added here (not in the constructor) so the element
        // can also be created with document.createElement.
        if (!this.game) this.initialize_board();
    }

    get isExtended() {
        return ["chancellor", "elephant"].includes(this.getAttribute("extended"));
    }

    get boardSize() {
        return this.game ? this.game.size : (this.isExtended ? 10 : 8);
    }

    __update_ui() {
        const title = document.getElementById("title");
        const reportCard = document.getElementById("report_card");  
        if (title) {
            title.textContent = this.isExtended ? `Chess - ${this.getAttribute("extended")}` : "Chess - Standard";
        }
        if (reportCard) {
            for (let i = reportCard.children.length - 1; i >= 3; i--) {
                reportCard.removeChild(reportCard.children[i]);
            }
            // Re-add headers if they were removed
            if (reportCard.children.length < 3) {
                const headers = ["Index", "White", "Black"];
                for (const header of headers) {
                    const div = document.createElement("div");
                    div.className = "header";
                    div.textContent = header;
                    reportCard.appendChild(div);
                }
            }

            let maxMoves = Math.max(...this.game.player.map(p => p.moves.length));
            let size = this.game.size;
            console.log(this.game.player);
            for (let i = 0; i < maxMoves; i++) {
                
                
                
                const indexDiv = document.createElement("div");
                const whiteDiv = document.createElement("div");
                const blackDiv = document.createElement("div");
                blackDiv.className = "report black";
                whiteDiv.className = "report white";
                indexDiv.className = "report index";
                indexDiv.textContent = (i + 1).toString();
                reportCard.appendChild(indexDiv);
                reportCard.appendChild(whiteDiv);
                reportCard.appendChild(blackDiv);
                
                if (i < this.game.player[0].moves.length) {
                    const wtCapture = this.game.player[0].moves[i].captured? ` <span style='color:orange'>${this.game.player[0].moves[i].captured.piece.icon}</span>` : '';
                    const wtFromIcon = this.game.player[0].moves[i].from_icon;
                    const wtFrom = this.game.player[0].moves[i].from;
                    const wtTo = this.game.player[0].moves[i].to;
                    whiteDiv.innerHTML = `${wtFromIcon} ${ci.ce.index_to_address(wtFrom, size)}▸${ci.ce.index_to_address(wtTo, size)}${wtCapture}`;
                    
                }
                if (i < this.game.player[1].moves.length) {
                    const bkCapture = this.game.player[1].moves[i].captured? ` <span style='color:orange'>${this.game.player[1].moves[i].captured.piece.icon}</span>` : '';
                    const bkFromIcon = this.game.player[1].moves[i].from_icon;
                    const bkFrom = this.game.player[1].moves[i].from;
                    const bkTo = this.game.player[1].moves[i].to;
                    blackDiv.innerHTML =`${bkFromIcon} ${ci.ce.index_to_address(bkFrom, size)}▸${ci.ce.index_to_address(bkTo, size)}${bkCapture}`;
                }
            }
        }
    }

    initialize_board() {
        this.game = ci.initialize_board(this.getAttribute("extended"));
        this.style.setProperty("--cols", this.game.size);
        
        // One div per square, built once; index in this.cells === index in game.board.
        this.cells = [];
        for (let i = 0; i < this.game.size * this.game.size; i++) {
            const cell = ci.createCell();
            cell.cellIndex = i;

            const row = Math.floor(i / this.game.size);
            const col = i % this.game.size;
            const file = String.fromCharCode("a".charCodeAt(0) + col);
            const rank = this.game.size - row;

            if (row === 0 || row === this.game.size - 1) {
                cell.setAttribute("ruler", file);
                cell.setAttribute("ruler-edge", row === 0 ? "top" : "bottom");
            } else if (col === 0 || col === this.game.size - 1) {
                cell.setAttribute("ruler", rank);
                cell.setAttribute("ruler-edge", col === 0 ? "left" : "right");
            }

            this.cells.push(cell);
        }
        // Mask goes last so child index i still equals cell index i.
        this.replaceChildren(...this.cells, this.drag_mask);
        this.render();
    }

    // Push game.board onto the cells. Call after any change to the game state.
    render() {
        this.__update_ui();
        for (let i = 0; i < this.cells.length; i++) {
            const sq = this.game.board[i];
            ci.setCellPiece(this.cells[i], sq ? sq.piece.name : "", sq ? sq.color === 1 : false);
        }
    }
}

customElements.define("chess-board", ChessBoard);