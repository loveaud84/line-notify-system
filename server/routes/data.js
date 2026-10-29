// CRUD endpoints for every entity the UI manages.
//
// Rows are mapped to the camelCase shapes the frontend already used, so the
// React pages did not have to change when the data moved into PostgreSQL.

import express from 'express';
import bcrypt from 'bcryptjs';
import { query, queryOne } from '../db/pool.js';
import { requireAdmin } from '../middleware/auth.js';
import { asyncRoute, parseId, str } from './helpers.js';

export const dataRouter = express.Router();

/* --------------------------------------------------------------- mappers */

const toUser = (row) => ({
  id: row.id,
  fullName: row.full_name,
  username: row.username ?? '',
  email: row.email ?? '',
  isAdmin: row.is_admin,
  isActive: row.is_active,
});

const toMajor = (row) => ({
  id: row.id,
  name: row.name,
  faculty: row.faculty ?? '',
  // Derived by the query rather than stored, so it can never go stale.
  studentCount: row.student_count ?? 0,
});

const toStudent = (row) => ({
  id: row.id,
  studentId: row.student_id,
  prefix: row.prefix,
  firstLast: row.first_last,
  gender: row.gender,
  major: row.major ?? '',
  phone: row.phone ?? '',
  email: row.email ?? '',
  lineId: row.line_id ?? '',
  lineUid: row.line_uid ?? '',
  lineDisplayName: row.line_display_name ?? '',
  linePictureUrl: row.line_picture_url ?? '',
  // Non-null only once LINE confirmed the student added the Official Account.
  lineConnectedAt: row.line_connected_at ? row.line_connected_at.toISOString() : null,
});

const toGroup = (row) => ({
  id: row.id,
  studentId: row.student_id,
  major: row.major ?? '',
  group: row.group_name,
});

const toHistory = (row) => ({
  id: row.id,
  sentAt: row.sent_at.toISOString(),
  template: row.template,
  msgType: row.msg_type,
  group: row.group_name,
  count: row.recipient_count,
  success: row.success,
  text: row.body ?? '',
});

/** Resolves a major name to its id; null when the name is blank or unknown. */
async function majorIdByName(name) {
  if (!str(name)) return null;
  const row = await queryOne('SELECT id FROM majors WHERE name = $1', [str(name)]);
  return row?.id ?? null;
}

/* ----------------------------------------------------------------- users */

dataRouter.get(
  '/users',
  requireAdmin,
  asyncRoute(async (_req, res) => {
    const rows = await query('SELECT * FROM users ORDER BY id');
    res.json(rows.map(toUser));
  }),
);

