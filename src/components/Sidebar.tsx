import { useState } from 'react';
import { ORG_NAME, theme } from '../theme';
import type { TabId } from '../types';
import { LogoutIcon, NavIcon, type NavIconName } from './NavIcons';
import { Button, Modal } from './ui';

interface NavEntry {
  id: TabId;
  label: string;
  icon: NavIconName;
  indent?: boolean;
  /** Hidden from non-admins, whose API calls for it would be rejected anyway. */
  adminOnly?: boolean;
}

const MAIN_NAV: NavEntry[] = [
  { id: 'dashboard', label: 'ภาพรวม', icon: 'dashboard' },
  { id: 'users', label: 'ข้อมูลผู้ใช้งาน', icon: 'users', adminOnly: true },
  { id: 'majors', label: 'ข้อมูลสาขาวิชา', icon: 'majors' },
  { id: 'students', label: 'ข้อมูลนักศึกษา', icon: 'students' },
  { id: 'studentGroups', label: 'จัดกลุ่มนักศึกษา', icon: 'groups' },
  { id: 'compose', label: 'ส่งข้อความ', icon: 'mail' },
  { id: 'recipients', label: 'ผู้รับและกลุ่มผู้รับ', icon: 'recipients' },
  { id: 'history', label: 'ประวัติการส่ง', icon: 'history' },
];

const REPORT_NAV: NavEntry[] = [
  { id: 'reportStudents', label: 'รายงานข้อมูลนักศึกษา', icon: 'students', indent: true },
  { id: 'reportGroups', label: 'รายงานจัดกลุ่มนักศึกษา', icon: 'groups', indent: true },
  { id: 'reportHistory', label: 'รายงานประวัติการส่ง', icon: 'history', indent: true },
];

const REPORT_TABS: TabId[] = ['reportStudents', 'reportGroups', 'reportHistory'];

