// backend/app.js
// Mount this into your existing Express app:
//   const quotationRouter = require('./reon-quotation/backend/app');
//   app.use('/api', quotationRouter);
//
// Or run standalone:
//   node backend/app.js
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express    = require('express');
const cors       = require('cors');
const path       = require('path');

const quotationsRouter = require('./routes/quotations');

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://reonenergy.in',
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/quotations', quotationsRouter);

// Health check
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', service: 'reon-quotation-api', ts: new Date() })
);

// ── Standalone server (only when run directly) ────────────────────────────────
if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () =>
    console.log(`[REON Quotation API] Listening on http://localhost:${PORT}`)
  );
}

module.exports = app;
