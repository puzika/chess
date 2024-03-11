const express = require('express');
const { createServer } = require('node:http');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(express.static('../client'));

io.on('connection', socket => {
   console.log(`${socket.id} connected`);

   socket.on('disconnect', () => {
      console.log(`${socket.id} disconnected`);
   });
});

server.listen(3000, () => console.log('Server listening on port 3000...'));