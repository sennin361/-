const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const bannedUsers = new Set();
let chatHistory = [];

app.use(express.static('public')); // publicフォルダ配信

const ADMIN_PASSWORD = "sennin151522";

io.on('connection', (socket) => {
  console.log('ユーザー接続:', socket.id);

  socket.on('join', (username) => {
    if(bannedUsers.has(username)) {
      socket.emit('banned');
      socket.disconnect();
      return;
    }
    socket.username = username;

    // 過去チャット履歴を送信
    socket.emit('chat history', chatHistory);

    io.emit('system message', `${username} さんが入室しました`);
  });

  socket.on('chat message', (msg) => {
    if(!socket.username) return;
    const time = new Date().toLocaleTimeString();
    const messageData = { username: socket.username, msg, time };
    chatHistory.push(messageData);
    io.emit('chat message', messageData);
  });

  socket.on('disconnect', () => {
    if(socket.username) {
      io.emit('system message', `${socket.username} さんが退室しました`);
    }
  });

  // 管理者機能：垢バン
  socket.on('ban user', (data) => {
    if(data.password !== ADMIN_PASSWORD) return;
    bannedUsers.add(data.username);
    io.emit('system message', `${data.username} は垢バンされました`);
    for(const [id, s] of io.sockets.sockets) {
      if(s.username === data.username) {
        s.emit('banned');
        s.disconnect();
      }
    }
  });

  // 管理者機能：サーバーリセット
  socket.on('reset server', (password) => {
    if(password !== ADMIN_PASSWORD) return;
    chatHistory = [];
    bannedUsers.clear();
    io.emit('system message', `サーバーがリセットされました`);
  });

  // 管理者機能：一斉送信
  socket.on('broadcast', (data) => {
    if(data.password !== ADMIN_PASSWORD) return;
    io.emit('system message', `管理者から: ${data.message}`);
  });

  // 管理者機能：チャット履歴送信（個別）
  socket.on('request history', (password) => {
    if(password !== ADMIN_PASSWORD) return;
    socket.emit('chat history', chatHistory);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
