import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function runMigration() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set!');
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  const client = await pool.connect();

  try {
    console.log('Connecting to database...');
    const migrationPath = path.join(process.cwd(), 'prisma/migrations/20261019190000_add_customer_service_and_knowledge_base/migration.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Executing migration SQL...');
    await client.query(sql);
    console.log('Migration executed successfully!');

    // Check table creation
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('chat_conversations', 'chat_messages', 'chat_handovers', 'knowledge_documents', 'knowledge_chunks');
    `);
    console.log('Verified tables:', res.rows.map(r => r.table_name));

  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().then(() => {
  console.log('Done!');
  process.exit(0);
});
