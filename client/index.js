import { io } from "https://cdn.socket.io/4.7.5/socket.io.esm.min.js";
const socket = io('http://localhost:3000');

const grid = document.querySelector('.board');
const loader = document.querySelector('.loader');
const loaderMessage = document.querySelector('.loader__message');
const cover = document.querySelector('.cover');
const createForm = document.querySelector('.form--create');
const joinForm = document.querySelector('.form--join');
const createLink = document.querySelector('.form__link--create');
const joinLink = document.querySelector('.form__link--join');
const types = [...document.querySelectorAll('.form__type')];
const timerSelf = document.querySelector('.info__time--self');
const timerOpponent = document.querySelector('.info__time--opponent');
const nameSelf = document.querySelector('.info__name--self');
const nameOpponent = document.querySelector('.info__name--opponent');
const capturedSelf = document.querySelector('.captured--self');
const capturedOpponent = document.querySelector('.captured--opponent');

const INTERVAL = 1000;

let board;
let room;
let turn = 'w';
let colorSelf;
let colorOpponent;
let timeSelf;
let timeOpponent;
let timer;
let inCheck = false;

////////////////////////////////////////////////////////
///RULES

const rules = {
   //PAWN

   'p': {
      moved: new Set(),

      canCapture(row, col) {
         if (col >= 0 && col < 8) {
            const piece = board[row][col];

            if (!piece) return false;

            return piece[0] === colorOpponent;
         }

         return false;
      },

      getMoves(row, col) {
         const result = [];
         const cellFront = board[row - 1][col];

         if (!cellFront) result.push([row - 1, col]);
         if (this.canCapture(row - 1, col - 1)) result.push([row - 1, col - 1]);
         if (this.canCapture(row - 1, col + 1)) result.push([row - 1, col + 1]);

         return result;
      }
   },

   //KNIGHT

   'n': {
      getMoves(row, col) {
         const result = [];
         const possibleMoves = [
            [row - 1, col + 2], [row - 1, col - 2], [row + 1, col + 2], [row + 1, col - 2],
            [row - 2, col + 1], [row - 2, col - 1], [row + 2, col + 1], [row + 2, col - 1]
         ];

         for (const [row, col] of possibleMoves) {
            if ((row >= 0 && row <= 7) &&
               (col >= 0 && col <= 7) &&
               board[row][col][0] !== colorSelf) result.push([row, col]);
         }

         return result;
      }
   },

   //BISHOP

   'b': {
      getMoves(row, col, color = colorOpponent) {
         let diag = [];
         let antiDiag = [];
         const topLeft = [row - Math.min(row, col), col - Math.min(row, col)];
         const topRight = [row - Math.min(row, 7 - col), col + Math.min(row, 7 - col)];

         let reached = false;

         for (let [i, j] = topLeft; i < 8 && j < 8; i++, j++) {
            if (!(i === row && j === col)) {
               if (board[i][j]) {
                  if (!reached) diag = [];

                  if (board[i][j][0] === color) diag.push([i, j]);

                  if (reached) break;
               } else {
                  diag.push([i, j]);
               }
            } else {
               reached = true;
            }
         }

         reached = false;

         for (let [i, j] = topRight; i < 8 && j >= 0; i++, j--) {
            if (!(i === row && j === col)) {
               if (board[i][j]) {
                  if (!reached) antiDiag = [];

                  if (board[i][j][0] === color) antiDiag.push([i, j]);

                  if (reached) break;
               } else {
                  antiDiag.push([i, j]);
               }
            } else {
               reached = true;
            }
         }

         return [...diag, ...antiDiag];
      }
   },

   //ROOK

   'r': {
      getMoves(row, col, color = colorOpponent) {
         let vertical = [];
         let horizontal = [];
         let reached = false;

         for (let i = 0; i < 8; i++) {
            if (i !== col) {
               const piece = board[row][i];

               if (piece) {
                  if (!reached) horizontal = [];

                  if (piece[0] === color) horizontal.push([row, i]);

                  if (reached) break;
               } else {
                  horizontal.push([row, i]);
               }
            } else {
               reached = true;
            }
         }

         reached = false;

         for (let i = 0; i < 8; i++) {
            if (i !== row) {
               const piece = board[i][col];

               if (piece) {
                  if (!reached) vertical = [];

                  if (piece[0] === color) vertical.push([i, col]);

                  if (reached) break;
               } else {
                  vertical.push([i, col]);
               }
            } else {
               reached = true;
            }
         }

         return [...horizontal, ...vertical];
      }
   },

   //QUEEN

   'q': {
      getMoves(row, col, color = colorOpponent) {
         const diagonals = rules.b.getMoves(row, col, color);
         const lines = rules.r.getMoves(row, col, color);

         return [...diagonals, ...lines];
      }
   },

   //KING

   'k': {
      kingMoved: false,

      getMoves(row, col, color = colorOpponent) {
         const result = [];
         const startRow = (row - 1 >= 0) ? row - 1 : row;
         const startCol = (col - 1 >= 0) ? col - 1 : col;
         const endRow = (row + 1 < 8) ? row + 1 : row;
         const endCol = (col + 1 < 8) ? col + 1 : col;

         for (let i = startRow; i <= endRow; i++) {
            for (let j = startCol; j <= endCol; j++) {
               if (!(row === i && col === j) &&
                  ((board[i][j] === '') || (board[i][j][0] === color))) result.push([i, j]);
            }
         }

         return result;
      }
   },

   getOpponentAttacks() {
      let attacks = [];
      const [rows, cols] = [board.length, board[0].length];

      for (let i = 0; i < rows; i++) {
         for (let j = 0; j < cols; j++) {
            if (!board[i][j] || board[i][j][0] === colorSelf) continue;

            const pieceName = board[i][j][1];

            if (pieceName === 'p') {
               if (i + 1 < rows && j - 1 >= 0) attacks.push([i + 1, j - 1]);
               if (i + 1 < rows && j + 1 < cols) attacks.push([i + 1, j + 1]);
            } else {
               const moves = rules[pieceName].getMoves(i, j, colorSelf);
               attacks.push(...moves);
            }
         }
      }

      return attacks;
   },

   isInCheck() {
      const attackCells = new Set();
      const [rows, cols] = [8, 8];
      const king = document.querySelector(`[data-piece="${colorSelf}k"]`);
      const cell = king.parentElement;
      const opponentAttacks = this.getOpponentAttacks();

      let col;
      let row;

      for (let i = 0; i < rows; i++) {
         for (let j = 0; j < cols; j++) {
            if (board[i][j] === `${colorSelf}k`) {
               row = i;
               col = j;
            }
         }
      }

      const isChecked = opponentAttacks.some(([x, y]) => x === row && y === col);

      if (isChecked) cell.classList.add('board__cell--checked');

      return isChecked;
   },

   willBeInCheck(rowOrigin, colOrigin, rowDest, colDest) {
      const piece = board[rowOrigin][colOrigin];
      const pieceDest = board[rowDest][colDest];

      board[rowDest][colDest] = piece;
      board[rowOrigin][colOrigin] = '';

      const isChecked = this.isInCheck();

      board[rowOrigin][colOrigin] = piece;
      board[rowDest][colDest] = pieceDest;

      return isChecked;
   }
}

