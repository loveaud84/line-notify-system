import { useMemo, useState } from 'react';
import { theme } from '../theme';
import { useStore } from '../store';
import {
  Card,
  CardTitle,
  Cell,
  EmptyRow,
  StatusDot,
  TableHead,
  TableRow,
} from '../components/ui';

const COLUMNS = '2fr 1.3fr 1.3fr 1fr';

export function RecipientsPage() {
  const { data } = useStore();

  /** Members per group name, counted from the real assignments. */
  const groupCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const g of data.studentGroups) counts.set(g.group, (counts.get(g.group) ?? 0) + 1);
    return counts;
  }, [data.studentGroups]);

  const assignedGroups = useMemo(
    () => [...groupCounts.entries()].map(([name, count]) => ({ name, count })),
    [groupCounts],
  );

  const [selectedGroup, setSelectedGroup] = useState<string | null>(
    assignedGroups[0]?.name ?? null,
  );

  const activeGroup = selectedGroup ?? assignedGroups[0]?.name ?? '';

  /** Students in the selected group, joined to their student record. */
  const recipients = useMemo(() => {
    const idsInGroup = data.studentGroups
      .filter((g) => g.group === activeGroup)
      .map((g) => g.studentId);

    return idsInGroup.map((studentId) => {
      const student = data.students.find((s) => s.studentId === studentId);
      return {
        studentId,
        name: student ? `${student.prefix}${student.firstLast}` : '(ไม่พบข้อมูลนักศึกษา)',
        phone: student?.phone ?? '—',
        // "Connected" means LINE confirmed the student added the OA, not merely
        // that a uid was typed in — an unverified uid may not be reachable.
        connected: Boolean(student?.lineConnectedAt),
      };
    });
  }, [data.studentGroups, data.students, activeGroup]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20, alignItems: 'start' }}>
      <Card padding={18}>
        <div
          style={{ fontSize: 13.5, fontWeight: 700, color: theme.textDark, marginBottom: 12 }}
        >
          กลุ่มผู้รับ
        </div>

        {assignedGroups.map((group) => {
          const active = group.name === activeGroup;
          return (
            <div
              key={group.name}
              onClick={() => setSelectedGroup(group.name)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '11px 10px',
                borderRadius: 7,
                background: active ? theme.bg : 'transparent',
                cursor: 'pointer',
                marginBottom: 2,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: active ? theme.primary : theme.textDark,
                  }}
                >
                  {group.name}
                </div>
                <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>
                  จากการจัดกลุ่มนักศึกษา
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: theme.textMuted }}>
                {group.count}
              </div>
            </div>
          );
        })}
      </Card>

      <Card>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <CardTitle
            style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flex: 1,
              minWidth: 180,
            }}
          >
            รายชื่อผู้รับ — {activeGroup || 'ยังไม่ได้เลือกกลุ่ม'}
          </CardTitle>
        </div>

        <TableHead
          template={COLUMNS}
          columns={['ชื่อ-นามสกุล', 'รหัสนักศึกษา', 'เบอร์โทร / LINE', 'สถานะ']}
        />

        {recipients.length === 0 && (
          <EmptyRow>ยังไม่มีนักศึกษาในกลุ่มนี้ — เพิ่มได้ที่หน้า "จัดกลุ่มนักศึกษา"</EmptyRow>
        )}

        {recipients.map((r) => (
          <TableRow key={r.studentId} template={COLUMNS}>
            <Cell bold>{r.name}</Cell>
            <Cell muted>{r.studentId}</Cell>
            <Cell muted>{r.phone}</Cell>
            <StatusDot
              color={r.connected ? theme.success : '#b5651d'}
              label={r.connected ? 'เชื่อมต่อแล้ว' : 'ยังไม่เชื่อมต่อ'}
            />
          </TableRow>
        ))}
      </Card>
    </div>
  );
}
