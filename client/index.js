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

const board = [
   ['br', 'bn', 'bb', 'bq', 'bk', 'bb', 'bn', 'br'],
   ['bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp'],
   ['', '', '', '', '', '', '', ''],
   ['', '', '', '', '', '', '', ''],
   ['', '', '', '', '', '', '', ''],
   ['', '', '', '', '', '', '', ''],
   ['wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp'],
   ['wr', 'wn', 'wb', 'wq', 'wk', 'wb', 'wn', 'wr']
]

function initializeBoard() {
   const width = grid.offsetWidth;
   grid.style.height = `${width}px`;

   const [cols, rows] = [8, 8];

   for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
         const color = (i % 2 === 0 && j % 2 === 0) || (i % 2 !== 0 && j % 2 !== 0) ? 'white' : 'black';
         const piece = board[i][j] ?
            `<img draggable="true" 
                  class="board__image" 
                  alt="${board[i][j]}" 
                  src="./assets/${board[i][j]}.png">` : '';

         const markup = `
            <span class="board__cell board__cell--${color}">${piece}</span>
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
   const room = createLink.value;

   navigator.clipboard.writeText(room);

   socket.emit('create room', room, type);

   showLoader('waiting for the opponent');
});

joinForm.addEventListener('submit', e => {
   e.preventDefault();

   socket.emit('join request', joinLink.value);

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
})

//INITIALIZE BOARD

socket.on('game ready', roomInfo => {
   hideLoader();
   cover.classList.add('cover--hidden');

   initializeBoard();
   console.log('spielbereit', roomInfo);
});