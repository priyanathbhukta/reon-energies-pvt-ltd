import pool from './db.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

async function migrate() {
  const client = await pool.connect();

  try {
    console.log('🔄 Running migrations...');

    // Create enquiries table
    await client.query(`
      CREATE TABLE IF NOT EXISTS enquiries (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        email VARCHAR(255),
        address TEXT NOT NULL,
        floors INTEGER DEFAULT 1,
        monthly_bill NUMERIC(10, 2),
        payment_method VARCHAR(20) DEFAULT 'Cash',
        installation_type VARCHAR(20) DEFAULT 'Residential',
        utilities TEXT[] DEFAULT '{}',
        electricity_provider VARCHAR(20) DEFAULT 'WBSEDCL',
        message TEXT,
        status VARCHAR(20) DEFAULT 'new',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ enquiries table ready');

    // Create admins table
    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ admins table ready');

    // Create schemes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS schemes (
        id SERIAL PRIMARY KEY,
        icon VARCHAR(10) DEFAULT '☀️',
        badge VARCHAR(50),
        name VARCHAR(255) NOT NULL,
        tagline TEXT,
        eligibility TEXT[] DEFAULT '{}',
        subsidy_breakdown JSONB DEFAULT '[]',
        reon_help TEXT[] DEFAULT '{}',
        total_subsidy VARCHAR(100),
        accent VARCHAR(100) DEFAULT 'from-emerald-700 to-emerald-600',
        featured BOOLEAN DEFAULT false,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ schemes table ready');

    // Create testimonials table
    await client.query(`
      CREATE TABLE IF NOT EXISTS testimonials (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(255),
        rating INTEGER DEFAULT 5,
        review TEXT NOT NULL,
        avatar_initials VARCHAR(5),
        avatar_color VARCHAR(30) DEFAULT 'bg-emerald',
        date_label VARCHAR(50),
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ testimonials table ready');

    // Create gallery_images table
    await client.query(`
      CREATE TABLE IF NOT EXISTS gallery_images (
        id SERIAL PRIMARY KEY,
        image_url TEXT NOT NULL,
        alt_text TEXT,
        label VARCHAR(255),
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ gallery_images table ready');

    // Seed default admin
    const existingAdmin = await client.query('SELECT id FROM admins WHERE username = $1', ['admin']);
    if (existingAdmin.rows.length === 0) {
      const hash = await bcrypt.hash('admin123', 10);
      await client.query('INSERT INTO admins (username, password_hash) VALUES ($1, $2)', ['admin', hash]);
      console.log('✅ Default admin created');
    }

    // Seed schemes if empty
    const schemeCount = await client.query('SELECT COUNT(*) as count FROM schemes');
    if (parseInt(schemeCount.rows[0].count) === 0) {
      const schemesData = [
        {
          icon: '🏛️', badge: 'Central Govt.', name: 'PM Surya Ghar Muft Bijli Yojana',
          tagline: 'Free Electricity for 1 Crore Households',
          eligibility: ['Residential households', 'Must own the premises', 'Valid electricity connection'],
          subsidy_breakdown: [{ label: 'Up to 2 kW', value: '₹30,000/kW' }, { label: '2–3 kW', value: '₹18,000/kW' }, { label: 'Above 3 kW', value: '₹9,000/kW' }],
          reon_help: ['Free site survey & eligibility check', 'Full application support', 'DISCOM coordination'],
          total_subsidy: 'Up to ₹78,000', accent: 'from-navy to-navy/80', featured: true, sort_order: 1
        },
        {
          icon: '🌞', badge: 'State Scheme', name: 'Alosree Solar Scheme',
          tagline: "Kerala Govt's Rooftop Solar Initiative",
          eligibility: ['Kerala residents', 'BPL and APL categories', 'Agricultural consumers'],
          subsidy_breakdown: [{ label: 'BPL Category', value: '40% subsidy' }, { label: 'APL Residential', value: '20% subsidy' }, { label: 'Agricultural', value: '30% subsidy' }],
          reon_help: ['Alosree portal registration', 'Document submission', 'KSEB net metering support'],
          total_subsidy: 'Up to 40% off', accent: 'from-emerald-700 to-emerald-600', featured: false, sort_order: 2
        },
        {
          icon: '⚡', badge: 'Central Govt.', name: 'MNRE Solar Subsidy',
          tagline: 'Ministry of New & Renewable Energy Support',
          eligibility: ['Residential & institutional', 'Educational institutions', 'Hospitals & healthcare'],
          subsidy_breakdown: [{ label: 'General Category', value: '30% CFA' }, { label: 'NE States / Islands', value: '70% CFA' }, { label: 'SPV Water Pumps', value: '30% CFA' }],
          reon_help: ['MNRE vendor guidance', 'System design support', 'Audit & compliance docs'],
          total_subsidy: '30% – 70% CFA', accent: 'from-solar-700 to-solar-600', featured: false, sort_order: 3
        },
        {
          icon: '🌾', badge: 'Agricultural', name: 'PM-KUSUM Scheme',
          tagline: 'Solar for Farmers & Irrigation',
          eligibility: ['Farmers with agricultural land', 'Farmer producer organizations', 'Cooperatives & panchayats'],
          subsidy_breakdown: [{ label: 'Solar Pump', value: '60% subsidy' }, { label: 'Component A', value: '60% on lease' }, { label: 'Grid-connected', value: '30% subsidy' }],
          reon_help: ['Portal registration support', 'DPR preparation', 'End-to-end installation'],
          total_subsidy: 'Up to 60% off', accent: 'from-teal-700 to-teal-600', featured: false, sort_order: 4
        },
      ];
      for (const s of schemesData) {
        await client.query(
          `INSERT INTO schemes (icon, badge, name, tagline, eligibility, subsidy_breakdown, reon_help, total_subsidy, accent, featured, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [s.icon, s.badge, s.name, s.tagline, s.eligibility, JSON.stringify(s.subsidy_breakdown), s.reon_help, s.total_subsidy, s.accent, s.featured, s.sort_order]
        );
      }
      console.log('✅ Seeded 4 schemes');
    }

    // Seed testimonials if empty
    const testCount = await client.query('SELECT COUNT(*) as count FROM testimonials');
    if (parseInt(testCount.rows[0].count) === 0) {
      const testimonialsData = [
        { name: 'Suresh Menon', role: 'Homeowner, Kochi', rating: 5, review: 'REON installed a 5 kW system at our home. The process was seamless — from design to net meter approval. Our electricity bill dropped from ₹4,500 to under ₹200 monthly!', avatar_initials: 'SM', avatar_color: 'bg-emerald', date_label: 'November 2024', sort_order: 1 },
        { name: 'Anjali Krishnan', role: 'Restaurant Owner, Thrissur', rating: 5, review: "As a restaurant owner, electricity costs were killing our margins. REON's 15 kW commercial system paid for itself in under 3 years. Excellent team and after-sales support.", avatar_initials: 'AK', avatar_color: 'bg-solar', date_label: 'January 2025', sort_order: 2 },
        { name: 'Ravi Shankar', role: 'Farmer, Palakkad', rating: 5, review: 'The REON solar pump has transformed my farm. No more power cuts affecting irrigation. REON also helped me get PM-KUSUM subsidy, saving ₹1.2 lakhs on the installation.', avatar_initials: 'RS', avatar_color: 'bg-navy', date_label: 'December 2024', sort_order: 3 },
        { name: 'Meena Thomas', role: 'School Principal, Kozhikode', rating: 5, review: 'Our school now runs on 90% solar power. REON handled the entire project — from MNRE documentation to commissioning — within the stipulated timeline. Truly professional.', avatar_initials: 'MT', avatar_color: 'bg-emerald', date_label: 'February 2025', sort_order: 4 },
        { name: 'Dinesh Patel', role: 'Factory Owner, Coimbatore', rating: 5, review: "Installed 200 kW industrial solar system. REON's energy audit revealed we could save 40% on power costs. The detailed feasibility report gave us confidence to invest.", avatar_initials: 'DP', avatar_color: 'bg-solar', date_label: 'October 2024', sort_order: 5 },
        { name: 'Lakshmi Devi', role: 'Apartment Secretary, Calicut', rating: 5, review: 'Managing 40 flats, common area electricity was a huge expense. REON designed a perfect shared solar system with clear billing. Professional, transparent, and reliable.', avatar_initials: 'LD', avatar_color: 'bg-navy', date_label: 'March 2025', sort_order: 6 },
      ];
      for (const t of testimonialsData) {
        await client.query(
          'INSERT INTO testimonials (name, role, rating, review, avatar_initials, avatar_color, date_label, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          [t.name, t.role, t.rating, t.review, t.avatar_initials, t.avatar_color, t.date_label, t.sort_order]
        );
      }
      console.log('✅ Seeded 6 testimonials');
    }

    // Seed gallery if empty
    const galleryCount = await client.query('SELECT COUNT(*) as count FROM gallery_images');
    if (parseInt(galleryCount.rows[0].count) === 0) {
      const galleryData = [
        { image_url: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=600&q=80', alt_text: 'Rooftop solar installation — residential home', label: 'Residential Installation', sort_order: 1 },
        { image_url: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=600&q=80', alt_text: 'Solar panel array on commercial building', label: 'Commercial Rooftop', sort_order: 2 },
        { image_url: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=600&q=80', alt_text: 'Solar water pump installation at farm', label: 'Solar Water Pump', sort_order: 3 },
        { image_url: 'https://images.unsplash.com/photo-1497440001374-f26997328c1b?w=600&q=80', alt_text: 'Large-scale industrial solar plant', label: 'Industrial Solar Plant', sort_order: 4 },
        { image_url: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=600&q=80', alt_text: 'Solar battery storage system installation', label: 'Battery Storage System', sort_order: 5 },
        { image_url: 'https://images.unsplash.com/photo-1605980776566-e6ec37f4b5e4?w=600&q=80', alt_text: 'Ground mounted solar panel installation', label: 'Ground-Mount Array', sort_order: 6 },
      ];
      for (const g of galleryData) {
        await client.query(
          'INSERT INTO gallery_images (image_url, alt_text, label, sort_order) VALUES ($1, $2, $3, $4)',
          [g.image_url, g.alt_text, g.label, g.sort_order]
        );
      }
      console.log('✅ Seeded 6 gallery images');
    }

    console.log('\n🎉 Migration complete!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