dataRouter.post(
  '/users',
  requireAdmin,
  asyncRoute(async (req, res) => {
    const { fullName, username, password, email, isAdmin, isActive } = req.body ?? {};
    if (!str(fullName)) {
      return res.status(400).json({ message: 'กรุณาระบุชื่อ-นามสกุล' });
    }

    const passwordHash = str(password) ? await bcrypt.hash(str(password), 10) : null;
    const row = await queryOne(
      `INSERT INTO users (full_name, username, password_hash, email, is_admin, is_active)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        str(fullName),
        str(username) || null,
        passwordHash,
        str(email),
        Boolean(isAdmin),
        isActive !== false,
      ],
    );
    res.status(201).json(toUser(row));
  }),
);

dataRouter.patch(
  '/users/:id',
  requireAdmin,
  asyncRoute(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'รหัสผู้ใช้งานไม่ถูกต้อง' });

    const { fullName, email, isAdmin, isActive, password } = req.body ?? {};

    // COALESCE keeps any field the client did not send, so this is a true patch.
    const passwordHash = str(password) ? await bcrypt.hash(str(password), 10) : null;
    const row = await queryOne(
      `UPDATE users SET
         full_name     = COALESCE($2, full_name),
         email         = COALESCE($3, email),
         is_admin      = COALESCE($4, is_admin),
         is_active     = COALESCE($5, is_active),
         password_hash = COALESCE($6, password_hash)
       WHERE id = $1 RETURNING *`,
      [
        id,
        fullName === undefined ? null : str(fullName),
        email === undefined ? null : str(email),
        isAdmin === undefined ? null : Boolean(isAdmin),
        isActive === undefined ? null : Boolean(isActive),
        passwordHash,
      ],
    );
    if (!row) return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน' });
    res.json(toUser(row));
  }),
);

dataRouter.delete(
  '/users/:id',
  requireAdmin,
  asyncRoute(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'รหัสผู้ใช้งานไม่ถูกต้อง' });
    const row = await queryOne('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    if (!row) return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน' });
    res.status(204).end();
  }),
);

/* ---------------------------------------------------------------- majors */

dataRouter.get(
  '/majors',
  asyncRoute(async (_req, res) => {
    const rows = await query(`
      SELECT m.*, count(s.id)::int AS student_count
      FROM majors m
      LEFT JOIN students s ON s.major_id = m.id
      GROUP BY m.id
      ORDER BY m.id
    `);
    res.json(rows.map(toMajor));
  }),
);

dataRouter.post(
  '/majors',
  asyncRoute(async (req, res) => {
    const { name, faculty } = req.body ?? {};
    if (!str(name)) return res.status(400).json({ message: 'กรุณาระบุชื่อสาขาวิชา' });

    const row = await queryOne(
      'INSERT INTO majors (name, faculty) VALUES ($1, $2) RETURNING *',
      [str(name), str(faculty)],
    );
    res.status(201).json(toMajor({ ...row, student_count: 0 }));
  }),
);

dataRouter.patch(
  '/majors/:id',
  asyncRoute(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'รหัสสาขาวิชาไม่ถูกต้อง' });

    const { name, faculty } = req.body ?? {};
    const row = await queryOne(
      `UPDATE majors SET
         name    = COALESCE($2, name),
         faculty = COALESCE($3, faculty)
       WHERE id = $1 RETURNING *`,
      [id, name === undefined ? null : str(name), faculty === undefined ? null : str(faculty)],
    );
    if (!row) return res.status(404).json({ message: 'ไม่พบสาขาวิชา' });
    res.json(toMajor(row));
  }),
);

dataRouter.delete(
  '/majors/:id',
  requireAdmin,
  asyncRoute(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'รหัสสาขาวิชาไม่ถูกต้อง' });
    const row = await queryOne('DELETE FROM majors WHERE id = $1 RETURNING id', [id]);
    if (!row) return res.status(404).json({ message: 'ไม่พบสาขาวิชา' });
    res.status(204).end();
  }),
);

/* -------------------------------------------------------------- students */

const STUDENT_SELECT = `
  SELECT s.*, m.name AS major
  FROM students s
  LEFT JOIN majors m ON m.id = s.major_id
`;

dataRouter.get(
  '/students',
  asyncRoute(async (_req, res) => {
    const rows = await query(`${STUDENT_SELECT} ORDER BY s.id`);
    res.json(rows.map(toStudent));
  }),
);

dataRouter.post(
  '/students',
  asyncRoute(async (req, res) => {
    const body = req.body ?? {};
    if (!str(body.studentId) || !str(body.firstLast)) {
      return res.status(400).json({ message: 'กรุณาระบุรหัสนักศึกษาและชื่อ-นามสกุล' });
    }

    const row = await queryOne(
      `WITH inserted AS (
         INSERT INTO students
           (student_id, prefix, first_last, gender, major_id, phone, email, line_id, line_uid)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *
       )
       SELECT i.*, m.name AS major FROM inserted i LEFT JOIN majors m ON m.id = i.major_id`,
      [
        str(body.studentId),
        str(body.prefix) || 'นาย',
        str(body.firstLast),
        str(body.gender) || 'ชาย',
        await majorIdByName(body.major),
        str(body.phone),
        str(body.email),
        str(body.lineId),
        str(body.lineUid),
      ],
    );
    res.status(201).json(toStudent(row));
  }),
);

/** Bulk insert for CSV import — one round trip, one transaction. */
dataRouter.post(
  '/students/bulk',
  asyncRoute(async (req, res) => {
    const incoming = Array.isArray(req.body?.students) ? req.body.students : [];
    if (incoming.length === 0) {
      return res.status(400).json({ message: 'ไม่มีข้อมูลนักศึกษาที่จะนำเข้า' });
    }

    const inserted = [];
    const skipped = [];

    for (const student of incoming) {
      if (!str(student.studentId) || !str(student.firstLast)) {
        skipped.push({ studentId: str(student.studentId), reason: 'ข้อมูลไม่ครบ' });
        continue;
      }
      // ON CONFLICT DO NOTHING: an id already present is reported, not fatal,
      // so one duplicate row cannot abort the whole import.
      const row = await queryOne(
        `WITH inserted AS (
           INSERT INTO students
             (student_id, prefix, first_last, gender, major_id, phone, email, line_id, line_uid)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (student_id) DO NOTHING
           RETURNING *
         )
         SELECT i.*, m.name AS major FROM inserted i LEFT JOIN majors m ON m.id = i.major_id`,
        [
          str(student.studentId),
          str(student.prefix) || 'นาย',
          str(student.firstLast),
          str(student.gender) || 'ชาย',
          await majorIdByName(student.major),
          str(student.phone),
          str(student.email),
          str(student.lineId),
          str(student.lineUid),
        ],
      );
      if (row) inserted.push(toStudent(row));
      else skipped.push({ studentId: str(student.studentId), reason: 'มีรหัสนี้อยู่แล้ว' });
    }

    res.status(201).json({ inserted, skipped });
  }),
);

dataRouter.patch(
  '/students/:id',
  asyncRoute(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'รหัสนักศึกษาไม่ถูกต้อง' });

    const body = req.body ?? {};
    const majorId = body.major === undefined ? null : await majorIdByName(body.major);

    const row = await queryOne(
      `WITH updated AS (
         UPDATE students SET
           student_id = COALESCE($2, student_id),
           prefix     = COALESCE($3, prefix),
           first_last = COALESCE($4, first_last),
           gender     = COALESCE($5, gender),
           major_id   = COALESCE($6, major_id),
           phone      = COALESCE($7, phone),
           email      = COALESCE($8, email),
           line_id    = COALESCE($9, line_id),
           line_uid   = COALESCE($10, line_uid),
           -- Changing the uid invalidates the previous verification: the saved
           -- profile belonged to the old account, so the link must be re-proved
           -- through /api/line/connect rather than silently carried over.
           line_display_name = CASE
             WHEN $10 IS NOT NULL AND $10 <> line_uid THEN '' ELSE line_display_name END,
           line_picture_url = CASE
             WHEN $10 IS NOT NULL AND $10 <> line_uid THEN '' ELSE line_picture_url END,
           line_connected_at = CASE
             WHEN $10 IS NOT NULL AND $10 <> line_uid THEN NULL ELSE line_connected_at END
         WHERE id = $1
         RETURNING *
       )
       SELECT u.*, m.name AS major FROM updated u LEFT JOIN majors m ON m.id = u.major_id`,
      [
        id,
        body.studentId === undefined ? null : str(body.studentId),
        body.prefix === undefined ? null : str(body.prefix),
        body.firstLast === undefined ? null : str(body.firstLast),
        body.gender === undefined ? null : str(body.gender),
        majorId,
        body.phone === undefined ? null : str(body.phone),
        body.email === undefined ? null : str(body.email),
        body.lineId === undefined ? null : str(body.lineId),
        body.lineUid === undefined ? null : str(body.lineUid),
      ],
    );
    if (!row) return res.status(404).json({ message: 'ไม่พบข้อมูลนักศึกษา' });
    res.json(toStudent(row));
  }),
);

dataRouter.delete(
  '/students/:id',
  requireAdmin,
  asyncRoute(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'รหัสนักศึกษาไม่ถูกต้อง' });
    const row = await queryOne('DELETE FROM students WHERE id = $1 RETURNING id', [id]);
    if (!row) return res.status(404).json({ message: 'ไม่พบข้อมูลนักศึกษา' });
    res.status(204).end();
  }),
);

/* --------------------------------------------------------- student groups */

const GROUP_SELECT = `
  SELECT g.*, m.name AS major
  FROM student_groups g
  LEFT JOIN majors m ON m.id = g.major_id
`;

dataRouter.get(
  '/student-groups',
  asyncRoute(async (_req, res) => {
    const rows = await query(`${GROUP_SELECT} ORDER BY g.id`);
    res.json(rows.map(toGroup));
  }),
);

dataRouter.post(
  '/student-groups',
  asyncRoute(async (req, res) => {
    const { studentId, major, group } = req.body ?? {};
    if (!str(studentId) || !str(group)) {
      return res.status(400).json({ message: 'กรุณาระบุเลขนักศึกษาและชื่อกลุ่ม' });
    }

    const row = await queryOne(
      `WITH inserted AS (
         INSERT INTO student_groups (student_id, major_id, group_name)
         VALUES ($1, $2, $3) RETURNING *
       )
       SELECT i.*, m.name AS major FROM inserted i LEFT JOIN majors m ON m.id = i.major_id`,
      [str(studentId), await majorIdByName(major), str(group)],
    );
    res.status(201).json(toGroup(row));
  }),
);

dataRouter.patch(
  '/student-groups/:id',
  asyncRoute(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'รหัสข้อมูลไม่ถูกต้อง' });

    const body = req.body ?? {};
    const majorId = body.major === undefined ? null : await majorIdByName(body.major);

    const row = await queryOne(
      `WITH updated AS (
         UPDATE student_groups SET
           student_id = COALESCE($2, student_id),
           major_id   = COALESCE($3, major_id),
           group_name = COALESCE($4, group_name)
         WHERE id = $1 RETURNING *
       )
       SELECT u.*, m.name AS major FROM updated u LEFT JOIN majors m ON m.id = u.major_id`,
      [
        id,
        body.studentId === undefined ? null : str(body.studentId),
        majorId,
        body.group === undefined ? null : str(body.group),
      ],
    );
    if (!row) return res.status(404).json({ message: 'ไม่พบข้อมูลกลุ่ม' });
    res.json(toGroup(row));
  }),
);

dataRouter.delete(
  '/student-groups/:id',
  requireAdmin,
  asyncRoute(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'รหัสข้อมูลไม่ถูกต้อง' });
    const row = await queryOne('DELETE FROM student_groups WHERE id = $1 RETURNING id', [id]);
    if (!row) return res.status(404).json({ message: 'ไม่พบข้อมูลกลุ่ม' });
    res.status(204).end();
  }),
);

/* --------------------------------------------------------------- history */

dataRouter.get(
  '/history',
  asyncRoute(async (_req, res) => {
    const rows = await query('SELECT * FROM history_log ORDER BY sent_at DESC, id DESC');
    res.json(rows.map(toHistory));
  }),
);

dataRouter.post(
  '/history',
  asyncRoute(async (req, res) => {
    const body = req.body ?? {};
    const row = await queryOne(
      `INSERT INTO history_log
         (sent_at, template, msg_type, group_name, recipient_count, success, body)
       VALUES (COALESCE($1, now()), $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        body.sentAt ? new Date(body.sentAt) : null,
        str(body.template) || '(ไม่มีหัวข้อ)',
        str(body.msgType) || 'ข้อความ',
        str(body.group),
        Number(body.count) || 0,
        Boolean(body.success),
        str(body.text),
      ],
    );
    res.status(201).json(toHistory(row));
  }),
);

