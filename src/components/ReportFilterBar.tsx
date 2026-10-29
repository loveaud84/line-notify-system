import type { ReactNode } from 'react';
import { theme } from '../theme';
import { Button } from './ui';

/**
 * Shared action row for the three report pages.
 *
 * Report filters are deliberately deferred: the user edits drafts and presses
 * ค้นหา to apply them, unlike the management pages which filter as you type.
 */
export function ReportFilterBar({
  onApply,
  onClear,
  resultLabel,
  onExport,
}: {
  onApply: () => void;
  onClear: () => void;
  resultLabel: ReactNode;
  onExport: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        flexWrap: 'wrap',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Button onClick={onApply} style={{ padding: '9px 20px' }}>
          ค้นหา
        </Button>
        <Button variant="ghost" onClick={onClear} style={{ padding: '9px 16px' }}>
          ล้างตัวกรอง
        </Button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 13, color: theme.textMuted, whiteSpace: 'nowrap' }}>
          {resultLabel}
        </div>
        <Button onClick={onExport} style={{ padding: '9px 16px', fontSize: 12.5 }}>
          ออกรายงาน (Excel)
        </Button>
      </div>
    </div>
  );
}
