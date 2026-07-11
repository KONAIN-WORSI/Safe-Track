const jwt = require('jsonwebtoken');
const Guardian = require('../models/Guardian');
const TrackedUser = require('../models/TrackedUser');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const DEFAULT_TTL = process.env.JWT_EXPIRES_IN || '7d';
const TRACKING_TTL = process.env.TRACKING_JWT_EXPIRES_IN || '30d';

const extractToken = (reqOrSocket) => {
  if (!reqOrSocket) return null;

  const authHeader = reqOrSocket.headers?.authorization || reqOrSocket.handshake?.headers?.authorization;
  if (authHeader && /^Bearer\s+/i.test(authHeader)) {
    return authHeader.replace(/^Bearer\s+/i, '');
  }

  if (reqOrSocket.handshake?.auth?.token) return reqOrSocket.handshake.auth.token;
  if (reqOrSocket.query?.token) return reqOrSocket.query.token;
  return null;
};

const signToken = (id, options = {}) => jwt.sign({ id, type: 'guardian' }, JWT_SECRET, {
  expiresIn: options.expiresIn || DEFAULT_TTL
});

const signTrackingToken = (trackedUserId) => jwt.sign({ id: trackedUserId, type: 'tracking' }, JWT_SECRET, {
  expiresIn: TRACKING_TTL
});

const verifyToken = (token) => jwt.verify(token, JWT_SECRET);

const authenticateToken = async (req, res, next) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'Access token required' });

  try {
    const decoded = verifyToken(token);

    if (decoded.type === 'tracking') {
      const trackedUser = await TrackedUser.findById(decoded.id);
      if (!trackedUser) return res.status(401).json({ error: 'Tracked user not found' });
      req.user = trackedUser;
      req.authType = 'tracking';
      return next();
    }

    const guardian = await Guardian.findById(decoded.id);
    if (!guardian) return res.status(401).json({ error: 'User not found' });
    req.user = guardian;
    req.authType = 'guardian';
    next();
  } catch {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
};

module.exports = { authenticateToken, requireAdmin, extractToken, verifyToken, signToken, signTrackingToken };
