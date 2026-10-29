/** Wraps an async route so a rejected promise reaches Express's error handler. */
export function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

/**
 * Turns a PostgreSQL constraint violation into a message the UI can show.
 *
 * Without this the user sees raw text like
 * `duplicate key value violates unique constraint "students_student_id_key"`.
 */
export function describeDbError(error) {
  switch (error.code) {
    case '23505': // unique_violation
      if (error.constraint === 'students_student_id_key')
        return 'มีรหัสนักศึกษานี้ในระบบแล้ว';
      if (error.constraint === 'majors_name_key') return 'มีชื่อสาขาวิชานี้ในระบบแล้ว';
      if (error.constraint === 'users_username_key') return 'มี username นี้ในระบบแล้ว';
      if (error.constraint === 'student_groups_unique_membership')
        return 'นักศึกษาคนนี้อยู่ในกลุ่มนี้อยู่แล้ว';
      return 'ข้อมูลนี้มีอยู่ในระบบแล้ว';

    case '23503': // foreign_key_violation
      if (error.constraint?.startsWith('student_groups_student_id'))
        return 'ไม่พบรหัสนักศึกษานี้ในระบบ — กรุณาเพิ่มข้อมูลนักศึกษาก่อนจัดกลุ่ม';
      return 'ข้อมูลอ้างอิงไม่ถูกต้อง';

    case '23502': // not_null_violation
      return 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน';

    default:
      return null;
  }
}

/** Parses an :id route param, returning null when it is not a positive integer. */
export function parseId(raw) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Trims a value to a string, falling back to '' for null/undefined. */
export function str(value) {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
}
