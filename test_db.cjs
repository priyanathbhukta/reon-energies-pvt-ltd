const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  password: '123456789',
  host: 'localhost',
  port: 5432,
  database: 'reon_customer_info_db'
});

async function main() {
  const res = await pool.query("SELECT offer_no, pdf_url FROM quotations ORDER BY created_at DESC LIMIT 5");
  console.log(res.rows);
  pool.end();
}
main();
