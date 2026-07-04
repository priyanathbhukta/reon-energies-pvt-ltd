import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Get all projects
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM projects ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching projects:', err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get a single project by ID with its services
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const projectResult = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const project = projectResult.rows[0];

    const servicesResult = await pool.query('SELECT * FROM project_services WHERE project_id = $1 ORDER BY service_date DESC', [id]);
    project.services = servicesResult.rows;

    res.json(project);
  } catch (err) {
    console.error('Error fetching project:', err);
    res.status(500).json({ error: 'Failed to fetch project details' });
  }
});

// Create a new project
router.post('/', async (req, res) => {
  const {
    customer_name, address, contact, email, installation_date, capacity_kw,
    system_type, scheme_type, panel_brand, panel_wattage, panel_quantity,
    inverter_brand, inverter_capacity, battery_brand, battery_capacity,
    structure_type, installation_team, total_cost, subsidy_amount, net_cost,
    warranty_end_date
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO projects (
        customer_name, address, contact, email, installation_date, capacity_kw,
        system_type, scheme_type, panel_brand, panel_wattage, panel_quantity,
        inverter_brand, inverter_capacity, battery_brand, battery_capacity,
        structure_type, installation_team, total_cost, subsidy_amount, net_cost,
        warranty_end_date
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      ) RETURNING *`,
      [
        customer_name, address, contact, email, installation_date, capacity_kw,
        system_type, scheme_type, panel_brand, panel_wattage, panel_quantity,
        inverter_brand, inverter_capacity, battery_brand, battery_capacity,
        structure_type, installation_team, total_cost, subsidy_amount, net_cost,
        warranty_end_date
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating project:', err);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update a project
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const {
    customer_name, address, contact, email, installation_date, capacity_kw,
    system_type, scheme_type, panel_brand, panel_wattage, panel_quantity,
    inverter_brand, inverter_capacity, battery_brand, battery_capacity,
    structure_type, installation_team, total_cost, subsidy_amount, net_cost,
    warranty_end_date
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE projects SET 
        customer_name = $1, address = $2, contact = $3, email = $4, installation_date = $5,
        capacity_kw = $6, system_type = $7, scheme_type = $8, panel_brand = $9,
        panel_wattage = $10, panel_quantity = $11, inverter_brand = $12, inverter_capacity = $13,
        battery_brand = $14, battery_capacity = $15, structure_type = $16, installation_team = $17,
        total_cost = $18, subsidy_amount = $19, net_cost = $20, warranty_end_date = $21,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $22 RETURNING *`,
      [
        customer_name, address, contact, email, installation_date, capacity_kw,
        system_type, scheme_type, panel_brand, panel_wattage, panel_quantity,
        inverter_brand, inverter_capacity, battery_brand, battery_capacity,
        structure_type, installation_team, total_cost, subsidy_amount, net_cost,
        warranty_end_date, id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating project:', err);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete a project
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM projects WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json({ message: 'Project deleted successfully' });
  } catch (err) {
    console.error('Error deleting project:', err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Create a service record for a project
router.post('/:projectId/services', async (req, res) => {
  const { projectId } = req.params;
  const {
    service_date, issue_description, action_taken, technician_name, next_service_date, status
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO project_services (
        project_id, service_date, issue_description, action_taken, technician_name, next_service_date, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [projectId, service_date, issue_description, action_taken, technician_name, next_service_date || null, status || 'Open']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating service record:', err);
    res.status(500).json({ error: 'Failed to create service record' });
  }
});

// Update a service record
router.put('/services/:serviceId', async (req, res) => {
  const { serviceId } = req.params;
  const {
    service_date, issue_description, action_taken, technician_name, next_service_date, status
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE project_services SET 
        service_date = $1, issue_description = $2, action_taken = $3, 
        technician_name = $4, next_service_date = $5, status = $6
       WHERE id = $7 RETURNING *`,
      [service_date, issue_description, action_taken, technician_name, next_service_date || null, status, serviceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Service record not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating service record:', err);
    res.status(500).json({ error: 'Failed to update service record' });
  }
});

// Delete a service record
router.delete('/services/:serviceId', async (req, res) => {
    const { serviceId } = req.params;
    try {
      const result = await pool.query('DELETE FROM project_services WHERE id = $1 RETURNING *', [serviceId]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Service record not found' });
      }
      res.json({ message: 'Service record deleted successfully' });
    } catch (err) {
      console.error('Error deleting service record:', err);
      res.status(500).json({ error: 'Failed to delete service record' });
    }
});

export default router;
