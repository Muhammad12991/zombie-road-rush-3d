const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const QRCode = require('qrcode');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*", // Duniya mein kahin se bhi frontend connect ho sakay
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname));

io.on('connection', (socket) => {

    // 1. PC Registers and Creates a Unique Room
    socket.on('registerPC', () => {
        const roomId = Math.random().toString(36).substring(2, 8);
        socket.join(roomId);
        socket.roomId = roomId;

        // YAHAN VERCEL KA LINK LAGA DIYA HAI TAAKE SCAN KARNE PAR GAME KHULE
        const mobileUrl = `https://zombie-road-rush-3d.vercel.app/controller.html?room=${roomId}`;

        QRCode.toDataURL(mobileUrl, { color: { dark: '#000000', light: '#ffffff' } }, (err, url) => {
            if (!err) socket.emit('qrCode', url);
        });

        console.log(`[PC Connected] Room created: ${roomId}`);
    });

    // 2. Mobile Joins the Specific Room
    socket.on('registerMobile', (roomId) => {
        socket.join(roomId);
        socket.to(roomId).emit('mobileConnected');
        socket.emit('connectedToPC');
        console.log(`[Mobile Connected] Joined room: ${roomId}`);
    });

    // 3. Relay Inputs Only to that Specific Room
    socket.on('mobileInput', (data) => {
        socket.to(data.room).emit('controllerInput', data);
    });

    // 4. Handle Disconnects
    socket.on('disconnect', () => {
        if (socket.roomId) {
            socket.to(socket.roomId).emit('mobileDisconnected');
            console.log(`[PC Disconnected] Room closed: ${socket.roomId}`);
        }
    });
});

server.listen(PORT, () => {
    console.log(`\n=== BACKEND SERVER RUNNING ===`);
    console.log(`Port: ${PORT}`);
});