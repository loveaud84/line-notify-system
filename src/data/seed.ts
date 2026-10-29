// Presentation constants and dropdown options.
//
// The seeded records themselves now live in server/db/seed.js and are loaded
// into PostgreSQL by `npm run db:seed` — this file no longer holds any data.

export const PREFIX_OPTIONS = ['นาย', 'นาง', 'นางสาว'];
export const GENDER_OPTIONS = ['ชาย', 'หญิง'];
export const MSG_TYPES = ['ข้อความ', 'ข้อความ + รูปภาพ'] as const;
export const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100];

export const FACULTY_OPTIONS = [
  'คณะวิศวกรรมศาสตร์',
  'คณะบริหารธุรกิจ',
  'คณะบัญชี',
  'คณะนิเทศศาสตร์',
  'คณะศิลปศาสตร์',
];

export const SYSTEM_ADMINS = [
  { name: 'สมชาย ใจดี', email: 'somchai.j@university.ac.th', initials: 'สจ', role: 'ผู้ดูแลระบบ' },
  { name: 'วิภาวี ศรีสุข', email: 'wipawee.s@university.ac.th', initials: 'วศ', role: 'เจ้าหน้าที่' },
  { name: 'ปิยะพงษ์ มั่นคง', email: 'piyapong.m@university.ac.th', initials: 'ปม', role: 'เจ้าหน้าที่' },
];

export const PAGE_TITLES: Record<string, [string, string]> = {
  dashboard: ['ภาพรวมระบบ', 'สรุปการแจ้งเตือนและกิจกรรมล่าสุด'],
  calendar: ['ปฏิทินการส่งข้อความ', 'ดูกำหนดการและประวัติการส่งข้อความรายวัน'],
  users: ['ข้อมูลผู้ใช้งาน', 'จัดการรายชื่อและสิทธิ์ผู้ใช้งานระบบ'],
  majors: ['ข้อมูลสาขาวิชา', 'จัดการรายชื่อสาขาวิชาและคณะที่สังกัด'],
  students: ['ข้อมูลนักศึกษา', 'จัดการข้อมูลนักศึกษาสำหรับการแจ้งเตือน'],
  studentGroups: ['จัดกลุ่มนักศึกษา', 'จัดกลุ่มผู้รับสำหรับการส่งข้อความแจ้งเตือน'],
  compose: ['เขียนข้อความแจ้งเตือน', 'ส่งข้อความถึงนักศึกษาผ่าน LINE Official Account'],
  recipients: ['ผู้รับและกลุ่มผู้รับ', 'จัดการรายชื่อและกลุ่มนักศึกษา'],
  history: ['ประวัติการส่งข้อความ', 'ตรวจสอบสถานะการส่งย้อนหลัง'],
  reportStudents: ['ออกรายงานข้อมูลนักศึกษา', 'สรุปและส่งออกข้อมูลนักศึกษาทั้งหมด'],
  reportGroups: ['ออกรายงานข้อมูลจัดกลุ่มนักศึกษา', 'สรุปและส่งออกข้อมูลการจัดกลุ่มนักศึกษา'],
  reportHistory: ['ออกรายงานข้อมูลประวัติการส่ง', 'สรุปและส่งออกประวัติการส่งข้อความ'],
  settings: ['ตั้งค่าการเชื่อมต่อ LINE', 'จัดการ Channel และสิทธิ์การเข้าถึง'],
};
