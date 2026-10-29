// Loads the Thai demo data into an empty database.
//
// Run with `npm run db:seed`, or `npm run db:reset` to wipe and reload.
// Without the reset flag an already-populated database is left untouched, so
// this is safe to run after a migration without destroying real records.

import bcrypt from 'bcryptjs';
import { pool, withTransaction } from './pool.js';

// Named --reset rather than --force: npm treats `--force` as one of its own
// flags and never forwards it to the script, so the wipe silently did nothing.
const FORCE = process.argv.includes('--reset');

/** Default sign-in for the demo: admin / admin. */
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'admin';

const USERS = [
  { fullName: 'นายสมชาย ใจดี', isAdmin: true, isActive: true, username: 'admin' },
  { fullName: 'นางวิภาวี ศรีสุข', isAdmin: false, isActive: true },
  { fullName: 'นายปิยะพงษ์ มั่นคง', isAdmin: false, isActive: true },
  { fullName: 'นางสาวกมลชนก แสงทอง', isAdmin: false, isActive: false },
  { fullName: 'นายธนพล เจริญสุข', isAdmin: false, isActive: true },
  { fullName: 'นางสาวศิริพร วงศ์ษา', isAdmin: true, isActive: true },
  { fullName: 'นายชัยวัฒน์ ทองดี', isAdmin: false, isActive: true },
  { fullName: 'นางสาวนภัสสร ใจงาม', isAdmin: false, isActive: false },
  { fullName: 'นายเอกชัย มีสุข', isAdmin: false, isActive: true },
  { fullName: 'นางปวีณา รุ่งเรือง', isAdmin: true, isActive: true },
  { fullName: 'นายอนันต์ พงษ์ไพร', isAdmin: false, isActive: true },
  { fullName: 'นางสาวสุดารัตน์ แก้วใส', isAdmin: false, isActive: false },
];

const MAJORS = [
  { name: 'วิศวกรรมคอมพิวเตอร์', faculty: 'คณะวิศวกรรมศาสตร์' },
  { name: 'วิศวกรรมไฟฟ้า', faculty: 'คณะวิศวกรรมศาสตร์' },
  { name: 'บริหารธุรกิจ', faculty: 'คณะบริหารธุรกิจ' },
  { name: 'บัญชี', faculty: 'คณะบัญชี' },
  { name: 'นิเทศศาสตร์', faculty: 'คณะนิเทศศาสตร์' },
  { name: 'ศิลปศาสตร์', faculty: 'คณะศิลปศาสตร์' },
];

const STUDENTS = [
  { studentId: '6801001', prefix: 'นาย', firstLast: 'อนันต์ พงษ์ไพร', gender: 'ชาย', major: 'วิศวกรรมคอมพิวเตอร์', phone: '081-234-5671', email: 'anan.p@student.university.ac.th', lineId: '@anan_p', lineUid: 'U1a2b3c4d5e6f7g8h' },
  { studentId: '6801002', prefix: 'นางสาว', firstLast: 'กมลชนก แสงทอง', gender: 'หญิง', major: 'บริหารธุรกิจ', phone: '089-112-3344', email: 'kamonchanok.s@student.university.ac.th', lineId: '@kamon_s', lineUid: 'U2b3c4d5e6f7g8h9i' },
  { studentId: '6801003', prefix: 'นาย', firstLast: 'ธนพล เจริญสุข', gender: 'ชาย', major: 'วิศวกรรมไฟฟ้า', phone: '091-556-7788', email: 'thanapon.c@student.university.ac.th', lineId: '@thanapon_c', lineUid: 'U3c4d5e6f7g8h9i0j' },
  { studentId: '6801004', prefix: 'นางสาว', firstLast: 'ศิริพร วงศ์ษา', gender: 'หญิง', major: 'ศิลปศาสตร์', phone: '086-334-2211', email: 'siriporn.w@student.university.ac.th', lineId: '@siriporn_w', lineUid: 'U4d5e6f7g8h9i0j1k' },
  { studentId: '6801005', prefix: 'นางสาว', firstLast: 'ปวีณา รุ่งเรือง', gender: 'หญิง', major: 'บริหารธุรกิจ', phone: '090-445-9988', email: 'paweena.r@student.university.ac.th', lineId: '@paweena_r', lineUid: 'U5e6f7g8h9i0j1k2l' },
  { studentId: '6801006', prefix: 'นาย', firstLast: 'ชัยวัฒน์ ทองดี', gender: 'ชาย', major: 'วิศวกรรมคอมพิวเตอร์', phone: '083-221-6655', email: 'chaiwat.t@student.university.ac.th', lineId: '@chaiwat_t', lineUid: 'U6f7g8h9i0j1k2l3m' },
  { studentId: '6801007', prefix: 'นางสาว', firstLast: 'นภัสสร ใจงาม', gender: 'หญิง', major: 'นิเทศศาสตร์', phone: '092-778-4433', email: 'napassorn.j@student.university.ac.th', lineId: '@napassorn_j', lineUid: 'U7g8h9i0j1k2l3m4n' },
  { studentId: '6801008', prefix: 'นาย', firstLast: 'เอกชัย มีสุข', gender: 'ชาย', major: 'บัญชี', phone: '085-667-1122', email: 'ekkachai.m@student.university.ac.th', lineId: '@ekkachai_m', lineUid: 'U8h9i0j1k2l3m4n5o' },
];

