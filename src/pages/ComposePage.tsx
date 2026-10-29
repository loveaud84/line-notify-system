import { useMemo, useState } from 'react';
import { OA_NAME, theme } from '../theme';
import type { TabId } from '../types';
import { MSG_TYPES } from '../data/seed';
import { formatThaiDate } from '../lib/thai';
import { sendGroupMessage } from '../lib/lineApi';
import { useStore } from '../store';
import { Button, Card, Input, Select, TextArea } from '../components/ui';

const DRAFT_KEY = 'lineNotify.draft.v1';

export function ComposePage({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const { data, reload } = useStore();

  /** Distinct group names with their member counts, derived from assignments. */
  const groupCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const g of data.studentGroups) {
      counts.set(g.group, (counts.get(g.group) ?? 0) + 1);
    }
    return counts;
  }, [data.studentGroups]);

  const groupNames = [...groupCounts.keys()];

  const [msgTypeIndex, setMsgTypeIndex] = useState(0);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sendNow, setSendNow] = useState(true);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [draftSaved, setDraftSaved] = useState(false);

  // Fall back to the first group so the form is usable before any selection.
  const activeGroup = groupCounts.has(selectedGroup) ? selectedGroup : (groupNames[0] ?? '');
  const recipientCount = groupCounts.get(activeGroup) ?? 0;

  /**
   * How many group members actually have a LINE uid.
   *
   * The server skips anyone without one, so showing this up front avoids a
   * surprise when the send reaches fewer people than the group size.
   */
  const reachableCount = useMemo(() => {
    const uids = new Set<string>();
    for (const g of data.studentGroups) {
      if (g.group !== activeGroup) continue;
      const uid = data.students.find((s) => s.studentId === g.studentId)?.lineUid?.trim();
      if (uid) uids.add(uid);
    }
    return uids.size;
  }, [data.studentGroups, data.students, activeGroup]);

  const unreachableCount = recipientCount - reachableCount;

  const scheduledDisplay = formatThaiDate(scheduledDate);
  const timingSummary = sendNow
    ? 'ส่งทันทีเมื่อกดยืนยัน'
    : scheduledDisplay && scheduledTime
      ? `ตั้งเวลาส่งวันที่ ${scheduledDisplay} เวลา ${scheduledTime} น.`
      : 'กรุณาเลือกวันและเวลาที่ต้องการส่ง';

  const saveDraft = () => {
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          title,
          text: body,
          group: activeGroup,
          msgType: msgTypeIndex,
          sendTiming: sendNow ? 'now' : 'scheduled',
          scheduledDate,
          scheduledTime,
        }),
      );
      setDraftSaved(true);
      window.setTimeout(() => setDraftSaved(false), 2500);
    } catch {
      setError('ไม่สามารถบันทึกร่างได้ — พื้นที่จัดเก็บของเบราว์เซอร์เต็มหรือถูกปิดใช้งาน');
    }
  };

  const send = async () => {
    if (sending) return;

    if (!body.trim()) {
      setError('กรุณาระบุเนื้อหาข้อความก่อนส่ง');
      return;
    }
    if (!activeGroup) {
      setError('กรุณาเลือกกลุ่มผู้รับ');
      return;
    }
    if (!sendNow && (!scheduledDate || !scheduledTime)) {
      setError('กรุณาเลือกวันและเวลาที่ต้องการส่ง');
      return;
    }

    setSending(true);
    setError('');

    // Only the group name is sent. The server resolves every LINE uid in that
    // group, dedupes them, delivers by multicast and writes the history entry,
    // so the recorded recipient count matches who was actually addressed.
    const result = await sendGroupMessage(
      {
        group: activeGroup,
        title: title.trim(),
        text: body.trim(),
        msgType: MSG_TYPES[msgTypeIndex] ?? MSG_TYPES[0],
      },
    );

    // Pick up the history row the server just wrote.
    await reload();
    setSending(false);

    if (result.ok) {
      onNavigate('history');
    } else {
      setError(result.message);
    }
  };

  const radio = (selected: boolean, label: string, onClick: () => void) => (
    <div
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
    >
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: '50%',
          border: `2px solid ${selected ? theme.primary : theme.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {selected && (
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: theme.primary }} />
        )}
      </div>
      <span style={{ fontSize: 13.5, color: theme.textDark, fontWeight: selected ? 700 : 500 }}>
        {label}
      </span>
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 20, alignItems: 'start' }}>
      <Card padding={24} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <div
            style={{ fontSize: 12.5, fontWeight: 600, color: theme.textDark, marginBottom: 8 }}
          >
            ประเภทข้อความ
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {MSG_TYPES.map((label, i) => {
              const active = msgTypeIndex === i;
              return (
                <div
                  key={label}
                  onClick={() => setMsgTypeIndex(i)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: 7,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: active ? theme.primary : '#fff',
                    color: active ? '#fff' : theme.textDark,
                    border: `1px solid ${active ? theme.primary : theme.border}`,
                  }}
                >
                  {label}
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div
            style={{ fontSize: 12.5, fontWeight: 600, color: theme.textDark, marginBottom: 8 }}
          >
            กลุ่มผู้รับ
          </div>
          {groupNames.length === 0 ? (
            <div
              style={{
                fontSize: 13,
                color: theme.textMuted,
                padding: '11px 14px',
                border: `1px solid ${theme.border}`,
                borderRadius: 7,
                background: theme.bg,
              }}
            >
              ยังไม่มีกลุ่มผู้รับ — สร้างกลุ่มได้ที่หน้า "จัดกลุ่มนักศึกษา"
            </div>
          ) : (
            <>
              <Select value={activeGroup} onChange={setSelectedGroup} options={groupNames} />
              <div style={{ fontSize: 11.5, color: theme.textMuted, marginTop: 6 }}>
                ผู้รับทั้งหมด {recipientCount.toLocaleString()} คน · ส่งได้จริง{' '}
                <span style={{ fontWeight: 700, color: theme.textDark }}>
                  {reachableCount.toLocaleString()}
                </span>{' '}
                คน
                {unreachableCount > 0 && (
                  <span style={{ color: theme.warning }}>
                    {' '}
                    (อีก {unreachableCount.toLocaleString()} คนยังไม่มี Uid LINE)
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        <div>
          <div
            style={{ fontSize: 12.5, fontWeight: 600, color: theme.textDark, marginBottom: 8 }}
          >
            หัวข้อ
          </div>
          <Input value={title} onChange={setTitle} placeholder="ระบุหัวข้อข้อความ" />
        </div>

        <div>
          <div
            style={{ fontSize: 12.5, fontWeight: 600, color: theme.textDark, marginBottom: 8 }}
          >
            เนื้อหาข้อความ
          </div>
          <TextArea
            value={body}
            onChange={(v) => {
              setBody(v);
              setError('');
            }}
            placeholder="พิมพ์เนื้อหาข้อความที่ต้องการส่ง"
          />
        </div>

        <div>
          <div
            style={{ fontSize: 12.5, fontWeight: 600, color: theme.textDark, marginBottom: 8 }}
          >
            วันที่ส่ง
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {radio(sendNow, 'ทันที', () => setSendNow(true))}
            {radio(!sendNow, 'เลือกวันเวลาที่ส่ง', () => setSendNow(false))}
            {!sendNow && (
              <div style={{ display: 'flex', gap: 12, marginLeft: 26, marginTop: 2 }}>
                <div>
                  <div style={{ fontSize: 11.5, color: theme.textMuted, marginBottom: 6 }}>
                    วันที่
                  </div>
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={setScheduledDate}
                    style={{ padding: '9px 12px', width: 'auto' }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 11.5, color: theme.textMuted, marginBottom: 6 }}>
                    เวลา
                  </div>
                  <Input
                    type="time"
                    value={scheduledTime}
                    onChange={setScheduledTime}
                    style={{ padding: '9px 12px', width: 'auto' }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ paddingTop: 12, borderTop: `1px solid ${theme.border}` }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: theme.textMuted }}>{timingSummary}</span>
              {draftSaved && (
                <span style={{ fontSize: 12, color: theme.success, fontWeight: 600 }}>
                  บันทึกร่างแล้ว
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="ghost" onClick={saveDraft} style={{ padding: '11px 18px' }}>
                บันทึกร่าง
              </Button>
              <Button onClick={() => void send()} style={{ padding: '11px 20px' }}>
                {sending ? 'กำลังส่ง...' : sendNow ? 'ส่งข้อความ' : 'ตั้งเวลาส่งข้อความ'}
              </Button>
            </div>
          </div>
          {error && (
            <div style={{ fontSize: 12, color: theme.danger, lineHeight: 1.6, marginTop: 10 }}>
              {error}
            </div>
          )}
        </div>
      </Card>

      {/* LINE chat preview */}
      <div style={{ position: 'sticky', top: 88 }}>
        <div
          style={{ fontSize: 12.5, fontWeight: 600, color: theme.textMuted, marginBottom: 10 }}
        >
          ตัวอย่างข้อความ
        </div>
        <div style={{ background: '#93AAD4', borderRadius: 16, padding: '20px 16px' }}>
          <div
            style={{
              maxWidth: 280,
              background: '#8EE386',
              borderRadius: 12,
              padding: '14px 16px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
              fontSize: 13,
              lineHeight: 1.65,
              color: '#333',
              whiteSpace: 'pre-line',
              minHeight: 24,
            }}
          >
            {title.trim() ? `${title.trim()}\n\n${body}` : body}
          </div>
          <div style={{ fontSize: 11, color: '#ffffff', marginTop: 6, paddingLeft: 4 }}>
            {OA_NAME.split(' ')[0]} · เมื่อสักครู่
          </div>
        </div>
      </div>
    </div>
  );
}
