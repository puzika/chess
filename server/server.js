const express = require('express');
const { createServer } = require('node:http');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server);

const rooms = new Map();

app.use(express.static('../client'));

io.on('connection', socket => {
   console.log(`${socket.id} connected`);

   io.to(socket.id).emit('connected');

   socket.on('create room', (room, type, name) => {
      socket.join(room);

      rooms.set(room, { players: [name], type });
   });

   socket.on('join request', (room, name) => {
      let accessGranted = true;

      if (rooms.has(room) && rooms.get(room).players.length < 2) {
         socket.join(room);
         rooms.get(room).players.push(name);
         io.in(room).emit('game ready', rooms.get(room));
      } else {
         accessGranted = false;
      }

      io.to(socket.id).emit('join response', accessGranted);
   });

   socket.on('move', (room, coords, piece) => {
      socket.to(room).emit('move opponent', coords, piece);
   });

   socket.on('checked', (room) => socket.to(room).emit('checked'));

   socket.on('promote', (room, col) => socket.to(room).emit('promoting', col));

   socket.on('promoted', (room, piece, col) => socket.to(room).emit('promoted', piece, col));

   socket.on('game over', (room, message) => socket.to(room).emit('game over', message));

   socket.on('leave', room => {
      socket.to(room).emit('opponent left');
      io.in(room).socketsLeave(room);
   });

   socket.on('rematch', room => socket.to(room).emit('rematch request'));

   socket.on('request accepted', (room, roomData) => io.in(room).emit('game ready', roomData));

   socket.on('disconnect', () => {
      console.log(`${socket.id} disconnected`);
   });
});

server.listen(3000, () => console.log('Server listening on port 3000...'));