const boardElement = document.getElementById('chessboard');
const levelSelect = document.getElementById('level-select');
const levelBadge = document.getElementById('level-badge');
const aiName = document.getElementById('ai-name');
const whiteCapturedEl = document.getElementById('white-captured');
const blackCapturedEl = document.getElementById('black-captured');
const whiteStatus = document.getElementById('white-status');
const blackStatus = document.getElementById('black-status');
const whiteBar = document.getElementById('white-bar');
const blackBar = document.getElementById('black-bar');
const moveRatingBox = document.getElementById('move-rating');
const accuracyPercent = document.getElementById('accuracy-percent');
const accuracyFill = document.getElementById('accuracy-fill');
const movesHistoryEl = document.getElementById('moves-history');
const endModal = document.getElementById('end-modal');
const modalIcon = document.getElementById('modal-icon');
const modalTitle = document.getElementById('modal-title');
const modalSubtitle = document.getElementById('modal-subtitle');
const nextLevelBtn = document.getElementById('next-level-btn');
const modalRestartBtn = document.getElementById('modal-restart-btn');
const quitBtn = document.getElementById('quit-btn');
const restartTopBtn = document.getElementById('restart-top-btn');

let currentLevel = 1;
let board = [];
let turn = 'w';
let selectedCoords = null;
let legalMovesForSelected = [];
let lastMove = null;
let capturedByWhite = [];
let capturedByBlack = [];
let moveScores = [];
let isGameOver = false;
let lastCaptureSquare = null;

const symbols = {
    wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
    bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟'
};

const pieceValues = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };

for (let i = 1; i <= 20; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `Level ${i}`;
    levelSelect.appendChild(opt);
}

function initGame(level = currentLevel) {
    currentLevel = level;
    levelSelect.value = currentLevel;
    levelBadge.textContent = `Level ${currentLevel} / 20`;
    aiName.textContent = `Bot - Level ${currentLevel}`;

    board = [
        ['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR'],
        ['bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP'],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        ['wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP'],
        ['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR']
    ];

    turn = 'w';
    selectedCoords = null;
    legalMovesForSelected = [];
    lastMove = null;
    capturedByWhite = [];
    capturedByBlack = [];
    moveScores = [];
    isGameOver = false;
    lastCaptureSquare = null;

    whiteCapturedEl.textContent = '';
    blackCapturedEl.textContent = '';
    movesHistoryEl.innerHTML = '';
    endModal.classList.add('hidden');
    updateRatingUI('neutral', 'Ready to Start', 'Make your opening move');
    updateAccuracyUI();
    updateTurnUI();
    renderBoard();
}

function renderBoard() {
    boardElement.innerHTML = '';
    const whiteInCheck = isKingInCheck(board, 'w');
    const blackInCheck = isKingInCheck(board, 'b');

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const sq = document.createElement('div');
            sq.classList.add('square', (r + c) % 2 === 0 ? 'light' : 'dark');

            if (lastMove && ((lastMove.sr === r && lastMove.sc === c) || (lastMove.er === r && lastMove.ec === c))) {
                sq.classList.add('last-move');
            }

            if (selectedCoords && selectedCoords.r === r && selectedCoords.c === c) {
                sq.classList.add('selected');
            }

            const isMoveTarget = legalMovesForSelected.find(m => m.er === r && m.ec === c);
            if (isMoveTarget) {
                sq.classList.add(board[r][c] ? 'valid-capture' : 'valid-move');
            }

            const piece = board[r][c];
            if (piece) {
                if ((piece === 'wK' && whiteInCheck) || (piece === 'bK' && blackInCheck)) {
                    sq.classList.add('king-check');
                }
                const span = document.createElement('span');
                span.classList.add('piece-span');
                span.textContent = symbols[piece];
                if (lastCaptureSquare && lastCaptureSquare.r === r && lastCaptureSquare.c === c) {
                    span.classList.add('capture-anim');
                }
                sq.appendChild(span);
            }

            sq.addEventListener('click', () => onSquareClick(r, c));
            boardElement.appendChild(sq);
        }
    }
    lastCaptureSquare = null;
}

function onSquareClick(r, c) {
    if (isGameOver || turn !== 'w') return;

    const clickedPiece = board[r][c];

    if (selectedCoords) {
        const chosenMove = legalMovesForSelected.find(m => m.er === r && m.ec === c);
        if (chosenMove) {
            performPlayerMove(chosenMove);
            return;
        }
    }

    if (clickedPiece && clickedPiece[0] === 'w') {
        if (selectedCoords && selectedCoords.r === r && selectedCoords.c === c) {
            selectedCoords = null;
            legalMovesForSelected = [];
        } else {
            selectedCoords = { r, c };
            legalMovesForSelected = getLegalMovesForPiece(board, r, c);
        }
        renderBoard();
    } else {
        selectedCoords = null;
        legalMovesForSelected = [];
        renderBoard();
    }
}

