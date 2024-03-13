const express = require('express');
const { createServer } = require('node:http');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(express.static('../client'));

io.on('connection', socket => {
   console.log(`${socket.id} connected`);

   io.to(socket.id).emit('connected');

   socket.on('create room', (room, type) => {
      socket.join(room);
   });

   socket.on('join request', room => {
      const { rooms } = io.sockets.adapter;
      let accessGranted = true;

      if (rooms.has(room) && rooms.get(room).size < 2) {
         socket.join(room);
      } else {
         accessGranted = false;
      }

      io.to(socket.id).emit('join response', accessGranted);
   });

   socket.on('disconnect', () => {
      console.log(`${socket.id} disconnected`);
   });
});

server.listen(3000, () => console.log('Server listening on port 3000...'));