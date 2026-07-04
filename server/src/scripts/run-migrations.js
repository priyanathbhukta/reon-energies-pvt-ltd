import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, '../../migrations');

async function runMigrations() {
  const client = await pool.connect();

  try {
    // Create migration tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Get already-run migrations
    const result = await client.query('SELECT filename FROM _migrations ORDER BY filename');
    const executed = new Set(result.rows.map((r) => r.filename));

    // Get all migration files
    const files = fs.readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    console.log(`\n📦 Found ${files.length} migration files`);

    let runCount = 0;
    for (const file of files) {
      if (executed.has(file)) {
        console.log(`  ⏭️  ${file} — already executed`);
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      console.log(`  🔄 Running ${file}...`);

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`  ✅ ${file} — done`);
        runCount++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`  ❌ ${file} — failed:`, err.message);
        throw err;
      }
    }

    console.log(`\n🎉 Migrations complete! (${runCount} new, ${executed.size} already done)\n`);
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
