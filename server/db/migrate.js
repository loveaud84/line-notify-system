// Applies server/db/schema.sql. Safe to run repeatedly.
//
// Run with `npm run db:migrate`.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);

  const { rows } = await pool.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' ORDER BY table_name`,
  );

  console.log('[db] สร้างตารางเรียบร้อยแล้ว:');
  for (const row of rows) console.log(`     - ${row.table_name}`);
}

main()
  .catch((error) => {
    console.error('[db] migrate ล้มเหลว:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