const GROUPS = [
  { studentId: '6801001', group: 'นักศึกษาชั้นปีที่ 1' },
  { studentId: '6801002', group: 'นักศึกษาชั้นปีที่ 1' },
  { studentId: '6801003', group: 'นักศึกษาชั้นปีที่ 2' },
  { studentId: '6801004', group: 'นักศึกษาชั้นปีที่ 2' },
  { studentId: '6801005', group: 'คณะบริหารธุรกิจ' },
  { studentId: '6801006', group: 'คณะวิศวกรรมศาสตร์' },
];

/**
 * Send history, positioned relative to today.
 *
 * The design hardcoded July dates with no year. Anchoring to the current date
 * keeps the dashboard, calendar and "unsent this week" panel meaningful
 * whenever the project is set up.
 */
const HISTORY = [
  { daysAgo: 0, hour: 10, minute: 24, template: 'แจ้งกำหนดการสอบปลายภาค', msgType: 'ข้อความ', group: 'นักศึกษาชั้นปีที่ 1', count: 812, success: true, body: 'เรียน นักศึกษาชั้นปีที่ 1 ทุกท่าน\n\nขอแจ้งกำหนดการสอบปลายภาค ประจำภาคเรียนที่ 2/2568 ระหว่างวันที่ 20-30 กรกฎาคม 2569 กรุณาตรวจสอบตารางสอบและห้องสอบของท่านผ่านระบบทะเบียนออนไลน์\n\nงานทะเบียนและประมวลผล' },
  { daysAgo: 0, hour: 9, minute: 10, template: 'แจ้งปิดปรับปรุงระบบทะเบียน', msgType: 'ข้อความ', group: 'นักศึกษาทั้งหมด', count: 4820, success: true, body: 'ระบบทะเบียนออนไลน์จะปิดปรับปรุงชั่วคราวในวันที่ 15 กรกฎาคม 2569 เวลา 22:00-02:00 น. เพื่อพัฒนาประสิทธิภาพการให้บริการ ขออภัยในความไม่สะดวก' },
  { daysAgo: 1, hour: 15, minute: 40, template: 'แจ้งชำระค่าธรรมเนียมการศึกษา', msgType: 'ข้อความ + รูปภาพ', group: 'คณะวิศวกรรมศาสตร์', count: 640, success: true, body: 'ขอแจ้งกำหนดการชำระค่าธรรมเนียมการศึกษา ภาคเรียนที่ 2/2568 ภายในวันที่ 31 กรกฎาคม 2569 ผ่านช่องทางที่มหาวิทยาลัยกำหนด' },
  { daysAgo: 1, hour: 13, minute: 2, template: 'แจ้งเตือนกิจกรรมปฐมนิเทศ', msgType: 'ข้อความ + รูปภาพ', group: 'นักศึกษาใหม่', count: 1120, success: false, body: 'ขอเชิญนักศึกษาใหม่เข้าร่วมกิจกรรมปฐมนิเทศนักศึกษา ประจำปีการศึกษา 2568 ณ หอประชุมใหญ่ เวลา 08:30 น.' },
  { daysAgo: 2, hour: 16, minute: 20, template: 'แจ้งผลการลงทะเบียนเรียน', msgType: 'ข้อความ', group: 'นักศึกษาชั้นปีที่ 2', count: 705, success: true, body: 'ระบบได้ทำการประมวลผลการลงทะเบียนเรียนของท่านเรียบร้อยแล้ว สามารถตรวจสอบผลได้ที่ระบบทะเบียนออนไลน์' },
  { daysAgo: 3, hour: 9, minute: 55, template: 'แจ้งเปิด-ปิดภาคการศึกษา', msgType: 'ข้อความ', group: 'นักศึกษาทั้งหมด', count: 4820, success: true, body: 'ขอแจ้งกำหนดการเปิด-ปิดภาคการศึกษา ประจำปีการศึกษา 2568 ดังนี้ เปิดภาคเรียน 1 สิงหาคม 2569 ปิดภาคเรียน 30 พฤศจิกายน 2569' },
  { daysAgo: 4, hour: 14, minute: 12, template: 'แจ้งกำหนดการสอบปลายภาค', msgType: 'ข้อความ', group: 'คณะบริหารธุรกิจ', count: 512, success: true, body: 'เรียน นักศึกษาคณะบริหารธุรกิจ ขอแจ้งกำหนดการสอบปลายภาค ประจำภาคเรียนที่ 2/2568' },
  { daysAgo: 5, hour: 11, minute: 30, template: 'แจ้งชำระค่าธรรมเนียมการศึกษา', msgType: 'ข้อความ + รูปภาพ', group: 'นักศึกษาชั้นปีที่ 1', count: 1120, success: false, body: 'ขอแจ้งกำหนดการชำระค่าธรรมเนียมการศึกษา ภาคเรียนที่ 2/2568 สำหรับนักศึกษาชั้นปีที่ 1' },
];

