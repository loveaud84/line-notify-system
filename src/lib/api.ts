import type { AppData, HistoryEntry, Major, Student, StudentGroup, StudentInput, User } from '../types';

/** Fired on any 401 so the app can sign the user out of the UI. */
export const UNAUTHORIZED_EVENT = 'lineNotify:unauthorized';

const NETWORK_ERROR =
  'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้ — ตรวจสอบว่ารันคำสั่ง npm run dev แล้วเซิร์ฟเวอร์ทำงานอยู่';

/** Error carrying the server's Thai message, so pages can show it directly. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new ApiError(NETWORK_ERROR, 0);
  }

  if (response.status === 204) return undefined as T;

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    // A 401 anywhere means the session is gone — expired, or signed out in
    // another tab. Broadcast it so the app can fall back to the login screen
    // instead of leaving a dead page behind an error banner.
    if (response.status === 401) {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    throw new ApiError(
      body?.message ?? `เซิร์ฟเวอร์ตอบกลับด้วยสถานะ ${response.status}`,
      response.status,
    );
  }

  return body as T;
}

const post = <T>(path: string, data: unknown) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(data) });

const patch = <T>(path: string, data: unknown) =>
  request<T>(path, { method: 'PATCH', body: JSON.stringify(data) });

const remove = (path: string) => request<void>(path, { method: 'DELETE' });

/** Everything the app needs on load, in one request. */
export const fetchBootstrap = () => request<AppData>('/bootstrap');

export const login = (username: string, password: string, rememberMe: boolean) =>
  post<{ user: User }>('/auth/login', { username, password, rememberMe });

/**
 * Who is signed in, according to the server's session cookie.
 *
 * Rejects with ApiError status 401 when there is no session, which is how the
 * app tells "not signed in" apart from "server unreachable".
 */
export const fetchCurrentUser = () => request<{ user: User }>('/auth/me');

export const logout = () => post<{ ok: boolean }>('/auth/logout', {});

export const api = {
  users: {
    create: (user: Omit<User, 'id'> & { password?: string }) => post<User>('/users', user),
    update: (id: number, patchBody: Partial<User> & { password?: string }) =>
      patch<User>(`/users/${id}`, patchBody),
    remove: (id: number) => remove(`/users/${id}`),
  },
  majors: {
    create: (major: Omit<Major, 'id' | 'studentCount'>) => post<Major>('/majors', major),
    update: (id: number, patchBody: Partial<Major>) => patch<Major>(`/majors/${id}`, patchBody),
    remove: (id: number) => remove(`/majors/${id}`),
  },
  students: {
    create: (student: StudentInput) => post<Student>('/students', student),
    createMany: (students: StudentInput[]) =>
      post<{ inserted: Student[]; skipped: { studentId: string; reason: string }[] }>(
        '/students/bulk',
        { students },
      ),
    update: (id: number, patchBody: Partial<StudentInput>) =>
      patch<Student>(`/students/${id}`, patchBody),
    remove: (id: number) => remove(`/students/${id}`),
  },
  studentGroups: {
    create: (group: Omit<StudentGroup, 'id'>) => post<StudentGroup>('/student-groups', group),
    update: (id: number, patchBody: Partial<StudentGroup>) =>
      patch<StudentGroup>(`/student-groups/${id}`, patchBody),
    remove: (id: number) => remove(`/student-groups/${id}`),
  },
  history: {
    create: (entry: Omit<HistoryEntry, 'id'>) => post<HistoryEntry>('/history', entry),
    update: (id: number, patchBody: Partial<HistoryEntry>) =>
      patch<HistoryEntry>(`/history/${id}`, patchBody),
    remove: (id: number) => remove(`/history/${id}`),
  },
};