function performPlayerMove(move) {
    const evalBefore = evaluateBoard(board);
    const bestPlayerMove = getBestMove(board, 'w', 2);
    let bestEvalAfter = evalBefore;
    if (bestPlayerMove) {
        const simBest = simulateMove(board, bestPlayerMove);
        bestEvalAfter = evaluateBoard(simBest);
    }

    executeMoveOnBoard(move, 'w');
    const evalAfter = evaluateBoard(board);

    evaluatePlayerIntelligence(evalBefore, evalAfter, bestEvalAfter, move);

    selectedCoords = null;
    legalMovesForSelected = [];
    turn = 'b';
    updateTurnUI();
    renderBoard();

    if (checkGameEnd('b')) return;

    setTimeout(() => {
        makeAIMove();
    }, 450);
}

function makeAIMove() {
    if (isGameOver) return;

    const aiMove = chooseAIMoveByLevel(board, currentLevel);
    if (!aiMove) {
        checkGameEnd('b');
        return;
    }

    executeMoveOnBoard(aiMove, 'b');
    turn = 'w';
    updateTurnUI();
    renderBoard();
    checkGameEnd('w');
}

function executeMoveOnBoard(move, color) {
    const movingPiece = board[move.sr][move.sc];
    const targetPiece = board[move.er][move.ec];

    if (targetPiece) {
        if (color === 'w') {
            capturedByWhite.push(symbols[targetPiece]);
            whiteCapturedEl.textContent = capturedByWhite.join('');
        } else {
            capturedByBlack.push(symbols[targetPiece]);
            blackCapturedEl.textContent = capturedByBlack.join('');
        }
        lastCaptureSquare = { r: move.er, c: move.ec };
        boardElement.classList.remove('board-shake');
        void boardElement.offsetWidth;
        boardElement.classList.add('board-shake');
    }

    board[move.er][move.ec] = movingPiece;
    board[move.sr][move.sc] = null;

    if (movingPiece === 'wP' && move.er === 0) board[move.er][move.ec] = 'wQ';
    if (movingPiece === 'bP' && move.er === 7) board[move.er][move.ec] = 'bQ';

    lastMove = move;
    logMove(color, movingPiece, move, Boolean(targetPiece));
}

function evaluatePlayerIntelligence(before, after, bestAfter, move) {
    const gain = after - before;
    const diffFromBest = bestAfter - after;
    let score = 85;

    if (gain >= 300 || (diffFromBest <= 10 && gain >= 100)) {
        score = 100;
        updateRatingUI('brilliant', 'Brilliant Move! !!', 'Tactical mastery and material gain.');
    } else if (diffFromBest <= 35) {
        score = 95;
        updateRatingUI('great', 'Great Move !', 'Optimal positional control.');
    } else if (diffFromBest <= 110) {
        score = 80;
        updateRatingUI('good', 'Good Move', 'Solid development and safe play.');
    } else if (diffFromBest <= 260) {
        score = 55;
        updateRatingUI('inaccuracy', 'Inaccuracy ?!', 'Missed a stronger tactical option.');
    } else {
        score = 25;
        updateRatingUI('blunder', 'Blunder ??', 'Lost significant advantage or material.');
    }

    moveScores.push(score);
    updateAccuracyUI();
}

function updateRatingUI(type, title, desc) {
    moveRatingBox.className = `rating-box ${type}`;
    moveRatingBox.innerHTML = `
        <span class="rating-title">${title}</span>
        <span class="rating-desc">${desc}</span>
    `;
}

function updateAccuracyUI() {
    if (moveScores.length === 0) {
        accuracyPercent.textContent = '100%';
        accuracyFill.style.width = '100%';
        return;
    }
    const avg = Math.round(moveScores.reduce((a, b) => a + b, 0) / moveScores.length);
    accuracyPercent.textContent = `${avg}%`;
    accuracyFill.style.width = `${avg}%`;
}

function logMove(color, piece, move, isCapture) {
    const files = 'abcdefgh';
    const from = `${files[move.sc]}${8 - move.sr}`;
    const to = `${files[move.ec]}${8 - move.er}`;
    const row = document.createElement('div');
    row.className = 'move-row';
    row.innerHTML = `
        <span>${color === 'w' ? 'White' : 'Black'} (${symbols[piece]})</span>
        <span>${from} ${isCapture ? 'x' : '->'} ${to}</span>
    `;
    movesHistoryEl.prepend(row);
}

