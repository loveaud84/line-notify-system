-- Schema for ระบบแจ้งเตือนนักศึกษาผ่าน LINE
--
-- Safe to run repeatedly: every object is created only when missing.
-- Run with `npm run db:migrate`.

-- ---------------------------------------------------------------- ผู้ใช้งาน
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  full_name     TEXT        NOT NULL,
  -- Nullable: the seeded staff records have no sign-in credentials, matching
  -- the design where only the admin can actually log in.
  username      TEXT        UNIQUE,
  password_hash TEXT,
  email         TEXT,
  is_admin      BOOLEAN     NOT NULL DEFAULT FALSE,
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------- สาขาวิชา
CREATE TABLE IF NOT EXISTS majors (
  id      SERIAL PRIMARY KEY,
  name    TEXT NOT NULL UNIQUE,
  faculty TEXT NOT NULL DEFAULT ''
);

-- --------------------------------------------------------------- นักศึกษา
CREATE TABLE IF NOT EXISTS students (
  id         SERIAL PRIMARY KEY,
  -- The university's own identifier, and what group assignments reference.
  student_id TEXT NOT NULL UNIQUE,
  prefix     TEXT NOT NULL DEFAULT 'นาย',
  first_last TEXT NOT NULL,
  gender     TEXT NOT NULL DEFAULT 'ชาย',
  -- Renaming a major must not orphan its students, so this is a real reference.
  -- ON DELETE SET NULL: deleting a major keeps the students.
  major_id   INTEGER REFERENCES majors (id) ON UPDATE CASCADE ON DELETE SET NULL,
  phone      TEXT NOT NULL DEFAULT '',
  email      TEXT NOT NULL DEFAULT '',
  line_id    TEXT NOT NULL DEFAULT '',
  -- The LINE user id messages are actually pushed to. Empty means unreachable.
  line_uid   TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS students_major_id_idx ON students (major_id);

-- Result of verifying the LINE uid against the Messaging API. These are filled
-- in only by a successful /api/line/connect, so a non-null line_connected_at
-- means LINE itself confirmed the student has added the Official Account —
-- unlike line_uid, which is just whatever someone typed into the form.
ALTER TABLE students ADD COLUMN IF NOT EXISTS line_display_name TEXT NOT NULL DEFAULT '';
ALTER TABLE students ADD COLUMN IF NOT EXISTS line_picture_url  TEXT NOT NULL DEFAULT '';
ALTER TABLE students ADD COLUMN IF NOT EXISTS line_connected_at TIMESTAMPTZ;

-- ---------------------------------------------------------- จัดกลุ่มนักศึกษา
CREATE TABLE IF NOT EXISTS student_groups (
  id         SERIAL PRIMARY KEY,
  -- Follows the student's own id so renumbering cascades rather than orphaning.
  student_id TEXT NOT NULL REFERENCES students (student_id)
               ON UPDATE CASCADE ON DELETE CASCADE,
  major_id   INTEGER REFERENCES majors (id) ON UPDATE CASCADE ON DELETE SET NULL,
  group_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- A student belongs to a given group at most once.
  CONSTRAINT student_groups_unique_membership UNIQUE (student_id, group_name)
);

CREATE INDEX IF NOT EXISTS student_groups_group_name_idx ON student_groups (group_name);

-- ------------------------------------------------------------ ประวัติการส่ง
CREATE TABLE IF NOT EXISTS history_log (
  id              SERIAL PRIMARY KEY,
  -- A real instant, not the design's "11 ก.ค. 10:24" display string: that had
  -- no year, which forced the calendar to guess. The Thai label is formatted
  -- from this value in the UI instead.
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  template        TEXT        NOT NULL,
  msg_type        TEXT        NOT NULL DEFAULT 'ข้อความ',
  group_name      TEXT        NOT NULL DEFAULT '',
  recipient_count INTEGER     NOT NULL DEFAULT 0,
  success         BOOLEAN     NOT NULL DEFAULT FALSE,
  body            TEXT        NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS history_log_sent_at_idx ON history_log (sent_at DESC);

-- --------------------------------------------------------------- ค่าตั้งค่า
-- Key/value rather than a one-row table so new settings need no migration.
CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
