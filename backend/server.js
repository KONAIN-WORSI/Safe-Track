const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const locationRoutes = require('./routes/locations');
const alertRoutes = require('./routes/alerts');
const { authenticateToken, extractToken, verifyToken } = require('./middleware/auth');
const { handleSocketConnection } = require('./socket/locationSocket');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:5173', methods: ['GET', 'POST'] }
});

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/safetrack')
  .then(() => console.log('MongoDB connected'))
  .catch(async err => {
    console.error(`MongoDB connection failed (${err.message}). Attempting fallback to in-memory DB...`);
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
      console.log(`Successfully connected to fallback in-memory MongoDB at ${mongoUri}`);
    } catch (memoryErr) {
      console.error('Fallback in-memory MongoDB failed to start:', memoryErr);
    }
  });

app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/locations', authenticateToken, locationRoutes);
app.use('/api/alerts', authenticateToken, alertRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

io.use((socket, next) => {
  const token = extractToken(socket);
  if (!token) return next(new Error('No token'));
  try {
    socket.user = verifyToken(token);
    next();
  } catch { next(new Error('Invalid token')); }
});

handleSocketConnection(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`SafeTrack server running on port ${PORT}`));

module.exports = { app, io };