function updateTurnUI() {
    const whiteCheck = isKingInCheck(board, 'w');
    const blackCheck = isKingInCheck(board, 'b');

    whiteBar.classList.toggle('active-turn', turn === 'w');
    blackBar.classList.toggle('active-turn', turn === 'b');

    whiteStatus.className = 'status-pill';
    blackStatus.className = 'status-pill';

    if (whiteCheck) {
        whiteStatus.textContent = 'CHECK!';
        whiteStatus.classList.add('check-alert');
    } else {
        whiteStatus.textContent = turn === 'w' ? 'Your Turn' : 'Waiting';
        if (turn === 'w') whiteStatus.classList.add('active');
    }

    if (blackCheck) {
        blackStatus.textContent = 'CHECK!';
        blackStatus.classList.add('check-alert');
    } else {
        blackStatus.textContent = turn === 'b' ? 'Thinking...' : 'Waiting';
        if (turn === 'b') blackStatus.classList.add('active');
    }
}

function checkGameEnd(nextColor) {
    const allMoves = getAllLegalMoves(board, nextColor);
    if (allMoves.length === 0) {
        isGameOver = true;
        const inCheck = isKingInCheck(board, nextColor);
        if (inCheck) {
            if (nextColor === 'b') {
                showEndModal(true, 'Victory!', `Checkmate! You beat Level ${currentLevel}.`);
            } else {
                showEndModal(false, 'Defeat', `Checkmate! Bot Level ${currentLevel} won.`);
            }
        } else {
            showEndModal(false, 'Stalemate', 'Draw! No legal moves remaining.');
        }
        return true;
    }
    return false;
}

function showEndModal(playerWon, title, subtitle) {
    modalIcon.textContent = playerWon ? '🏆' : '💀';
    modalTitle.textContent = title;
    modalSubtitle.textContent = subtitle;

    if (playerWon && currentLevel < 20) {
        nextLevelBtn.classList.remove('hidden');
    } else {
        nextLevelBtn.classList.add('hidden');
    }

    endModal.classList.remove('hidden');
}

function chooseAIMoveByLevel(state, level) {
    const moves = getAllLegalMoves(state, 'b');
    if (moves.length === 0) return null;

    if (level <= 3) {
        if (Math.random() < 0.75) {
            return moves[Math.floor(Math.random() * moves.length)];
        }
        return getBestMove(state, 'b', 1);
    }
    if (level <= 8) {
        if (Math.random() < 0.35) {
            return moves[Math.floor(Math.random() * moves.length)];
        }
        return getBestMove(state, 'b', 1);
    }
    if (level <= 14) {
        return getBestMove(state, 'b', 2);
    }
    return getBestMove(state, 'b', 3);
}

function getBestMove(state, color, depth) {
    const moves = getAllLegalMoves(state, color);
    if (moves.length === 0) return null;

    moves.sort(() => Math.random() - 0.5);
    let bestMove = moves[0];
    let bestVal = color === 'w' ? -Infinity : Infinity;

    for (const move of moves) {
        const nextState = simulateMove(state, move);
        const val = minimax(nextState, depth - 1, -Infinity, Infinity, color === 'b');
        if (color === 'w' && val > bestVal) {
            bestVal = val;
            bestMove = move;
        } else if (color === 'b' && val < bestVal) {
            bestVal = val;
            bestMove = move;
        }
    }
    return bestMove;
}

function minimax(state, depth, alpha, beta, isMaximizing) {
    if (depth === 0) return evaluateBoard(state);

    const color = isMaximizing ? 'w' : 'b';
    const moves = getAllLegalMoves(state, color);

    if (moves.length === 0) {
        if (isKingInCheck(state, color)) {
            return isMaximizing ? -99999 : 99999;
        }
        return 0;
    }

    if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of moves) {
            const ev = minimax(simulateMove(state, move), depth - 1, alpha, beta, false);
            maxEval = Math.max(maxEval, ev);
            alpha = Math.max(alpha, ev);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const move of moves) {
            const ev = minimax(simulateMove(state, move), depth - 1, alpha, beta, true);
            minEval = Math.min(minEval, ev);
            beta = Math.min(beta, ev);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

function evaluateBoard(state) {
    let total = 0;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = state[r][c];
            if (!p) continue;
            const val = pieceValues[p[1]];
            const centerBonus = (3.5 - Math.abs(3.5 - r)) + (3.5 - Math.abs(3.5 - c));
            if (p[0] === 'w') total += val + centerBonus * 4;
            else total -= val + centerBonus * 4;
        }
    }
    return total;
}

