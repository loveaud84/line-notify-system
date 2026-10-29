import { useCallback, useEffect, useState } from 'react';
import { theme } from './theme';
import {
  ApiError,
  UNAUTHORIZED_EVENT,
  fetchCurrentUser,
  logout as logoutRequest,
} from './lib/api';
import type { TabId, User } from './types';
import { PAGE_TITLES } from './data/seed';
import { useStore } from './store';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { CalendarPage } from './pages/CalendarPage';
import { ComposePage } from './pages/ComposePage';
import { DashboardPage } from './pages/DashboardPage';
import { HistoryPage } from './pages/HistoryPage';
import { LoginPage } from './pages/LoginPage';
import { MajorsPage } from './pages/MajorsPage';
import { RecipientsPage } from './pages/RecipientsPage';
import { ReportGroupsPage } from './pages/ReportGroupsPage';
import { ReportHistoryPage } from './pages/ReportHistoryPage';
import { ReportStudentsPage } from './pages/ReportStudentsPage';
import { SettingsPage } from './pages/SettingsPage';
import { StudentGroupsPage } from './pages/StudentGroupsPage';
import { StudentsPage } from './pages/StudentsPage';
import { UsersPage } from './pages/UsersPage';

/** Full-screen message used for the initial load and for connection failures. */
function Splash({
  title,
  detail,
  onRetry,
}: {
  title: string;
  detail?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: theme.primary,
        padding: 24,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 14,
          padding: '32px 36px',
          maxWidth: 460,
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, color: theme.textDark }}>{title}</div>
        {detail && (
          <div
            style={{
              fontSize: 13,
              lineHeight: 1.7,
              color: theme.textMuted,
              marginTop: 10,
              whiteSpace: 'pre-line',
            }}
          >
            {detail}
          </div>
        )}
        {onRetry && (
          <div
            onClick={onRetry}
            style={{
              marginTop: 22,
              display: 'inline-block',
              padding: '10px 22px',
              borderRadius: 8,
              background: theme.primary,
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ลองใหม่อีกครั้ง
          </div>
        )}
      </div>
    </div>
  );
}

export function App() {
  const { data, initialised, loadError, actionError, clearActionError, reload } = useStore();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // False until the session check resolves, so the login screen does not flash
  // for someone who is already signed in.
  const [sessionChecked, setSessionChecked] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [reportsOpen, setReportsOpen] = useState(true);

  /** Signs in: remember the user, then load the data their session can see. */
  const handleSignedIn = useCallback(
    (user: User) => {
      setCurrentUser(user);
      void reload();
    },
    [reload],
  );

  // Ask the server who we are. The session lives in an httpOnly cookie, so this
  // is the only way the page can find out — and it means a refresh no longer
  // signs the user out.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { user } = await fetchCurrentUser();
        if (cancelled) return;
        setCurrentUser(user);
        void reload();
      } catch (error) {
        // 401 simply means "not signed in" — the login screen is the right
        // outcome, not an error.
        if (!(error instanceof ApiError) || error.status !== 401) {
          console.error('[auth] ตรวจสอบ session ไม่สำเร็จ', error);
        }
      } finally {
        if (!cancelled) setSessionChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  // Any 401 from a later request means the session lapsed; drop back to login.
  useEffect(() => {
    const onUnauthorized = () => setCurrentUser(null);
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  if (!sessionChecked) {
    return <Splash title="กำลังตรวจสอบสิทธิ์การเข้าใช้งาน..." />;
  }

  if (!currentUser) {
    return <LoginPage onAuthenticated={handleSignedIn} />;
  }

  // Only a failed *first* load takes over the screen. Once the app is up, a
  // failed background refresh surfaces as a banner instead of blanking the page.
  if (loadError && !initialised) {
    return (
      <Splash
        title="เชื่อมต่อฐานข้อมูลไม่สำเร็จ"
        detail={
          `${loadError}\n\n` +
          'ตรวจสอบว่า PostgreSQL ทำงานอยู่ ค่า DATABASE_URL ในไฟล์ .env ถูกต้อง ' +
          'และสร้างตารางแล้วด้วยคำสั่ง npm run db:setup'
        }
        onRetry={() => void reload()}
      />
    );
  }

  if (!initialised) {
    return <Splash title="กำลังโหลดข้อมูลจากฐานข้อมูล..." />;
  }

  const [title, subtitle] = PAGE_TITLES[activeTab] ?? PAGE_TITLES.dashboard;

  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage />;
      case 'calendar':
        return <CalendarPage historyLog={data.historyLog} />;
      case 'users':
        return <UsersPage />;
      case 'majors':
        return <MajorsPage />;
      case 'students':
        return <StudentsPage />;
      case 'studentGroups':
        return <StudentGroupsPage />;
      case 'compose':
        return <ComposePage onNavigate={setActiveTab} />;
      case 'recipients':
        return <RecipientsPage />;
      case 'history':
        return <HistoryPage />;
      case 'reportStudents':
        return <ReportStudentsPage />;
      case 'reportGroups':
        return <ReportGroupsPage />;
      case 'reportHistory':
        return <ReportHistoryPage />;
      case 'settings':
        return <SettingsPage />;
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: theme.bg, color: theme.textDark }}>
      <Sidebar
        activeTab={activeTab}
        onNavigate={setActiveTab}
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded((v) => !v)}
        reportsOpen={reportsOpen}
        onToggleReports={() => setReportsOpen((v) => !v)}
        userName={currentUser.fullName.replace(/^(นาย|นางสาว|นาง)/, '')}
        roleLabel={currentUser.isAdmin ? 'แอดมิน' : 'ผู้ใช้งาน'}
        isAdmin={currentUser.isAdmin}
        onLogout={() => {
          // Destroy the session server-side; clear the UI either way so a
          // network failure cannot trap someone in a signed-in shell.
          void logoutRequest().catch(() => {});
          setCurrentUser(null);
          setActiveTab('dashboard');
        }}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar
          title={title}
          subtitle={subtitle}
          historyLog={data.historyLog}
          onOpenCalendar={() => setActiveTab('calendar')}
        />
        {actionError && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              margin: '16px 32px 0',
              padding: '12px 16px',
              borderRadius: 8,
              background: '#fdecea',
              border: `1px solid ${theme.dangerBorder}`,
              color: theme.danger,
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            <span>{actionError}</span>
            <span
              onClick={clearActionError}
              style={{ cursor: 'pointer', fontWeight: 700, flexShrink: 0 }}
            >
              ✕
            </span>
          </div>
        )}
        <div style={{ padding: '28px 32px 60px', flex: 1, overflowY: 'auto' }}>{renderPage()}</div>
      </div>
    </div>
  );
}
