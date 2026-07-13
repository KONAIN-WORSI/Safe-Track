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
const allowedOrigins = [
  'http://localhost:5173',
  'https://safe-track-fawn.vercel.app'
];
if (process.env.FRONTEND_URL) {
  const envOrigins = process.env.FRONTEND_URL.split(',').map(o => o.trim());
  allowedOrigins.push(...envOrigins);
}

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    // Normalize: remove trailing slash
    const normalizedOrigin = origin.replace(/\/$/, '');
    
    const isAllowed = allowedOrigins.some(allowed => allowed.replace(/\/$/, '') === normalizedOrigin);
      
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']
};

const io = new Server(server, {
  cors: corsOptions
});

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/safetrack')
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error(`MongoDB connection failed: ${err.message}`);
    console.error('Set MONGODB_URI environment variable to a valid MongoDB connection string.');
    console.error('For production, use MongoDB Atlas: https://www.mongodb.com/atlas');
    process.exit(1);
  });

app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/locations', authenticateToken, locationRoutes);
app.use('/api/alerts', authenticateToken, alertRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

app.get('/', (req, res) => res.json({ status: 'ok', service: 'safetrack-backend', time: new Date() }));

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