dataRouter.patch(
  '/history/:id',
  asyncRoute(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'รหัสประวัติไม่ถูกต้อง' });

    const body = req.body ?? {};
    const row = await queryOne(
      `UPDATE history_log SET
         template   = COALESCE($2, template),
         msg_type   = COALESCE($3, msg_type),
         group_name = COALESCE($4, group_name),
         success    = COALESCE($5, success)
       WHERE id = $1 RETURNING *`,
      [
        id,
        body.template === undefined ? null : str(body.template),
        body.msgType === undefined ? null : str(body.msgType),
        body.group === undefined ? null : str(body.group),
        body.success === undefined ? null : Boolean(body.success),
      ],
    );
    if (!row) return res.status(404).json({ message: 'ไม่พบประวัติการส่ง' });
    res.json(toHistory(row));
  }),
);

dataRouter.delete(
  '/history/:id',
  requireAdmin,
  asyncRoute(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'รหัสประวัติไม่ถูกต้อง' });
    const row = await queryOne('DELETE FROM history_log WHERE id = $1 RETURNING id', [id]);
    if (!row) return res.status(404).json({ message: 'ไม่พบประวัติการส่ง' });
    res.status(204).end();
  }),
);

/* -------------------------------------------------------------- bootstrap */

/** Everything the app needs on load, in a single request. */
dataRouter.get(
  '/bootstrap',
  asyncRoute(async (req, res) => {
    // The user list is admin-only on its own endpoint, so it must not leak
    // through the bootstrap payload either. Non-admins get an empty array.
    const isAdmin = Boolean(req.session?.user?.isAdmin);

    const [users, majors, students, groups, history] = await Promise.all([
      isAdmin ? query('SELECT * FROM users ORDER BY id') : Promise.resolve([]),
      query(`
        SELECT m.*, count(s.id)::int AS student_count
        FROM majors m LEFT JOIN students s ON s.major_id = m.id
        GROUP BY m.id ORDER BY m.id
      `),
      query(`${STUDENT_SELECT} ORDER BY s.id`),
      query(`${GROUP_SELECT} ORDER BY g.id`),
      query('SELECT * FROM history_log ORDER BY sent_at DESC, id DESC'),
    ]);

    res.json({
      users: users.map(toUser),
      majors: majors.map(toMajor),
      students: students.map(toStudent),
      studentGroups: groups.map(toGroup),
      historyLog: history.map(toHistory),
    });
  }),
);