const legalMoves = new Map();

function hasMoves() {
   if (legalMoves.size === 0) return false;

   for (const [piece, moves] of legalMoves) {
      if (moves.length > 0) return true;
   }

   return false;
}

function getValidMoves() {
   const [rows, cols] = [8, 8];

   for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
         const key = i * cols + j;

         if (board[i][j][0] === colorSelf) {
            const name = board[i][j][1];
            const moves = rules[name].getMoves(i, j);

            if (name === 'p' &&
               i === rows - 2 &&
               board[i - 2][j] === '' &&
               board[i - 1][j] === '') moves.push([i - 2, j]);

            const validMoves = moves.filter(([x, y]) => {
               const isValid = !rules.willBeInCheck(i, j, x, y);

               return isValid;
            });

            console.log(name, validMoves);

            legalMoves.set(key, validMoves);
         } else {
            legalMoves.set(key, []);
         }
      }
   }

   if (!hasMoves()) {
      if (inCheck) console.log('checkmate');
      else console.log('stalemate');
   }
}

function createBoard(cSelf, cOp) {
   let [king, queen] = ['k', 'q'];

   if (colorSelf === 'b') [king, queen] = [queen, king];

   board = [
      [`${cOp}r`, `${cOp}n`, `${cOp}b`, `${cOp}${queen}`, `${cOp}${king}`, `${cOp}b`, `${cOp}n`, `${cOp}r`],
      [`${cOp}p`, `${cOp}p`, `${cOp}p`, `${cOp}p`, `${cOp}p`, `${cOp}p`, `${cOp}p`, `${cOp}p`],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      [`${cSelf}p`, `${cSelf}p`, `${cSelf}p`, `${cSelf}p`, `${cSelf}p`, `${cSelf}p`, `${cSelf}p`, `${cSelf}p`],
      [`${cSelf}r`, `${cSelf}n`, `${cSelf}b`, `${cSelf}${queen}`, `${cSelf}${king}`, `${cSelf}b`, `${cSelf}n`, `${cSelf}r`]
   ];
}

