// Creates (or resets) one administrator account.
//
// This is the production alternative to `npm run db:seed`, which creates the
// demo account admin/admin — fine locally, unacceptable on a public host.
//
// Usage:
//   npm run db:create-admin -- --username somchai --name "นายสมชาย ใจดี"
//
// The password is read from the ADMIN_PASSWORD environment variable, never from
// an argument, so it does not end up in shell history or in the process list
// where other users on the machine could read it.

import bcrypt from 'bcryptjs';
import { pool, queryOne } from './pool.js';

/** Minimal flag parser: --key value pairs. */
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    args[argv[i].slice(2)] = argv[i + 1]?.startsWith('--') ? '' : (argv[i + 1] ?? '');
  }
  return args;
}

function fail(message) {
  console.error(`\n[admin] ${message}\n`);
  process.exitCode = 1;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const username = (args.username ?? '').trim();
  const fullName = (args.name ?? '').trim();
  const email = (args.email ?? '').trim();
  const password = process.env.ADMIN_PASSWORD ?? '';

  if (!username || !fullName) {
    return fail(
      'ต้องระบุ --username และ --name\n' +
        '     ตัวอย่าง: ADMIN_PASSWORD=... npm run db:create-admin -- --username somchai --name "นายสมชาย ใจดี"',
    );
  }

  if (password.length < 12) {
    return fail(
      'ตั้งรหัสผ่านผ่านตัวแปรสภาพแวดล้อม ADMIN_PASSWORD และต้องยาวอย่างน้อย 12 ตัวอักษร\n' +
        '     ไม่รับรหัสผ่านทาง argument เพราะจะติดอยู่ใน history ของ shell',
    );
  }

  const hash = await bcrypt.hash(password, 10);
  const existing = await queryOne('SELECT id FROM users WHERE username = $1', [username]);

  if (existing) {
    // Doubles as a password reset, which is the other thing an operator locked
    // out of production actually needs.
    await pool.query(
      `UPDATE users SET password_hash = $2, full_name = $3, email = $4,
                        is_admin = TRUE, is_active = TRUE
       WHERE username = $1`,
      [username, hash, fullName, email],
    );
    console.log(`[admin] อัปเดตบัญชี "${username}" เรียบร้อย (ตั้งรหัสผ่านใหม่ + ให้สิทธิ์แอดมิน)`);
  } else {
    await pool.query(
      `INSERT INTO users (full_name, username, password_hash, email, is_admin, is_active)
       VALUES ($1, $2, $3, $4, TRUE, TRUE)`,
      [fullName, username, hash, email],
    );
    console.log(`[admin] สร้างบัญชีแอดมิน "${username}" เรียบร้อย`);
  }

  // Flag the demo account if it is still usable — the single most likely way
  // this deployment gets compromised.
  const demo = await queryOne(
    "SELECT id FROM users WHERE username = 'admin' AND password_hash IS NOT NULL",
  );
  if (demo && username !== 'admin') {
    console.warn(
      '\n[admin] ⚠ บัญชี "admin" ยังเข้าใช้งานได้อยู่\n' +
        '        บนเซิร์ฟเวอร์จริงควรลบหรือตั้งรหัสผ่านใหม่ เพราะข้อมูลตัวอย่างใช้ admin/admin',
    );
  }
}

main()
  .catch((error) => {
    console.error('[admin] ล้มเหลว:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