function timestampFor({ daysAgo, hour, minute }) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, minute, 0, 0);
  return date;
}

async function main() {
  const { rows } = await pool.query('SELECT count(*)::int AS count FROM students');
  const alreadyPopulated = rows[0].count > 0;

  if (alreadyPopulated && !FORCE) {
    console.log(
      '[db] มีข้อมูลอยู่แล้ว ข้ามการ seed\n' +
        '     ถ้าต้องการล้างและใส่ข้อมูลตัวอย่างใหม่ ใช้: npm run db:reset',
    );
    return;
  }

  await withTransaction(async (client) => {
    if (FORCE) {
      // RESTART IDENTITY so seeded ids start from 1 again; CASCADE clears the
      // dependent group rows in one statement.
      await client.query(
        'TRUNCATE students, student_groups, majors, users, history_log, app_settings RESTART IDENTITY CASCADE',
      );
    }

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    for (const user of USERS) {
      await client.query(
        `INSERT INTO users (full_name, username, password_hash, is_admin, is_active)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (username) DO NOTHING`,
        [
          user.fullName,
          user.username ?? null,
          user.username ? passwordHash : null,
          user.isAdmin,
          user.isActive,
        ],
      );
    }

    // Map major name -> id so students and groups can reference it.
    const majorIds = new Map();
    for (const major of MAJORS) {
      const { rows: inserted } = await client.query(
        `INSERT INTO majors (name, faculty) VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET faculty = EXCLUDED.faculty
         RETURNING id`,
        [major.name, major.faculty],
      );
      majorIds.set(major.name, inserted[0].id);
    }

    for (const student of STUDENTS) {
      await client.query(
        `INSERT INTO students
           (student_id, prefix, first_last, gender, major_id, phone, email, line_id, line_uid)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (student_id) DO NOTHING`,
        [
          student.studentId,
          student.prefix,
          student.firstLast,
          student.gender,
          majorIds.get(student.major) ?? null,
          student.phone,
          student.email,
          student.lineId,
          student.lineUid,
        ],
      );
    }

    for (const group of GROUPS) {
      const student = STUDENTS.find((s) => s.studentId === group.studentId);
      await client.query(
        `INSERT INTO student_groups (student_id, major_id, group_name)
         VALUES ($1, $2, $3)
         ON CONFLICT ON CONSTRAINT student_groups_unique_membership DO NOTHING`,
        [group.studentId, majorIds.get(student?.major) ?? null, group.group],
      );
    }

    for (const entry of HISTORY) {
      await client.query(
        `INSERT INTO history_log
           (sent_at, template, msg_type, group_name, recipient_count, success, body)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          timestampFor(entry),
          entry.template,
          entry.msgType,
          entry.group,
          entry.count,
          entry.success,
          entry.body,
        ],
      );
    }
  });

  const counts = await pool.query(`
    SELECT
      (SELECT count(*)::int FROM users)          AS users,
      (SELECT count(*)::int FROM majors)         AS majors,
      (SELECT count(*)::int FROM students)       AS students,
      (SELECT count(*)::int FROM student_groups) AS groups,
      (SELECT count(*)::int FROM history_log)    AS history
  `);
  const c = counts.rows[0];

  console.log('[db] ใส่ข้อมูลตัวอย่างเรียบร้อยแล้ว');
  console.log(
    `     ผู้ใช้งาน ${c.users} · สาขาวิชา ${c.majors} · นักศึกษา ${c.students} · ` +
      `กลุ่ม ${c.groups} · ประวัติ ${c.history}`,
  );
  console.log(`     เข้าสู่ระบบ: admin / ${ADMIN_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error('[db] seed ล้มเหลว:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