function initializeBoard() {
   const width = grid.offsetWidth;
   grid.style.height = `${width}px`;

   const [cols, rows] = [8, 8];

   for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
         const color = (i % 2 === 0 && j % 2 === 0) || (i % 2 !== 0 && j % 2 !== 0) ? 'white' : 'black';
         const piece = board[i][j] ?
            `<img draggable="${(colorSelf === 'w' && board[i][j][0] === 'w') ? "true" : "false"}" 
                  class="board__piece"
                  data-color="${board[i][j][0]}"
                  data-name="${board[i][j][1]}"
                  data-piece="${board[i][j]}"
                  alt="${board[i][j]}"
                  src="./assets/${board[i][j]}.png">` : '';

         const markup = `
            <span data-row="${i}" data-col="${j}" class="board__cell board__cell--${color}">${piece}</span>
         `;

         grid.insertAdjacentHTML('beforeend', markup);
      }
   }
}

//SHOWING AND HIDING LOADER

function showLoader(message = '') {
   loaderMessage.textContent = message;
   loader.classList.remove('loader--hidden');
}

function hideLoader() {
   loaderMessage.textContent = '';
   loader.classList.add('loader--hidden');
}

window.addEventListener('resize', () => {
   const width = grid.offsetWidth;
   grid.style.height = `${width}px`;
});

createForm.addEventListener('submit', e => {
   e.preventDefault();

   const selected = types.find(type => type.checked);
   const type = selected.value;
   room = createLink.value;

   navigator.clipboard.writeText(room);

   socket.emit('create room', room, type);

   showLoader('waiting for the opponent');
});

joinForm.addEventListener('submit', e => {
   e.preventDefault();

   room = joinLink.value;

   socket.emit('join request', room);

   showLoader('joining...');
})

//NEW ROOM LINK

socket.on('connected', () => {
   createLink.value = `room${socket.id}`;
   hideLoader();
});

//JOIN REQUEST RESPONSE

socket.on('join response', accessGranted => {
   if (!accessGranted) {
      hideLoader();
      alert("failed to join (Either the room is full or it does't exist)");
   } else {
      console.log('joined successfully');
   }
});

//SET TIMER FUNCTION

function setTimer() {
   clearInterval(timer);

   timer = setInterval(() => {
      let time;
      let currentTimer;

      if (turn === colorSelf) {
         currentTimer = timerSelf;
         time = timeSelf;
         timeSelf--;
      } else {
         currentTimer = timerOpponent;
         time = timeOpponent;
         timeOpponent--;
      }

      const minutes = `${Math.floor(time / 60)}`.padStart(2, '0');
      const seconds = `${time % 60}`.padStart(2, '0');

      currentTimer.textContent = `${minutes}:${seconds}`;
   }, INTERVAL);
}

//REMOVING HINTS

function removeHints() {
   //REMOVE DOTS

   const moveCells = document.querySelectorAll('.board__cell--move');
   moveCells.forEach(cell => cell.classList.remove('board__cell--move'));

   //REMOVE CAPTURES

   const captureCells = document.querySelectorAll('.board__cell--capture');
   captureCells.forEach(cell => cell.classList.remove('board__cell--capture'));

   //REMOVE CHECKS

   const checkedPiece = document.querySelector('.board__cell--checked');
   if (checkedPiece && !inCheck) checkedPiece.classList.remove('board__cell--checked');
}

//SHOW PROMOTION BAR

