const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Отдаем наши статические файлы (html, css, js)
app.use(express.static(__dirname));

let players = {};
let availableRoles = ['X', 'O']; // Список свободных ролей

io.on('connection', (socket) => {
    console.log('Подключился:', socket.id);

    // Если есть свободные роли — назначаем рандомную
    if (availableRoles.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableRoles.length);
        const role = availableRoles.splice(randomIndex, 1)[0]; // Забираем роль из списка
        
        players[role] = socket.id;
        socket.emit('assignRole', role);
    } else {
        socket.emit('assignRole', 'viewer');
    }

    socket.on('makeMove', (data) => {
        socket.broadcast.emit('moveMade', data);
    });

    socket.on('disconnect', () => {
        // Если ушел игрок, возвращаем его роль в список доступных
        for (let role in players) {
            if (players[role] === socket.id) {
                availableRoles.push(role);
                delete players[role];
                break;
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});