function simulateMove(state, move) {
    const copy = state.map(row => [...row]);
    const p = copy[move.sr][move.sc];
    copy[move.er][move.ec] = p;
    copy[move.sr][move.sc] = null;
    if (p === 'wP' && move.er === 0) copy[move.er][move.ec] = 'wQ';
    if (p === 'bP' && move.er === 7) copy[move.er][move.ec] = 'bQ';
    return copy;
}

function getAllLegalMoves(state, color) {
    const legal = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (state[r][c] && state[r][c][0] === color) {
                legal.push(...getLegalMovesForPiece(state, r, c));
            }
        }
    }
    return legal;
}

function getLegalMovesForPiece(state, r, c) {
    const piece = state[r][c];
    if (!piece) return [];
    const color = piece[0];
    const pseudoMoves = getPseudoMoves(state, r, c);
    return pseudoMoves.filter(m => {
        const nextState = simulateMove(state, m);
        return !isKingInCheck(nextState, color);
    });
}

function isKingInCheck(state, color) {
    let kr = -1, kc = -1;
    const kingCode = color + 'K';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (state[r][c] === kingCode) {
                kr = r;
                kc = c;
                break;
            }
        }
    }
    if (kr === -1) return true;

    const enemy = color === 'w' ? 'b' : 'w';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (state[r][c] && state[r][c][0] === enemy) {
                const attacks = getPseudoMoves(state, r, c);
                if (attacks.some(m => m.er === kr && m.ec === kc)) return true;
            }
        }
    }
    return false;
}

function getPseudoMoves(state, r, c) {
    const piece = state[r][c];
    const color = piece[0];
    const type = piece[1];
    const moves = [];

    const addIfValid = (er, ec) => {
        if (er < 0 || er > 7 || ec < 0 || ec > 7) return false;
        const target = state[er][ec];
        if (!target) {
            moves.push({ sr: r, sc: c, er, ec });
            return true;
        }
        if (target[0] !== color) {
            moves.push({ sr: r, sc: c, er, ec });
        }
        return false;
    };

    if (type === 'P') {
        const dir = color === 'w' ? -1 : 1;
        const startRow = color === 'w' ? 6 : 1;
        if (r + dir >= 0 && r + dir <= 7 && !state[r + dir][c]) {
            moves.push({ sr: r, sc: c, er: r + dir, ec: c });
            if (r === startRow && !state[r + 2 * dir][c]) {
                moves.push({ sr: r, sc: c, er: r + 2 * dir, ec: c });
            }
        }
        for (const dc of [-1, 1]) {
            const er = r + dir, ec = c + dc;
            if (er >= 0 && er <= 7 && ec >= 0 && ec <= 7) {
                const target = state[er][ec];
                if (target && target[0] !== color) {
                    moves.push({ sr: r, sc: c, er, ec });
                }
            }
        }
    } else if (type === 'N') {
        const jumps = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
        jumps.forEach(([dr, dc]) => addIfValid(r + dr, c + dc));
    } else if (type === 'K') {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr !== 0 || dc !== 0) addIfValid(r + dr, c + dc);
            }
        }
    } else {
        const dirs = [];
        if (type === 'R' || type === 'Q') dirs.push([-1,0],[1,0],[0,-1],[0,1]);
        if (type === 'B' || type === 'Q') dirs.push([-1,-1],[-1,1],[1,-1],[1,1]);
        dirs.forEach(([dr, dc]) => {
            let er = r + dr, ec = c + dc;
            while (addIfValid(er, ec)) {
                er += dr;
                ec += dc;
            }
        });
    }
    return moves;
}

levelSelect.addEventListener('change', (e) => initGame(Number(e.target.value)));
restartTopBtn.addEventListener('click', () => initGame(currentLevel));
modalRestartBtn.addEventListener('click', () => initGame(currentLevel));
nextLevelBtn.addEventListener('click', () => {
    if (currentLevel < 20) initGame(currentLevel + 1);
});
quitBtn.addEventListener('click', () => {
    endModal.classList.add('hidden');
    isGameOver = true;
    boardElement.innerHTML = '<div style="grid-column: span 8; grid-row: span 8; display:flex; align-items:center; justify-content:center; color:#94a3b8; font-weight:700;">Game Closed. Select a Level to Play Again.</div>';
});

initGame(1);