function showPromotion(cell) {
   const pieces = ['q', 'r', 'b', 'n'];
   let images = '';

   for (const piece of pieces) {
      images += `<image alt="${piece}" 
         class="promotion__piece" 
         data-piece="${colorSelf}${piece}" 
         src="./assets/${colorSelf}${piece}.png">
      `;
   }

   const markup = `
      <div class="promotion">
         ${images}
      </div>
   `;

   cell.insertAdjacentHTML('beforeend', markup);
}

//DRAG AND DROP FUNCTIONS AND VARS

let currentPiece = null;

function dragStart() {
   currentPiece = this;
   const cell = currentPiece.parentElement;
   const rowOrigin = +cell.dataset.row;
   const colOrigin = +cell.dataset.col;
   const key = rowOrigin * 8 + colOrigin;

   const validMoves = legalMoves.get(key);
   console.log(legalMoves);

   validMoves.forEach(move => {
      const [row, col] = move;
      const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
      const hasChildren = cell.firstElementChild;

      if (!hasChildren) cell.classList.add('board__cell--move');
      else {
         const { color } = cell.firstElementChild.dataset;

         if (color === colorOpponent) cell.classList.add('board__cell--capture');
      }
   });
}

function dragOver(e) {
   e.preventDefault();
}

function dragEnter() {
   if (this.classList.contains('board__cell--move')) {
      this.classList.add('board__cell--hovered');
   }
}

function dragLeave() {
   this.classList.remove('board__cell--hovered');
}

function drop() {
   this.classList.remove('board__cell--hovered');

   if (!this.classList.contains('board__cell--move') &&
      !this.classList.contains('board__cell--capture')) {
      removeHints();
      return;
   }

   inCheck = false;

   removeHints();

   turn = colorOpponent;

   //DISABLE DRAG

   const pieces = document.querySelectorAll('.board__piece');
   pieces.forEach(piece => {
      if (piece.dataset.color === colorSelf) {
         piece.setAttribute("draggable", "false");
      }
   });

   const cell = currentPiece.parentElement;
   const { piece } = currentPiece.dataset;
   const rowOrigin = +cell.dataset.row;
   const colOrigin = +cell.dataset.col;
   const rowDest = +this.dataset.row;
   const colDest = +this.dataset.col;

   board[rowOrigin][colOrigin] = '';
   board[rowDest][colDest] = piece;

   if (this.firstElementChild) {
      const child = this.firstElementChild;
      const { piece } = child.dataset;

      const markup = `
      <img alt="${piece}" class="captured__piece" src="./assets/${piece}.png">
      `;

      capturedSelf.insertAdjacentHTML('beforeend', markup);
      child.remove();
   }

   currentPiece.remove();
   this.append(currentPiece);

   const coords = {
      rowOrigin: 7 - rowOrigin,
      colOrigin: 7 - colOrigin,
      rowDest: 7 - rowDest,
      colDest: 7 - colDest,
   }

   //coords on opponents board are 7 - row, col where 7 = rows - 1
   socket.emit('move', room, coords, piece);

   setTimer();
}

//DISPLAY MOVE ON OPPONENTS BOARD

socket.on('move opponent', (coords, pieceName) => {
   const { rowOrigin, rowDest, colOrigin, colDest } = coords;

   turn = colorSelf;

   //REMOVE CHECK FROM OPPONENT KING IF IT WAS PREVIOUSLY CHECKED

   const king = document.querySelector(`[data-piece="${colorOpponent}k"]`);
   const cell = king.parentElement;
   cell.classList.remove('board__cell--checked');

   //MOVE PIECE

   const positionOrigin = document.querySelector(`[data-row="${rowOrigin}"][data-col="${colOrigin}"]`);
   const positionFinal = document.querySelector(`[data-row="${rowDest}"][data-col="${colDest}"]`);
   const piece = positionOrigin.firstElementChild;

   board[rowOrigin][colOrigin] = '';
   board[rowDest][colDest] = pieceName;

   if (positionFinal.firstElementChild) {
      const child = positionFinal.firstElementChild;
      const { piece } = child.dataset;

      const markup = `
      <img alt="${piece}" class="captured__piece" src="./assets/${piece}.png">
      `;

      capturedOpponent.insertAdjacentHTML('beforeend', markup);
      child.remove();
   }

   piece.remove();
   positionFinal.append(piece);

   //CHECK FOR CHECKS

   inCheck = rules.isInCheck();

   if (inCheck) socket.emit('checked', room);

   setTimer();

   if (pieceName[1] === 'p' && rowDest === 7) {
      turn = colorOpponent;
      setTimer();
      socket.emit('promote', room, 7 - colDest);
   } else {
      //ENABLE DRAG

      const pieces = document.querySelectorAll('.board__piece');

      pieces.forEach(piece => {
         if (piece.dataset.color === colorSelf) {
            piece.setAttribute("draggable", "true");
         }
      });

      getValidMoves();
   }
});

