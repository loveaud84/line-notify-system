import { useMemo } from 'react';
import { theme } from '../theme';
import { THAI_WEEKDAY_INITIALS, formatThaiShort, isSameDay } from '../lib/thai';
import { useStore } from '../store';
import { Card, CardTitle } from '../components/ui';

export function DashboardPage() {
  const { data } = useStore();

  /**
   * Sends made today, counted from the history log, with a real comparison
   * against yesterday. Counts send operations — one row per announcement —
   * rather than individual recipients.
   */
  const todayStat = useMemo(() => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const today = data.historyLog.filter((h) => isSameDay(new Date(h.sentAt), now));
    const before = data.historyLog.filter((h) => isSameDay(new Date(h.sentAt), yesterday));
    const recipients = today.reduce((sum, h) => sum + h.count, 0);

    let delta: string;
    let tone: 'success' | 'muted';
    if (today.length === 0) {
      delta = 'ยังไม่มีการส่งวันนี้';
      tone = 'muted';
    } else if (before.length === 0) {
      // No baseline to divide by, so report the raw change instead of a ratio.
      delta = `+${today.length} ครั้ง จากเมื่อวานที่ไม่มีการส่ง`;
      tone = 'success';
    } else {
      const change = Math.round(((today.length - before.length) / before.length) * 100);
      delta =
        change === 0
          ? 'เท่ากับเมื่อวาน'
          : `${change > 0 ? '+' : ''}${change}% จากเมื่อวาน`;
      tone = change >= 0 ? 'success' : 'muted';
    }

    return {
      label: 'ข้อความส่งวันนี้',
      value: today.length.toLocaleString(),
      delta: today.length > 0 ? `${delta} · ผู้รับรวม ${recipients.toLocaleString()} คน` : delta,
      tone,
    };
  }, [data.historyLog]);

  /**
   * Total recipients: every group's membership added together.
   *
   * A student assigned to two groups is counted twice, because that is how many
   * messages a broadcast to all groups would produce. The distinct headcount is
   * shown underneath so the difference is visible rather than hidden.
   */
  const recipientStat = useMemo(() => {
    const perGroup = new Map<string, number>();
    for (const g of data.studentGroups) {
      perGroup.set(g.group, (perGroup.get(g.group) ?? 0) + 1);
    }

    const total = [...perGroup.values()].reduce((sum, n) => sum + n, 0);
    const distinct = new Set(data.studentGroups.map((g) => g.studentId)).size;

    const parts = [`จาก ${perGroup.size} กลุ่ม`];
    if (distinct !== total) parts.push(`ไม่ซ้ำ ${distinct.toLocaleString()} คน`);

    return {
      label: 'ผู้รับทั้งหมด',
      value: total.toLocaleString(),
      delta: perGroup.size === 0 ? 'ยังไม่มีการจัดกลุ่มนักศึกษา' : parts.join(' · '),
      tone: 'muted' as const,
    };
  }, [data.studentGroups]);

  /** Every send ever recorded, split by outcome. */
  const totalStat = useMemo(() => {
    const total = data.historyLog.length;
    const succeeded = data.historyLog.filter((h) => h.success).length;
    const failed = total - succeeded;

    return {
      label: 'ข้อความส่งทั้งหมด',
      value: total.toLocaleString(),
      delta:
        total === 0
          ? 'ยังไม่มีประวัติการส่ง'
          : `สำเร็จ ${succeeded.toLocaleString()} · ล้มเหลว ${failed.toLocaleString()}`,
      tone: 'muted' as const,
    };
  }, [data.historyLog]);

  /**
   * Sends per day for the last seven days, oldest first and ending today.
   *
   * Days are built from the calendar rather than from the log, so a day with no
   * sends still gets its own empty column instead of being skipped.
   */
  const weeklySeries = useMemo(() => {
    const today = new Date();
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (6 - i));
      return {
        date,
        label: `${THAI_WEEKDAY_INITIALS[date.getDay()]}.`,
        isToday: i === 6,
        count: data.historyLog.filter((h) => isSameDay(new Date(h.sentAt), date)).length,
      };
    });

    // Floor of 1 keeps the height calculation safe on a week with no sends.
    const max = Math.max(1, ...days.map((d) => d.count));
    return days.map((d) => ({ ...d, height: `${Math.round((d.count / max) * 100)}%` }));
  }, [data.historyLog]);

  /**
   * Share of all recorded sends that succeeded.
   *
   * Rounded to one decimal for display but kept exact for the ring angle, so a
   * value that rounds to 100% still leaves a visible gap when something failed.
   */
  const successRate = useMemo(() => {
    const total = data.historyLog.length;
    const succeeded = data.historyLog.filter((h) => h.success).length;
    const exact = total === 0 ? 0 : (succeeded / total) * 100;

    return {
      total,
      succeeded,
      label: total === 0 ? '—' : `${Number(exact.toFixed(1))}%`,
      ring: `conic-gradient(${theme.primary} ${exact * 3.6}deg, ${theme.border} 0deg)`,
      caption:
        total === 0
          ? 'ยังไม่มีประวัติการส่ง'
          : `จาก ${total.toLocaleString()} ข้อความทั้งหมด · สำเร็จ ${succeeded.toLocaleString()}`,
    };
  }, [data.historyLog]);

  /**
   * The five most recent sends. The API already returns the log newest-first,
   * so this only has to take the head of the list.
   */
  const recentActivity = data.historyLog.slice(0, 5);

  const stats = [todayStat, recipientStat, totalStat];

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${stats.length}, 1fr)`,
          gap: 18,
          marginBottom: 24,
        }}
      >
        {stats.map((stat) => (
          <Card key={stat.label}>
            <div
              style={{
                fontSize: 12.5,
                color: theme.textMuted,
                fontWeight: 500,
                marginBottom: 10,
              }}
            >
              {stat.label}
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: theme.textDark }}>{stat.value}</div>
            <div
              style={{
                fontSize: 12,
                color: stat.tone === 'success' ? theme.success : theme.textMuted,
                marginTop: 6,
                fontWeight: 600,
              }}
            >
              {stat.delta}
            </div>
          </Card>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: 18,
          marginBottom: 18,
        }}
      >
        <Card padding={24}>
          <CardTitle style={{ marginBottom: 20 }}>จำนวนข้อความที่ส่งใน 7 วันล่าสุด</CardTitle>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 180 }}>
            {weeklySeries.map((day) => (
              <div
                key={day.date.toISOString().slice(0, 10)}
                title={day.date.toLocaleDateString('th-TH')}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  height: '100%',
                  justifyContent: 'flex-end',
                }}
              >
                <div style={{ fontSize: 11.5, fontWeight: 700, color: theme.textDark }}>
                  {day.count}
                </div>
                <div
                  style={{
                    width: '100%',
                    maxWidth: 36,
                    borderRadius: '5px 5px 0 0',
                    background: day.isToday ? theme.accent : theme.primary,
                    height: day.height,
                  }}
                />
                <div
                  style={{
                    fontSize: 11,
                    color: day.isToday ? theme.textDark : theme.textMuted,
                    fontWeight: day.isToday ? 700 : 400,
                  }}
                >
                  {day.label}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card padding={24} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <CardTitle style={{ alignSelf: 'flex-start', marginBottom: 14 }}>อัตราส่งสำเร็จ</CardTitle>
          <div
            style={{
              width: 150,
              height: 150,
              borderRadius: '50%',
              background: successRate.ring,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '10px 0',
            }}
          >
            <div
              style={{
                width: 112,
                height: 112,
                borderRadius: '50%',
                background: '#fff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div style={{ fontSize: 26, fontWeight: 700, color: theme.textDark }}>
                {successRate.label}
              </div>
              <div style={{ fontSize: 11, color: theme.textMuted }}>สำเร็จ</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: theme.textMuted }}>
            {successRate.caption}
          </div>
        </Card>
      </div>

      <Card padding={22}>
        <CardTitle style={{ marginBottom: 16 }}>กิจกรรมล่าสุด</CardTitle>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {recentActivity.length === 0 && (
            <div
              style={{
                padding: '28px 0',
                textAlign: 'center',
                fontSize: 13,
                color: theme.textMuted,
              }}
            >
              ยังไม่มีกิจกรรมการส่งข้อความ
            </div>
          )}
          {recentActivity.map((row) => (
            <div
              key={row.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 0',
                borderBottom: `1px solid ${theme.border}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: row.success ? theme.success : theme.danger,
                    flexShrink: 0,
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: theme.textDark,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {row.template}
                  </div>
                  <div style={{ fontSize: 11.5, color: theme.textMuted, marginTop: 2 }}>
                    {row.group} · {row.count} คน
                  </div>
                </div>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: theme.textMuted,
                  flexShrink: 0,
                  marginLeft: 10,
                }}
              >
                {formatThaiShort(row.sentAt)}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
