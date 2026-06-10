import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { pool, query, queryOne } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seed() {
  console.log('Running seeds...');

  try {
    // Check if already seeded
    const existingUsers = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM usuarios'
    );

    if (existingUsers && parseInt(existingUsers.count, 10) > 0) {
      console.log('Database already seeded, skipping...');
      process.exit(0);
    }

    // Read seed file
    const seedPath = path.join(__dirname, '../../../database/seeds/initial.sql');
    let seedSql = fs.readFileSync(seedPath, 'utf-8');

    // Generate proper bcrypt hash for admin password
    const adminPassword = 'Admin123!';
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    // Replace placeholder hash with real hash
    seedSql = seedSql.replace(
      '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4v.mQJqhN8/X4v.m',
      passwordHash
    );

    // Execute seed
    await pool.query(seedSql);
    console.log('Seed data applied successfully');
    console.log(`Admin user created: admin@hofra.com / ${adminPassword}`);

    console.log('Seeds completed');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();
