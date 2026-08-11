const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const QRCode = require('qrcode');
const cors = require('cors');

const app = express();
app.use(cors()); // Vercel ko allow karne ke liye
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
        const roomId = Math.random().toString(36).substring(2, 8); // Generate random 6-character ID
        socket.join(roomId);
        socket.roomId = roomId;

        // Jab hum isay Render par host karenge toh RENDER_EXTERNAL_URL khud ba khud lag jayega
        const backendUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
        const mobileUrl = `${backendUrl}/controller.html?room=${roomId}`;

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