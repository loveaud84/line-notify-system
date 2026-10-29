import { useEffect, useRef, useState } from 'react';
import { theme } from '../theme';
import type { HistoryEntry } from '../types';
import { formatThaiShort, isSameDay } from '../lib/thai';
import { BellIcon, CalendarIcon } from './NavIcons';

/** Entries sent today. */
function todaysEntries(log: HistoryEntry[], today: Date): HistoryEntry[] {
  return log.filter((h) => isSameDay(new Date(h.sentAt), today));
}

/** Failed sends from the last seven days — the "still outstanding" list. */
function unsentThisWeek(log: HistoryEntry[], today: Date): HistoryEntry[] {
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  return log.filter((h) => {
    if (h.success) return false;
    const when = new Date(h.sentAt);
    return when >= weekAgo && when <= today;
  });
}

export function TopBar({
  title,
  subtitle,
  historyLog,
  onOpenCalendar,
}: {
  title: string;
  subtitle: string;
  historyLog: HistoryEntry[];
  onOpenCalendar: () => void;
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Dismiss the notification panel on any click outside it.
  useEffect(() => {
    if (!panelOpen) return;
    const handler = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [panelOpen]);

  const today = new Date();
  const todayItems = todaysEntries(historyLog, today);
  const unsentItems = unsentThisWeek(historyLog, today);
  const hasAlerts = todayItems.length > 0 || unsentItems.length > 0;

  const iconButton = (onClick: () => void, children: React.ReactNode) => (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        width: 36,
        height: 36,
        borderRadius: 8,
        background: theme.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
    >
      {children}
    </div>
  );

  return (
    <div
      style={{
        height: 68,
        flexShrink: 0,
        background: '#fff',
        borderBottom: `1px solid ${theme.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        position: 'sticky',
        top: 0,
        zIndex: 5,
      }}
    >
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, color: theme.textDark }}>{title}</div>
        <div style={{ fontSize: 12.5, color: theme.textMuted, marginTop: 2 }}>{subtitle}</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        {iconButton(onOpenCalendar, <CalendarIcon color={theme.textMuted} />)}

        <div style={{ position: 'relative' }} ref={panelRef}>
          {iconButton(
            () => setPanelOpen((open) => !open),
            <>
              <BellIcon color={theme.textMuted} />
              {hasAlerts && (
                <div
                  style={{
                    position: 'absolute',
                    top: 5,
                    right: 6,
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#d64545',
                    border: '1.5px solid #fff',
                  }}
                />
              )}
            </>,
          )}

          {panelOpen && (
            <div
              style={{
                position: 'absolute',
                top: 44,
                right: 0,
                width: 320,
                background: '#fff',
                border: `1px solid ${theme.border}`,
                borderRadius: 10,
                boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
                zIndex: 60,
                padding: 16,
              }}
            >
              <div
                style={{ fontSize: 14, fontWeight: 700, color: theme.textDark, marginBottom: 6 }}
              >
                ข้อความที่จะส่งวันนี้ ({todayItems.length})
              </div>
              {todayItems.length === 0 && (
                <div style={{ fontSize: 12.5, color: theme.textMuted, padding: '6px 0 10px' }}>
                  ไม่มีข้อความที่กำหนดส่งวันนี้
                </div>
              )}
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}
              >
                {todayItems.map((n) => (
                  <div
                    key={n.id}
                    style={{ border: `1px solid ${theme.border}`, borderRadius: 7, padding: '9px 11px' }}
                  >
                    <div
                      style={{
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: theme.textDark,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {n.template}
                    </div>
                    <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>
                      {formatThaiShort(n.sentAt)} · {n.group}
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: theme.textDark,
                  marginBottom: 6,
                  paddingTop: 8,
                  borderTop: `1px solid ${theme.border}`,
                }}
              >
                ยังไม่ได้ส่งในสัปดาห์นี้ ({unsentItems.length})
              </div>
              {unsentItems.length === 0 && (
                <div style={{ fontSize: 12.5, color: theme.textMuted, padding: '6px 0' }}>
                  ไม่มีข้อความค้างส่งในสัปดาห์นี้
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {unsentItems.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      border: '1px solid rgba(192,57,43,0.3)',
                      borderRadius: 7,
                      padding: '9px 11px',
                      background: 'rgba(192,57,43,0.04)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: theme.textDark,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {n.template}
                    </div>
                    <div style={{ fontSize: 11, color: theme.danger, marginTop: 2 }}>
                      {formatThaiShort(n.sentAt)} · {n.group} · ล้มเหลว
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
