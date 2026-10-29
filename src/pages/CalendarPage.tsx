import { useMemo, useState } from 'react';
import { theme } from '../theme';
import type { HistoryEntry } from '../types';
import { THAI_MONTHS, THAI_WEEKDAY_INITIALS, formatThaiShort, toBuddhistYear } from '../lib/thai';
import { Card, CardTitle } from '../components/ui';

export function CalendarPage({ historyLog }: { historyLog: HistoryEntry[] }) {
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  // null means "no explicit pick yet" — falls back to today, or the 1st.
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
  const activeDay = selectedDay ?? (isCurrentMonth ? today.getDate() : 1);

  /** Sends grouped by day-of-month, for the month currently in view. */
  const bookingsByDay = useMemo(() => {
    const map = new Map<number, HistoryEntry[]>();
    for (const entry of historyLog) {
      const sent = new Date(entry.sentAt);
      // Now that the year is stored, browsing to another year shows no
      // spurious matches — the design could only compare day and month.
      if (sent.getFullYear() !== year || sent.getMonth() !== month) continue;
      const day = sent.getDate();
      const existing = map.get(day);
      if (existing) existing.push(entry);
      else map.set(day, [entry]);
    }
    return map;
  }, [historyLog, year, month]);

  const bookingCount = [...bookingsByDay.values()].reduce((sum, list) => sum + list.length, 0);
  const selectedBookings = bookingsByDay.get(activeDay) ?? [];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();

  const goPrevMonth = () => {
    setMonth((m) => (m === 0 ? 11 : m - 1));
    if (month === 0) setYear((y) => y - 1);
    setSelectedDay(null);
  };

  const goNextMonth = () => {
    setMonth((m) => (m === 11 ? 0 : m + 1));
    if (month === 11) setYear((y) => y + 1);
    setSelectedDay(null);
  };

  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDay(today.getDate());
  };

  const monthArrow = (glyph: string, onClick: () => void) => (
    <div
      onClick={onClick}
      style={{
        width: 30,
        height: 30,
        borderRadius: 7,
        border: `1px solid ${theme.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        fontSize: 14,
        color: theme.textDark,
        userSelect: 'none',
      }}
    >
      {glyph}
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 18, alignItems: 'start' }}>
      <Card padding={22}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {monthArrow('‹', goPrevMonth)}
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: theme.textDark,
                minWidth: 150,
                textAlign: 'center',
              }}
            >
              {THAI_MONTHS[month]} {toBuddhistYear(year)}
            </div>
            {monthArrow('›', goNextMonth)}
            <div
              onClick={goToday}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: theme.primary,
                padding: '7px 14px',
                borderRadius: 7,
                border: `1px solid ${theme.border}`,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                userSelect: 'none',
              }}
            >
              วันนี้
            </div>
          </div>
        </div>

        <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 6 }}>
          {bookingCount} รายการที่มีกำหนดส่งในเดือนนี้
        </div>

        <div
          style={{
            display: 'flex',
            gap: 16,
            flexWrap: 'wrap',
            fontSize: 12,
            color: theme.textMuted,
            marginBottom: 14,
            paddingBottom: 14,
            borderBottom: `1px solid ${theme.border}`,
          }}
        >
          <div>
            ส่งล่าสุด:{' '}
            <span style={{ fontWeight: 600, color: theme.textDark }}>
              {historyLog[0] ? formatThaiShort(historyLog[0].sentAt) : '—'}
            </span>
          </div>
          <div>
            ส่งทั้งหมด:{' '}
            <span style={{ fontWeight: 600, color: theme.textDark }}>
              {historyLog.length} ข้อความ
            </span>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7,1fr)',
            gap: 6,
            marginBottom: 6,
          }}
        >
          {THAI_WEEKDAY_INITIALS.map((label) => (
            <div
              key={label}
              style={{
                textAlign: 'center',
                fontSize: 11.5,
                fontWeight: 700,
                color: theme.textMuted,
                padding: '4px 0',
              }}
            >
              {label}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6 }}>
          {/* Blank cells so the 1st lands on the correct weekday. */}
          {Array.from({ length: firstWeekday }, (_, i) => (
            <div key={`pad-${i}`} style={{ aspectRatio: '1' }} />
          ))}

          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const hasBooking = bookingsByDay.has(day);
            const selected = day === activeDay;
            const isToday = isCurrentMonth && day === today.getDate();

            return (
              <div
                key={day}
                onClick={() => setSelectedDay(day)}
                style={{
                  aspectRatio: '1',
                  borderRadius: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                  cursor: 'pointer',
                  background: selected ? theme.primary : hasBooking ? theme.bg : '#fff',
                  border: `1px solid ${
                    selected ? theme.primary : isToday ? theme.primary : theme.border
                  }`,
                  userSelect: 'none',
                }}
              >
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: selected ? '#fff' : theme.textDark,
                  }}
                >
                  {day}
                </span>
                {hasBooking && (
                  <div
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: selected ? '#fff' : theme.primary,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card padding={22}>
        <CardTitle style={{ marginBottom: 4 }}>การจองส่งข้อความ</CardTitle>
        <div style={{ fontSize: 12.5, color: theme.textMuted, marginBottom: 18 }}>
          วันที่ {activeDay} {THAI_MONTHS[month]} {toBuddhistYear(year)}
        </div>

        {selectedBookings.length === 0 && (
          <div
            style={{
              padding: '28px 12px',
              textAlign: 'center',
              fontSize: 13,
              color: theme.textMuted,
            }}
          >
            ไม่มีการส่งข้อความในวันนี้
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {selectedBookings.map((booking) => {
            const statusColor = booking.success ? theme.success : theme.danger;
            return (
              <div
                key={booking.id}
                style={{ border: `1px solid ${theme.border}`, borderRadius: 8, padding: 14 }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 8,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: theme.textDark }}>
                    {booking.template}
                  </div>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: statusColor,
                      }}
                    />
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: statusColor }}>
                      {booking.success ? 'สำเร็จ' : 'ล้มเหลว'}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 6 }}>
                  {formatThaiShort(booking.sentAt)} · {booking.group} · {booking.count} คน
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
