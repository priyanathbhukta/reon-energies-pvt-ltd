import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';

// Legacy routes (existing)
import enquiriesRouter from '../routes/enquiries.js';
import legacyAuthRouter from '../routes/auth.js';
import dashboardRouter from '../routes/dashboard.js';
import contentRouter from '../routes/content.js';
import adminQuotationsRouter from '../routes/admin_quotations.js';
import adminInvoicesRouter from '../routes/admin_invoices.js';
import pdfsRouter from '../routes/pdfs.js';
import projectsRouter from '../routes/projects.js';
import legacyAuthMiddleware from '../middleware/auth.js';

// New POS Portal routes
import authController from './controllers/authController.js';
import posController from './controllers/posController.js';
import leadController from './controllers/leadController.js';
import { authenticate } from './middlewares/auth.js';

import config from './config/app.js';
import { rateLimiter, otpRateLimiter } from './middlewares/rateLimiter.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);

// ─── Socket.IO Setup ────────────────────────────────────────
const io = new SocketIO(httpServer, {
  cors: {
    origin: config.cors.allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Socket.IO auth middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication required'));

  try {
    const jwt = (await import('jsonwebtoken')).default;
    const decoded = jwt.verify(token, config.jwt.accessSecret);
    socket.userId = decoded.userId;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.userId}`);

  // Join user-specific room for targeted notifications
  socket.join(`user:${socket.userId}`);

  socket.on('disconnect', () => {
    console.log(`🔌 User disconnected: ${socket.userId}`);
  });
});

// Make io accessible in controllers
app.set('io', io);

// ─── Security ───────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // Next.js handles CSP
}));

// ─── CORS ───────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (config.cors.allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// ─── Body Parsing ───────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Rate Limiting ──────────────────────────────────────────
app.use('/api/', rateLimiter);

// ─── Legacy Routes (existing REON website) ──────────────────
app.use('/api/enquiries', enquiriesRouter);
app.use('/api/auth', legacyAuthRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/content', contentRouter);
app.use('/api/admin/quotations', legacyAuthMiddleware, adminQuotationsRouter);
app.use('/api/admin/invoices', legacyAuthMiddleware, adminInvoicesRouter);
app.use('/api/projects', legacyAuthMiddleware, projectsRouter);
app.use('/pdfs', pdfsRouter);

// ─── New POS Portal Routes ──────────────────────────────────
app.use('/api/v2/auth', authController);
app.use('/api/v2/pos', posController);
app.use('/api/v2/leads', leadController);

// ─── Health Check ───────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      socketio: io.engine.clientsCount + ' clients',
    },
  });
});

// ─── Error Handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: config.server.env === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

// ─── Start Server ───────────────────────────────────────────
const PORT = config.server.port;
httpServer.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║         🚀 REON POS Portal API Server v2.0            ║
╠════════════════════════════════════════════════════════╣
║  Server:    http://localhost:${PORT}                      ║
║  Health:    http://localhost:${PORT}/api/health            ║
║  WebSocket: ws://localhost:${PORT}                        ║
║  Mode:      ${config.server.env.padEnd(40)}║
╠════════════════════════════════════════════════════════╣
║  Legacy APIs:                                          ║
║    /api/auth          (existing admin auth)            ║
║    /api/enquiries     (website enquiries)              ║
║    /api/dashboard     (admin dashboard)                ║
║  New POS APIs (v2):                                    ║
║    /api/v2/auth       (OTP + JWT + MFA)                ║
║    /api/v2/pos        (partner management)             ║
║    /api/v2/leads      (lead management)                ║
╚════════════════════════════════════════════════════════╝
  `);
});

export { app, io };
