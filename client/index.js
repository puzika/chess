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

const rules = {
   'n': {
      getMoves(row, col) {
         const result = [];

         if (row - 1 >= 0 && col + 2 <= 7) result.push([row - 1, col + 2]);
         if (row - 1 >= 0 && col - 2 >= 0) result.push([row - 1, col - 2]);
         if (row + 1 <= 7 && col + 2 <= 7) result.push([row + 1, col + 2]);
         if (row + 1 <= 7 && col - 2 >= 0) result.push([row + 1, col - 2]);
         if (row - 2 >= 0 && col + 1 <= 7) result.push([row - 2, col + 1]);
         if (row - 2 >= 0 && col - 1 >= 0) result.push([row - 2, col - 1]);
         if (row + 2 <= 7 && col + 1 <= 7) result.push([row + 2, col + 1]);
         if (row + 2 <= 7 && col - 1 >= 0) result.push([row + 2, col - 1]);

         return result;
      }
   },

   'b': {
      getDiag(direction = 'bottom-right', row, col) {
         let diag = [];
         let reached = false;
         const start = (direction === 'bottom-right') ?
            [row - Math.min(row, col), col - Math.min(row, col)] :
            [row - Math.min(row, 7 - col), col + Math.min(row, 7 - col)];

         let [i, j] = start;

         while (direction === 'bottom-right' &&
            i < 8 && j < 8 ||
            direction === 'bottom-left' &&
            i < 8 && j >= 0) {
            const cell = document.querySelector(`[data-row="${i}"][data-col="${j}"]`);
            const child = cell.firstElementChild;

            if (i !== row && j !== col) {
               if (child) {
                  if (!reached) diag = [];

                  if (child.dataset.color === colorOpponent) diag.push([i, j]);

                  if (reached) break;
               } else {
                  diag.push([i, j]);
               }
            } else {
               reached = true;
            }

            direction === 'bottom-right' ? j++ : j--;
            i++;
         }

         return diag;
      },

      getMoves(row, col) {
         const topLeft = [row - Math.min(row, col), col - Math.min(row, col)];
         const topRight = [row - Math.min(row, 7 - col), col + Math.min(row, 7 - col)];

         const diag = this.getDiag('bottom-right', row, col);
         const antiDiag = this.getDiag('bottom-left', row, col);

         return [...diag, ...antiDiag];
      }
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
}

//DRAG AND DROP FUNCTIONS AND VARS

let currentPiece = null;

function dragStart() {
   currentPiece = this;
   const cell = currentPiece.parentElement;
   const { name } = currentPiece.dataset;
   const rowOrigin = +cell.dataset.row;
   const colOrigin = +cell.dataset.col;

   const moves = rules[name].getMoves(rowOrigin, colOrigin);

   moves.forEach(move => {
      const [row, col] = move;
      const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
      const hasChildren = cell.hasChildNodes();

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

   removeHints();

   if (this.innerHTML) {
      const { color } = this.firstElementChild.dataset;

      if (color === colorSelf) return;
   }

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

   if (this.hasChildNodes()) {
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

   const pieces = document.querySelectorAll('.board__piece');

   pieces.forEach(piece => {
      if (piece.dataset.color === colorSelf) {
         piece.setAttribute("draggable", "true");
      }
   });

   const positionOrigin = document.querySelector(`[data-row="${rowOrigin}"][data-col="${colOrigin}"]`);
   const positionFinal = document.querySelector(`[data-row="${rowDest}"][data-col="${colDest}"]`);
   const piece = positionOrigin.firstElementChild;

   board[rowOrigin][colOrigin] = '';
   board[rowDest][colDest] = pieceName;

   if (positionFinal.hasChildNodes()) {
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

   setTimer();
});

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
});