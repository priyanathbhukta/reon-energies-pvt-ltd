import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Use local PostgreSQL (same as legacy db.js) for unified data layer.
// Falls back to DATABASE_URL for production (Neon/Render).
const isProduction = process.env.NODE_ENV === 'production';

const pool = new pg.Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: 100,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'reon_customer_info_db',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '123456789',
        max: 100,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      }
);

// Log pool errors
pool.on('error', (err) => {
  console.error('💥 Unexpected PG pool error:', err.message);
});

export default pool;
