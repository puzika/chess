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

   socket.on('create room', (room, type) => {
      socket.join(room);

      rooms.set(room, { players: [socket.id], type });

      console.log(rooms);
   });

   socket.on('join request', room => {
      let accessGranted = true;

      if (rooms.has(room) && rooms.get(room).players.length < 2) {
         socket.join(room);
         rooms.get(room).players.push(socket.id);
         io.in(room).emit('game ready', rooms.get(room));
      } else {
         accessGranted = false;
      }

      console.log(rooms);

      io.to(socket.id).emit('join response', accessGranted);
   });

   socket.on('disconnect', () => {
      console.log(`${socket.id} disconnected`);
   });
});

server.listen(3000, () => console.log('Server listening on port 3000...'));