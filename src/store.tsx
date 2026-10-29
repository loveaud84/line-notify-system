import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ApiError, api, fetchBootstrap } from './lib/api';
import type {
  AppData,
  HistoryEntry,
  Major,
  StudentGroup,
  StudentInput,
  User,
} from './types';

const EMPTY: AppData = {
  users: [],
  majors: [],
  students: [],
  studentGroups: [],
  historyLog: [],
};

/**
 * Write methods resolve to `true` on success and `false` on failure, and never
 * reject. Callers use the result to decide whether to close a dialog; the
 * reason is surfaced globally through `actionError`.
 */
interface Store {
  data: AppData;
  loading: boolean;
  /**
   * False until the first load resolves.
   *
   * The full-screen loading splash keys off this rather than `loading`, so a
   * later refresh does not unmount the page — an open dialog would otherwise
   * disappear the moment it refreshed the data behind it.
   */
  initialised: boolean;
  /** Set when the initial load failed; the app shows a retry screen. */
  loadError: string | null;
  /** Set when the most recent write failed; shown as a banner. */
  actionError: string | null;
  clearActionError: () => void;
  reload: () => Promise<void>;

  addUser: (user: Omit<User, 'id'> & { password?: string }) => Promise<boolean>;
  updateUser: (id: number, patch: Partial<User> & { password?: string }) => Promise<boolean>;
  deleteUser: (id: number) => Promise<boolean>;

  addMajor: (major: Omit<Major, 'id' | 'studentCount'>) => Promise<boolean>;
  updateMajor: (id: number, patch: Partial<Major>) => Promise<boolean>;
  deleteMajor: (id: number) => Promise<boolean>;

  addStudent: (student: StudentInput) => Promise<boolean>;
  addStudents: (
    students: StudentInput[],
  ) => Promise<{ inserted: number; skipped: number } | null>;
  updateStudent: (id: number, patch: Partial<StudentInput>) => Promise<boolean>;
  deleteStudent: (id: number) => Promise<boolean>;

  addStudentGroup: (group: Omit<StudentGroup, 'id'>) => Promise<boolean>;
  updateStudentGroup: (id: number, patch: Partial<StudentGroup>) => Promise<boolean>;
  deleteStudentGroup: (id: number) => Promise<boolean>;

  addHistory: (entry: Omit<HistoryEntry, 'id'>) => Promise<boolean>;
  updateHistory: (id: number, patch: Partial<HistoryEntry>) => Promise<boolean>;
  deleteHistory: (id: number) => Promise<boolean>;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [initialised, setInitialised] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchBootstrap());
      setLoadError(null);
      setInitialised(true);
    } catch (error) {
      // A lapsed session is handled by the login redirect, not by the
      // database-error screen — surfacing it here would read as an outage.
      if (error instanceof ApiError && error.status === 401) {
        setLoadError(null);
      } else {
        setLoadError(
          error instanceof ApiError ? error.message : 'โหลดข้อมูลจากเซิร์ฟเวอร์ไม่สำเร็จ',
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Runs a write, refetches, and reports failure through `actionError`.
   *
   * Deliberately not optimistic: a create can fail on a unique constraint, and
   * majors carry a derived student count that only the server can recompute.
   * Refetching keeps what is on screen equal to what is in the database.
   *
   * Returns null on failure so callers can keep a dialog open.
   */
  const mutate = useCallback(async <T,>(operation: () => Promise<T>): Promise<T | null> => {
    try {
      const result = await operation();
      setData(await fetchBootstrap());
      setActionError(null);
      return result;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        // Session gone: the login screen is the answer, not an error banner.
        setActionError(null);
      } else {
        setActionError(
          error instanceof ApiError ? error.message : 'บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
        );
      }
      return null;
    }
  }, []);

  const store = useMemo<Store>(() => {
    // `mutate` returns null on failure; every void-ish write maps that to false.
    const ok = async (operation: () => Promise<unknown>) => (await mutate(operation)) !== null;

    return {
      data,
      loading,
      initialised,
      loadError,
      actionError,
      clearActionError: () => setActionError(null),
      reload,

      addUser: (user) => ok(() => api.users.create(user)),
      updateUser: (id, patch) => ok(() => api.users.update(id, patch)),
      deleteUser: (id) => ok(() => api.users.remove(id)),

      addMajor: (major) => ok(() => api.majors.create(major)),
      updateMajor: (id, patch) => ok(() => api.majors.update(id, patch)),
      deleteMajor: (id) => ok(() => api.majors.remove(id)),

      addStudent: (student) => ok(() => api.students.create(student)),
      addStudents: async (students) => {
        const result = await mutate(() => api.students.createMany(students));
        if (!result) return null;
        return { inserted: result.inserted.length, skipped: result.skipped.length };
      },
      updateStudent: (id, patch) => ok(() => api.students.update(id, patch)),
      deleteStudent: (id) => ok(() => api.students.remove(id)),

      addStudentGroup: (group) => ok(() => api.studentGroups.create(group)),
      updateStudentGroup: (id, patch) => ok(() => api.studentGroups.update(id, patch)),
      deleteStudentGroup: (id) => ok(() => api.studentGroups.remove(id)),

      addHistory: (entry) => ok(() => api.history.create(entry)),
      updateHistory: (id, patch) => ok(() => api.history.update(id, patch)),
      deleteHistory: (id) => ok(() => api.history.remove(id)),
    };
  }, [data, loading, initialised, loadError, actionError, reload, mutate]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside <StoreProvider>');
  return store;
}
