import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import enquiriesRouter from './routes/enquiries.js';
import authRouter from './routes/auth.js';
import dashboardRouter from './routes/dashboard.js';
import contentRouter from './routes/content.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/enquiries', enquiriesRouter);
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/content', contentRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 REON Energy API server running on http://localhost:${PORT}`);
  console.log(`📊 Dashboard API: http://localhost:${PORT}/api/dashboard/stats`);
  console.log(`📝 Enquiries API: http://localhost:${PORT}/api/enquiries`);
  console.log(`🔐 Auth API: http://localhost:${PORT}/api/auth/login\n`);
});
