import pool from './db.js';

async function run() {
  try {
    await pool.query("DELETE FROM schemes WHERE name ILIKE '%Alosree%'");
    console.log("Deleted Alosree scheme from DB successfully.");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
