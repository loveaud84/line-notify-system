import pg from 'pg';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..', '..');

/**
 * Reads KEY=value pairs from a .env file if one exists. Kept dependency-free.
 * Existing environment variables always win.
 */
export function loadDotEnv(path = join(rootDir, '.env')) {
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    return;
  }
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadDotEnv();

if (!process.env.DATABASE_URL) {
  console.error(
    '\n[db] ไม่พบ DATABASE_URL\n' +
      '     คัดลอก .env.example เป็น .env แล้วใส่ค่าเชื่อมต่อ PostgreSQL ของคุณ\n' +
      '     ตัวอย่าง: DATABASE_URL=postgresql://postgres:รหัสผ่าน@localhost:5432/line_notify\n',
  );
  process.exit(1);
}

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  // Managed providers (Render, Supabase, Neon) require TLS; local servers
  // usually have no certificate at all, so this is opt-in.
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

// A pool error would otherwise be an unhandled rejection that kills the process.
pool.on('error', (error) => {
  console.error('[db] เกิดข้อผิดพลาดกับ connection pool:', error.message);
});

/** Runs a parameterised query and returns the rows. */
export async function query(text, params) {
  const result = await pool.query(text, params);
  return result.rows;
}

/** Runs a query expected to produce exactly one row; returns null when empty. */
export async function queryOne(text, params) {
  const rows = await query(text, params);
  return rows[0] ?? null;
}

/** Runs `fn` inside a transaction, rolling back if it throws. */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export { rootDir };
