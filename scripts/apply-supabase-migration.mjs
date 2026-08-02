import { readFile } from 'node:fs/promises';
import postgres from 'postgres';

const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error('Missing POSTGRES_URL_NON_POOLING or POSTGRES_URL');
}

const migrationUrl = new URL('../supabase/migrations/202608020001_user_library.sql', import.meta.url);
const migration = await readFile(migrationUrl, 'utf8');
const sql = postgres(connectionString, { max: 1, ssl: 'require' });

try {
  await sql.unsafe(migration);
  console.log('Supabase library migration applied.');
} finally {
  await sql.end();
}