socket.on('promoting', col => {
   turn = colorSelf;
   setTimer();

   const cell = document.querySelector(`[data-row="0"][data-col="${col}"]`);

   showPromotion(cell);

   const promotionBar = document.querySelector('.promotion');

   promotionBar.addEventListener('click', e => {
      const { target } = e;

      if (!target.classList.contains('promotion__piece')) return;

      const { piece } = target.dataset;

      board[0][col] = piece;

      const markup = `
         <img draggable="false"
            alt="${piece}"
            class="board__piece"
            data-color="${piece[0]}"
            data-name="${piece[1]}"
            data-piece="${piece}"
            src="./assets/${piece}.png">
      `;

      promotionBar.remove();

      cell.firstElementChild.remove();

      cell.insertAdjacentHTML('beforeend', markup);

      cell.firstElementChild.addEventListener('dragstart', dragStart);

      turn = colorOpponent;
      setTimer();

      socket.emit('promoted', room, piece, 7 - col);
   });
});

socket.on('promoted', (piece, col) => {
   turn = colorSelf;
   setTimer();

   board[7][col] = piece;

   const cell = document.querySelector(`[data-row="7"][data-col="${col}"]`);

   const markup = `
         <img draggable="false"
            alt="${piece}"
            class="board__piece"
            data-color="${piece[0]}"
            data-name="${piece[1]}"
            data-piece="${piece}"
            src="./assets/${piece}.png">
      `;

   cell.firstElementChild.remove();

   cell.insertAdjacentHTML('beforeend', markup);

   //ENABLE DRAG

   const pieces = document.querySelectorAll('.board__piece');

   pieces.forEach(piece => {
      if (piece.dataset.color === colorSelf) {
         piece.setAttribute("draggable", "true");
      }
   });

   //CHECK FOR CHECKS

   inCheck = rules.isInCheck();

   if (inCheck) socket.emit('checked', room);
});

socket.on('checked', () => {
   const king = document.querySelector(`[data-piece="${colorOpponent}k"]`);
   const cell = king.parentElement;
   cell.classList.add('board__cell--checked');
})

//INITIALIZE GAME

socket.on('game ready', roomInfo => {
   hideLoader();
   cover.classList.add('cover--hidden');

   timeSelf = +roomInfo.type * 60;
   timeOpponent = timeSelf;

   let [playerName1, playerName2] = roomInfo.players;
   [colorSelf, colorOpponent] = ['w', 'b'];

   if (playerName1 !== socket.id) {
      [playerName1, playerName2] = [playerName2, playerName1];
      [colorSelf, colorOpponent] = [colorOpponent, colorSelf];
   }

   nameSelf.textContent = playerName1;
   nameOpponent.textContent = playerName2;

   //INITIALIZE TIMER

   timerOpponent.textContent = `${timeOpponent / 60}:00`;
   timerSelf.textContent = `${timeSelf / 60}:00`;
   setTimer();

   //INITIALIZE BOARD

   createBoard(colorSelf, colorOpponent);
   initializeBoard();

   //INITIALIZE DRAG AND DROP

   const cells = document.querySelectorAll('.board__cell');
   const pieces = document.querySelectorAll('.board__piece');

   for (const piece of pieces) {
      piece.addEventListener('dragstart', dragStart);
   }

   for (const cell of cells) {
      cell.addEventListener('dragover', dragOver);
      cell.addEventListener('dragenter', dragEnter);
      cell.addEventListener('dragleave', dragLeave);
      cell.addEventListener('drop', drop);
   }

   if (colorSelf === turn) getValidMoves();
});