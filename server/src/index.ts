import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { initServerDatabase } from './db';
import { authRouter } from './routes/authRoutes';
import { challengeRouter } from './routes/challengeRoutes';
import { adminRouter } from './routes/adminRoutes';
import { setupSocketHandlers } from './socketHandler';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

app.use(cors());
app.use(express.json({ limit: '25mb' })); // Support celebration photo uploads
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Initialize SQLite database & default seed data
initServerDatabase();

// Register REST API Routes
app.use('/api/auth', authRouter);
app.use('/api/challenges', challengeRouter);
app.use('/api/admin', adminRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'WalkAPP Multiplayer Backend',
    timestamp: Date.now(),
  });
});

// Setup WebSocket live race events
setupSocketHandlers(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`===========================================`);
  console.log(` WalkAPP Multiplayer Backend is running!   `);
  console.log(` REST API: http://localhost:${PORT}/api    `);
  console.log(` WebSockets: ws://localhost:${PORT}        `);
  console.log(` Default Admin: admin / admin123           `);
  console.log(`===========================================`);
});
