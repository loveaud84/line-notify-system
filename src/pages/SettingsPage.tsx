import { useEffect, useState } from 'react';
import { OA_NAME, theme } from '../theme';
import { SYSTEM_ADMINS } from '../data/seed';
import { verifyConnection } from '../lib/lineApi';
import { useStore } from '../store';
import { Button, Card, InlineMessage, SectionTitle } from '../components/ui';

interface ConnectionState {
  checking: boolean;
  ok: boolean;
  mock: boolean;
  label: string;
  checkedAt: string;
}

export function SettingsPage() {
  const { reload } = useStore();

  const [savedMessage, setSavedMessage] = useState(false);
  const [connection, setConnection] = useState<ConnectionState>({
    checking: true,
    ok: false,
    mock: false,
    label: 'กำลังตรวจสอบการเชื่อมต่อ...',
    checkedAt: '',
  });

  const runCheck = async () => {
    setConnection((c) => ({ ...c, checking: true, label: 'กำลังตรวจสอบการเชื่อมต่อ...' }));
    const result = await verifyConnection();
    const now = new Date();
    setConnection({
      checking: false,
      ok: result.ok,
      mock: result.mock,
      label: result.ok
        ? result.mock
          ? 'โหมดจำลอง — ยังไม่ได้ตั้งค่า Channel Access Token'
          : `เชื่อมต่อ LINE สำเร็จ${result.displayName ? ` · ${result.displayName}` : ''}`
        : (result.message ?? 'เชื่อมต่อ LINE ไม่สำเร็จ'),
      checkedAt: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} น.`,
    });
  };

  // Check once on mount so the status dot reflects reality, not a hardcoded value.
  useEffect(() => {
    void runCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusColor = connection.checking
    ? theme.textMuted
    : connection.ok
      ? connection.mock
        ? theme.warning
        : theme.success
      : theme.danger;

  const readOnlyBox = (value: string, mono = false) => (
    <div
      style={{
        fontSize: mono ? 13 : 13.5,
        fontFamily: mono ? 'monospace' : 'inherit',
        padding: '11px 14px',
        border: `1px solid ${theme.border}`,
        borderRadius: 7,
        background: theme.bg,
        color: mono ? theme.textMuted : theme.textDark,
        wordBreak: 'break-all',
      }}
    >
      {value}
    </div>
  );

  return (
    <div style={{ maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <Card padding={24}>
        <SectionTitle>การเชื่อมต่อ LINE Official Account</SectionTitle>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0 20px', flexWrap: 'wrap' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: statusColor }}>
            {connection.label}
          </span>
          {connection.checkedAt && (
            <span style={{ fontSize: 12.5, color: theme.textMuted }}>
              · ทดสอบล่าสุด {connection.checkedAt}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div
              style={{ fontSize: 12.5, fontWeight: 600, color: theme.textDark, marginBottom: 6 }}
            >
              ชื่อบัญชี Official Account
            </div>
            {readOnlyBox(OA_NAME)}
          </div>

          <div>
            <div
              style={{ fontSize: 12.5, fontWeight: 600, color: theme.textDark, marginBottom: 6 }}
            >
              Channel Access Token
            </div>
            {/* Deliberately not editable here. The token lives only in the
                server's .env and is never sent to the browser, so there is
                nothing to show and nothing to leak from this page. */}
            {readOnlyBox('•••••••••••• เก็บไว้ฝั่งเซิร์ฟเวอร์เท่านั้น ••••••••••••', true)}
            <div
              style={{
                fontSize: 11.5,
                lineHeight: 1.7,
                color: theme.textMuted,
                marginTop: 8,
                background: theme.bg,
                borderRadius: 7,
                padding: '10px 12px',
              }}
            >
              token ถูกตั้งค่าที่ <code>LINE_CHANNEL_ACCESS_TOKEN</code> ในไฟล์ <code>.env</code>{' '}
              ของเซิร์ฟเวอร์ และไม่เคยถูกส่งมายังเบราว์เซอร์
              จึงไม่มีช่องให้แก้หรืออ่านค่าจากหน้านี้
            </div>
          </div>

          <div>
            <div
              style={{ fontSize: 12.5, fontWeight: 600, color: theme.textDark, marginBottom: 6 }}
            >
              Channel Secret
            </div>
            {readOnlyBox('••••••••••••••••••••••••••••', true)}
          </div>

          <div>
            <div
              style={{ fontSize: 12.5, fontWeight: 600, color: theme.textDark, marginBottom: 6 }}
            >
              Webhook URL
            </div>
            {readOnlyBox('https://notify.reg.university.ac.th/webhook/line', true)}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <Button onClick={() => void runCheck()} style={{ padding: '11px 20px' }}>
            {connection.checking ? 'กำลังทดสอบ...' : 'ทดสอบการเชื่อมต่อ'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setSavedMessage(true);
              window.setTimeout(() => setSavedMessage(false), 2500);
              void runCheck();
            }}
            style={{ padding: '11px 20px' }}
          >
            บันทึกการตั้งค่า
          </Button>
        </div>

        {savedMessage && <InlineMessage tone="success">บันทึกการตั้งค่าเรียบร้อยแล้ว</InlineMessage>}
      </Card>

      <Card padding={24}>
        <SectionTitle>ผู้ดูแลระบบที่มีสิทธิ์เข้าถึง</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {SYSTEM_ADMINS.map((admin) => (
            <div
              key={admin.email}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '11px 0',
                borderBottom: `1px solid ${theme.border}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: theme.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: theme.textDark,
                  }}
                >
                  {admin.initials}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: theme.textDark }}>
                    {admin.name}
                  </div>
                  <div style={{ fontSize: 11.5, color: theme.textMuted }}>{admin.email}</div>
                </div>
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: theme.textMuted,
                  padding: '4px 10px',
                  borderRadius: 12,
                  background: theme.bg,
                }}
              >
                {admin.role}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card padding={24}>
        <SectionTitle>ฐานข้อมูล</SectionTitle>
        <div style={{ fontSize: 12.5, lineHeight: 1.7, color: theme.textMuted, marginBottom: 16 }}>
          ข้อมูลผู้ใช้งาน นักศึกษา สาขาวิชา การจัดกลุ่ม และประวัติการส่ง
          ถูกบันทึกไว้ใน PostgreSQL ไม่ได้อยู่ในเบราว์เซอร์
          จึงใช้งานร่วมกันได้จากหลายเครื่องและไม่หายเมื่อล้างข้อมูลเบราว์เซอร์
          <br />
          หากต้องการล้างและใส่ข้อมูลตัวอย่างใหม่ ให้รันคำสั่ง{' '}
          <code>npm run db:reset</code> ในเทอร์มินัล
        </div>
        <Button variant="ghost" onClick={() => void reload()} style={{ display: 'inline-block' }}>
          โหลดข้อมูลจากฐานข้อมูลใหม่
        </Button>
      </Card>
    </div>
  );
}
