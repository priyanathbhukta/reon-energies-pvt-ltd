import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

import enquiriesRouter from './routes/enquiries.js';
import authRouter from './routes/auth.js';
import dashboardRouter from './routes/dashboard.js';
import contentRouter from './routes/content.js';
import adminQuotationsRouter from './routes/admin_quotations.js';
import adminInvoicesRouter from './routes/admin_invoices.js';
import pdfsRouter from './routes/pdfs.js';
import projectsRouter from './routes/projects.js';
import posRouter from './src/controllers/posController.js';
import posDocumentsRouter from './src/routes/pos_documents.js';
import posAuthRouter from './src/controllers/authController.js';
import leadRouter from './src/controllers/leadController.js';
import authMiddleware from './middleware/auth.js';
import { authenticate } from './src/middlewares/auth.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

// ── Auto-install Python PDF dependencies on Linux/Render ──────────────────────
// This runs synchronously at startup so the packages are ready before any
// request is handled. On Windows (local dev) we skip this since you install
// manually. Safe to run repeatedly — pip is idempotent.
function ensurePythonDeps() {
  if (process.platform === 'win32') {
    console.log('⏭️  Skipping pip install on Windows (local dev).');
    return;
  }
  try {
    console.log('🐍 Checking / installing Python PDF dependencies...');
    execSync(
      'pip3 install --no-cache-dir --break-system-packages ' +
      '"reportlab>=4.2.0,<5.0" ' +
      '"pypdf>=4.0.0,<5.0" ' +
      '"Pillow>=10.0.0,<12.0"',
      { stdio: 'inherit', timeout: 120000 }
    );
    console.log('✅ Python PDF dependencies are ready.');
  } catch (err) {
    console.error('❌ Failed to install Python dependencies:', err.message);
    console.error('   PDF generation will not work until reportlab/pypdf/Pillow are installed.');
    // Don't crash the server — other endpoints still work
  }
}

ensurePythonDeps();

// Middleware
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  "http://localhost:3001",
  "http://localhost:3002",
  "https://reonenergy.in",
  "https://www.reonenergy.in",
  "https://admin.reonenergy.in",
  "https://pos.reonenergy.in",
  "https://api.reonenergy.in",
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/enquiries', enquiriesRouter);
app.use('/api/auth', authRouter);         // Legacy admin auth (username/password)
app.use('/api/auth', posAuthRouter);       // POS partner auth (pos-login, pos-change-password)
app.use('/api/dashboard', dashboardRouter);
app.use('/api/content', contentRouter);
app.use('/api/admin/quotations', authMiddleware, adminQuotationsRouter);
app.use('/api/quotations', authenticate, adminQuotationsRouter);
app.use('/api/admin/invoices', authMiddleware, adminInvoicesRouter);
app.use('/api/projects', authMiddleware, projectsRouter);
app.use('/api/pos', posRouter);
app.use('/api/pos/documents', posDocumentsRouter);
app.use('/api/leads', leadRouter);

// Serve generated PDFs with dynamic auto-regeneration if missing
app.use('/pdfs', pdfsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 REON Energy API server running on http://localhost:${PORT}`);
  console.log(`📊 Dashboard API: http://localhost:${PORT}/api/dashboard/stats`);
  console.log(`📝 Enquiries API: http://localhost:${PORT}/api/enquiries`);
  console.log(`🔐 Admin Login:   http://localhost:${PORT}/api/auth/login`);
  console.log(`🔑 POS Login:     http://localhost:${PORT}/api/auth/pos-login`);
  console.log(`👤 POS Register:  http://localhost:${PORT}/api/pos/register\n`);
});
