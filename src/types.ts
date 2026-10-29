export type TabId =
  | 'dashboard'
  | 'calendar'
  | 'users'
  | 'majors'
  | 'students'
  | 'studentGroups'
  | 'compose'
  | 'recipients'
  | 'history'
  | 'reportStudents'
  | 'reportGroups'
  | 'reportHistory'
  | 'settings';

export interface User {
  id: number;
  fullName: string;
  isAdmin: boolean;
  isActive: boolean;
  username?: string;
  email?: string;
}

export interface Major {
  id: number;
  name: string;
  faculty: string;
  /** Derived by the API from the students table, never stored. */
  studentCount: number;
}

export interface Student {
  id: number;
  studentId: string;
  prefix: string;
  /** Given name and surname without the prefix. */
  firstLast: string;
  gender: string;
  major: string;
  phone: string;
  email: string;
  lineId: string;
  lineUid: string;
  /** LINE profile name, filled in by a verified connection. */
  lineDisplayName: string;
  linePictureUrl: string;
  /**
   * ISO timestamp of the last successful verification, or null.
   *
   * Non-null means LINE itself confirmed the student added the Official
   * Account — unlike `lineUid`, which is only what someone typed in.
   */
  lineConnectedAt: string | null;
}

/**
 * The fields a client may supply when creating or editing a student.
 *
 * The LINE connection fields are excluded on purpose: they are written only by
 * a verified /api/line/connect, never by a form.
 */
export type StudentInput = Omit<
  Student,
  'id' | 'lineDisplayName' | 'linePictureUrl' | 'lineConnectedAt'
>;

export interface StudentGroup {
  id: number;
  studentId: string;
  major: string;
  group: string;
}

export type MsgType = 'ข้อความ' | 'ข้อความ + รูปภาพ';

export interface HistoryEntry {
  id: number;
  /**
   * ISO timestamp of the send. The design stored a Thai display string with no
   * year, which forced the calendar to guess; the label is now formatted from
   * this value at render time instead.
   */
  sentAt: string;
  template: string;
  msgType: MsgType;
  group: string;
  count: number;
  success: boolean;
  text: string;
}

/** The full dataset held in memory, mirroring what is in PostgreSQL. */
export interface AppData {
  users: User[];
  majors: Major[];
  students: Student[];
  studentGroups: StudentGroup[];
  historyLog: HistoryEntry[];
}
