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
const timeSelf = document.querySelector('.info__time--self');
const timeOpponent = document.querySelector('.info__time--opponent');
const nameSelf = document.querySelector('.info__name--self');
const nameOpponent = document.querySelector('.info__name--opponent');

let board;
let room;
let turn = 'w';

function createBoard(cSelf, cOp) {
   board = [
      [`${cOp}r`, `${cOp}n`, `${cOp}b`, `${cOp}q`, `${cOp}k`, `${cOp}b`, `${cOp}n`, `${cOp}r`],
      [`${cOp}p`, `${cOp}p`, `${cOp}p`, `${cOp}p`, `${cOp}p`, `${cOp}p`, `${cOp}p`, `${cOp}p`],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      [`${cSelf}p`, `${cSelf}p`, `${cSelf}p`, `${cSelf}p`, `${cSelf}p`, `${cSelf}p`, `${cSelf}p`, `${cSelf}p`],
      [`${cSelf}r`, `${cSelf}n`, `${cSelf}b`, `${cSelf}q`, `${cSelf}k`, `${cSelf}b`, `${cSelf}n`, `${cSelf}r`]
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
            `<img draggable="true" 
                  class="board__piece"
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
   if (!accessGranted) console.log('failed to join');
   else console.log('joined successfully');
});

//DRAG AND DROP FUNCTIONS AND VARS

let currentPiece = null;

function dragStart() {
   currentPiece = this;
}

function dragOver(e) {
   e.preventDefault();
}

function dragEnter() {
   this.classList.add('board__cell--hovered');
}

function dragLeave() {
   this.classList.remove('board__cell--hovered');
}

function drop() {
   this.classList.remove('board__cell--hovered');

   if (this.innerHTML) return;

   const cell = currentPiece.parentElement;
   const { piece } = currentPiece.dataset.piece;
   const rowOrigin = +cell.dataset.row;
   const colOrigin = +cell.dataset.col;
   const rowDest = +this.dataset.row;
   const colDest = +this.dataset.col;

   board[rowOrigin][colOrigin] = '';
   board[rowDest][colDest] = piece;

   currentPiece.remove();
   this.append(currentPiece);

   const coords = {
      rowOrigin: 7 - rowOrigin,
      colOrigin,
      rowDest: 7 - rowDest,
      colDest,
   }

   //coords on opponents board are 7 - row, col where 7 = rows - 1
   socket.emit('move', room, coords, piece);
}

//DISPLAY MOVE ON OPPONENTS BOARD

socket.on('move opponent', (coords, pieceName) => {
   const { rowOrigin, rowDest, colOrigin, colDest } = coords;

   const positionOrigin = document.querySelector(`[data-row="${rowOrigin}"][data-col="${colOrigin}"]`);
   const positionFinal = document.querySelector(`[data-row="${rowDest}"][data-col="${colDest}"]`);
   const piece = positionOrigin.firstElementChild;

   board[rowOrigin][colOrigin] = '';
   board[rowDest][colDest] = pieceName;

   piece.remove();
   positionFinal.append(piece);
});

//INITIALIZE BOARD

socket.on('game ready', roomInfo => {
   hideLoader();
   cover.classList.add('cover--hidden');

   let [playerName1, playerName2] = roomInfo.players;
   let [colorSelf, colorOpponent] = ['w', 'b'];

   if (playerName1 !== socket.id) {
      [playerName1, playerName2] = [playerName2, playerName1];
      [colorSelf, colorOpponent] = [colorOpponent, colorSelf];
   }

   nameSelf.textContent = playerName1;
   nameOpponent.textContent = playerName2;

   const time = roomInfo.type;
   timeOpponent.textContent = `${time}:00`;
   timeSelf.textContent = `${time}:00`;

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