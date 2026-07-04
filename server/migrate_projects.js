import pool from './db.js';

async function migrateProjects() {
  console.log('Starting projects migration...');
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Projects table
    console.log('Creating projects table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_name VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        contact VARCHAR(50) NOT NULL,
        email VARCHAR(255),
        installation_date DATE NOT NULL,
        capacity_kw NUMERIC(10, 2) NOT NULL,
        system_type VARCHAR(100) NOT NULL, -- On-Grid, Hybrid, Off-Grid
        scheme_type VARCHAR(100) NOT NULL, -- Subsidy, Non-Subsidy
        panel_brand VARCHAR(255),
        panel_wattage INTEGER,
        panel_quantity INTEGER,
        inverter_brand VARCHAR(255),
        inverter_capacity NUMERIC(10, 2),
        battery_brand VARCHAR(255),
        battery_capacity NUMERIC(10, 2),
        structure_type VARCHAR(255),
        installation_team VARCHAR(255),
        total_cost NUMERIC(15, 2),
        subsidy_amount NUMERIC(15, 2),
        net_cost NUMERIC(15, 2),
        warranty_end_date DATE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Project Services table
    console.log('Creating project_services table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_services (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        service_date DATE NOT NULL,
        issue_description TEXT NOT NULL,
        action_taken TEXT NOT NULL,
        technician_name VARCHAR(255) NOT NULL,
        next_service_date DATE,
        status VARCHAR(50) NOT NULL DEFAULT 'Open', -- Open, Closed
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query('COMMIT');
    console.log('Migration completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

migrateProjects();