export function Sidebar({
  activeTab,
  onNavigate,
  expanded,
  onToggle,
  reportsOpen,
  onToggleReports,
  userName,
  roleLabel,
  isAdmin,
  onLogout,
}: {
  activeTab: TabId;
  onNavigate: (tab: TabId) => void;
  expanded: boolean;
  onToggle: () => void;
  reportsOpen: boolean;
  onToggleReports: () => void;
  userName: string;
  roleLabel: string;
  isAdmin: boolean;
  onLogout: () => void;
}) {
  const reportsActive = REPORT_TABS.includes(activeTab);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const renderItem = (entry: NavEntry) => {
    const active = activeTab === entry.id;
    const color = active ? '#ffffff' : 'rgba(255,255,255,0.68)';
    return (
      <div
        key={entry.id}
        className="nav-item"
        title={entry.label}
        onClick={() => onNavigate(entry.id)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: `11px 14px 11px ${entry.indent ? 26 : 14}px`,
          borderRadius: 8,
          cursor: 'pointer',
          background: active ? 'rgba(255,255,255,0.14)' : 'transparent',
          justifyContent: expanded ? 'flex-start' : 'center',
        }}
      >
        <NavIcon name={entry.icon} color={color} accent={theme.accent} />
        {expanded && (
          <span
            style={{
              fontSize: 13.5,
              fontWeight: active ? 700 : 500,
              color,
              whiteSpace: 'nowrap',
              flex: 1,
            }}
          >
            {entry.label}
          </span>
        )}
      </div>
    );
  };

  return (
    <>
    <div
      style={{
        width: expanded ? 248 : 76,
        flexShrink: 0,
        background: theme.primary,
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0',
        position: 'sticky',
        top: 0,
        height: '100vh',
        transition: 'width 0.18s ease',
      }}
    >
      {/* Brand + collapse toggle */}
      <div
        style={{
          padding: '0 22px 22px',
          borderBottom: '1px solid rgba(255,255,255,0.12)',
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, overflow: 'hidden' }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: theme.accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '0.3px' }}>
              SM
            </span>
          </div>
          {expanded && (
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#fff',
                  lineHeight: 1.3,
                  whiteSpace: 'nowrap',
                }}
              >
                {ORG_NAME}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.55)',
                  lineHeight: 1.3,
                  whiteSpace: 'nowrap',
                }}
              >
                ผ่าน LINE
              </div>
            </div>
          )}
        </div>
        <div
          className="sidebar-toggle"
          onClick={onToggle}
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            background: 'rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 12, color: '#fff', lineHeight: 1 }}>{expanded ? '‹' : '›'}</span>
        </div>
      </div>

      {/* Navigation */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          padding: '0 12px',
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {MAIN_NAV.filter((entry) => isAdmin || !entry.adminOnly).map(renderItem)}

        <div
          className="nav-item"
          title="ออกรายงาน"
          onClick={onToggleReports}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '11px 14px',
            borderRadius: 8,
            cursor: 'pointer',
            background: reportsActive ? 'rgba(255,255,255,0.14)' : 'transparent',
            justifyContent: expanded ? 'flex-start' : 'center',
          }}
        >
          <NavIcon
            name="reports"
            color={reportsActive ? '#ffffff' : 'rgba(255,255,255,0.68)'}
            accent={theme.accent}
          />
          {expanded && (
            <>
              <span
                style={{
                  fontSize: 13.5,
                  fontWeight: reportsActive ? 700 : 500,
                  color: reportsActive ? '#ffffff' : 'rgba(255,255,255,0.68)',
                  whiteSpace: 'nowrap',
                  flex: 1,
                }}
              >
                ออกรายงาน
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: reportsActive ? '#ffffff' : 'rgba(255,255,255,0.68)',
                }}
              >
                {reportsOpen ? '▾' : '▸'}
              </span>
            </>
          )}
        </div>

        {reportsOpen && REPORT_NAV.map(renderItem)}
      </div>

      {/* Signed-in user + logout */}
      <div
        style={{
          padding: '14px 22px 0',
          borderTop: '1px solid rgba(255,255,255,0.12)',
          marginTop: 10,
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 600,
              color: '#fff',
              flexShrink: 0,
            }}
          >
            จท
          </div>
          {expanded && (
            <div style={{ minWidth: 0, whiteSpace: 'nowrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: '#3ecf6e',
                    flexShrink: 0,
                  }}
                />
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: '#fff',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {userName}
                </div>
              </div>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.5)' }}>{roleLabel}</div>
            </div>
          )}
        </div>

        <div
          onClick={() => setConfirmLogout(true)}
          title="ออกจากระบบ"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginTop: 10,
            padding: '9px 0',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <LogoutIcon />
          </div>
          {expanded && (
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.68)',
                whiteSpace: 'nowrap',
              }}
            >
              ออกจากระบบ
            </div>
          )}
        </div>
      </div>
    </div>

    {confirmLogout && (
      <Modal width={360} onBackdropClick={() => setConfirmLogout(false)}>
        {/* Extra top padding stands in for the icon that used to sit here, so
            the title is not pressed against the top edge of the card. */}
        <div style={{ padding: '10px 4px 0', textAlign: 'center' }}>
          <div style={{ fontSize: 16.5, fontWeight: 700, color: theme.textDark }}>
            ยืนยันการออกจากระบบ
          </div>
          <div
            style={{
              fontSize: 13.5,
              lineHeight: 1.7,
              color: theme.textMuted,
              marginTop: 10,
              marginBottom: 26,
            }}
          >
            ต้องการออกจากระบบใช่หรือไม่?
          </div>

          {/* Equal columns rather than a right-aligned row: with the text
              centred, two balanced buttons read as one deliberate block. */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Button
              variant="ghost"
              onClick={() => setConfirmLogout(false)}
              style={{ textAlign: 'center', padding: '11px 0' }}
            >
              ยกเลิก
            </Button>
            <Button
              onClick={() => {
                setConfirmLogout(false);
                onLogout();
              }}
              style={{ textAlign: 'center', padding: '11px 0' }}
            >
              ตกลง
            </Button>
          </div>
        </div>
      </Modal>
    )}
    </>
  );
}
