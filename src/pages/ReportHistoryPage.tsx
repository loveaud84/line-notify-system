import { useMemo, useState } from 'react';
import { theme } from '../theme';
import type { HistoryEntry, MsgType } from '../types';
import { MSG_TYPES, PAGE_SIZE_OPTIONS } from '../data/seed';
import { downloadSpreadsheet, exportStamp } from '../lib/export';
import { formatThaiShort } from '../lib/thai';
import { usePagination } from '../lib/usePagination';
import { useStore } from '../store';
import { ReportFilterBar } from '../components/ReportFilterBar';
import {
  Button,
  Card,
  Cell,
  ConfirmDeleteModal,
  EmptyRow,
  Field,
  Input,
  Modal,
  ModalActions,
  ModalTitle,
  PaginationBar,
  RowAction,
  RowActions,
  Select,
  StatusDot,
  TableHead,
  TableRow,
} from '../components/ui';

const COLUMNS = '1fr 1.5fr 0.9fr 1fr 0.7fr 0.9fr 0.9fr';

const ALL_TYPES = 'ทุกประเภท';
const ALL_GROUPS = 'ทุกกลุ่ม';
const ALL_STATUSES = 'ทั้งหมด';

interface Filters {
  topic: string;
  msgType: string;
  group: string;
  status: string;
}

const EMPTY_FILTERS: Filters = {
  topic: '',
  msgType: ALL_TYPES,
  group: ALL_GROUPS,
  status: ALL_STATUSES,
};

export function ReportHistoryPage() {
  const { data, updateHistory, deleteHistory } = useStore();

  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);

  const [editDraft, setEditDraft] = useState<HistoryEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HistoryEntry | null>(null);

  const groupOptions = useMemo(
    () => [ALL_GROUPS, ...new Set(data.historyLog.map((h) => h.group))],
    [data.historyLog],
  );

  const filtered = useMemo(() => {
    const topic = applied.topic.trim().toLowerCase();
    return data.historyLog.filter(
      (h) =>
        (!topic || h.template.toLowerCase().includes(topic)) &&
        (applied.msgType === ALL_TYPES || h.msgType === applied.msgType) &&
        (applied.group === ALL_GROUPS || h.group === applied.group) &&
        (applied.status === ALL_STATUSES || (applied.status === 'สำเร็จ') === h.success),
    );
  }, [data.historyLog, applied]);

  const pagination = usePagination(filtered);

  const setField = (key: keyof Filters, value: string) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const exportReport = () => {
    downloadSpreadsheet(
      `รายงานประวัติการส่ง-${exportStamp()}`,
      ['วันที่/เวลา', 'หัวข้อ', 'ประเภทข้อความ', 'กลุ่มผู้รับ', 'จำนวน', 'สถานะ', 'เนื้อหาข้อความ'],
      filtered.map((h) => [
        formatThaiShort(h.sentAt),
        h.template,
        h.msgType,
        h.group,
        h.count,
        h.success ? 'สำเร็จ' : 'ล้มเหลว',
        h.text,
      ]),
    );
  };

  return (
    <Card>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 1.2fr 1.4fr 1fr',
          gap: 14,
          alignItems: 'end',
          marginBottom: 16,
        }}
      >
        <Field label="หัวข้อ">
          <Input
            value={draft.topic}
            onChange={(v) => setField('topic', v)}
            placeholder="ค้นหาหัวข้อ"
            style={{ fontSize: 13, padding: '9px 12px' }}
          />
        </Field>
        <Field label="ประเภทข้อความ">
          <Select
            value={draft.msgType}
            onChange={(v) => setField('msgType', v)}
            options={[ALL_TYPES, ...MSG_TYPES]}
            style={{ fontSize: 13, padding: '9px 12px' }}
          />
        </Field>
        <Field label="กลุ่มผู้รับ">
          <Select
            value={draft.group}
            onChange={(v) => setField('group', v)}
            options={groupOptions}
            style={{ fontSize: 13, padding: '9px 12px' }}
          />
        </Field>
        <Field label="สถานะ">
          <Select
            value={draft.status}
            onChange={(v) => setField('status', v)}
            options={[ALL_STATUSES, 'สำเร็จ', 'ล้มเหลว']}
            style={{ fontSize: 13, padding: '9px 12px' }}
          />
        </Field>
      </div>

      <ReportFilterBar
        onApply={() => {
          setApplied(draft);
          pagination.reset();
        }}
        onClear={() => {
          setDraft(EMPTY_FILTERS);
          setApplied(EMPTY_FILTERS);
          pagination.reset();
        }}
        resultLabel={`พบ ${filtered.length} จาก ${data.historyLog.length} รายการ`}
        onExport={exportReport}
      />

      <TableHead
        template={COLUMNS}
        columns={[
          'วันที่/เวลา',
          'หัวข้อ',
          'ประเภทข้อความ',
          'กลุ่มผู้รับ',
          'จำนวน',
          'สถานะ',
          'จัดการ',
        ]}
      />

      {filtered.length === 0 && <EmptyRow>ไม่พบข้อมูลที่ตรงกับเงื่อนไขที่ค้นหา</EmptyRow>}

      {pagination.items.map((entry) => (
        <TableRow key={entry.id} template={COLUMNS}>
          <Cell muted>{formatThaiShort(entry.sentAt)}</Cell>
          <Cell bold>{entry.template}</Cell>
          <Cell muted>{entry.msgType}</Cell>
          <Cell muted>{entry.group}</Cell>
          <Cell muted>{entry.count}</Cell>
          <StatusDot
            color={entry.success ? theme.success : theme.danger}
            label={entry.success ? 'สำเร็จ' : 'ล้มเหลว'}
          />
          <RowActions>
            <RowAction onClick={() => setEditDraft(entry)}>แก้ไข</RowAction>
            <RowAction tone="danger" onClick={() => setDeleteTarget(entry)}>
              ลบ
            </RowAction>
          </RowActions>
        </TableRow>
      ))}

      {filtered.length > 0 && (
        <PaginationBar
          page={pagination.page}
          totalPages={pagination.totalPages}
          pageSize={pagination.pageSize}
          pageNumbers={pagination.pageNumbers}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
          onPrev={pagination.goPrev}
          onNext={pagination.goNext}
        />
      )}

      {editDraft && (
        <Modal width={460} onBackdropClick={() => setEditDraft(null)}>
          <ModalTitle>แก้ไขประวัติการส่ง</ModalTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="หัวข้อ">
              <Input
                value={editDraft.template}
                onChange={(v) => setEditDraft({ ...editDraft, template: v })}
              />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="ประเภทข้อความ">
                <Select
                  value={editDraft.msgType}
                  onChange={(v) => setEditDraft({ ...editDraft, msgType: v as MsgType })}
                  options={[...MSG_TYPES]}
                />
              </Field>
              <Field label="สถานะ">
                <Select
                  value={editDraft.success ? 'สำเร็จ' : 'ล้มเหลว'}
                  onChange={(v) => setEditDraft({ ...editDraft, success: v === 'สำเร็จ' })}
                  options={['สำเร็จ', 'ล้มเหลว']}
                />
              </Field>
            </div>
            <Field label="กลุ่มผู้รับ">
              <Input
                value={editDraft.group}
                onChange={(v) => setEditDraft({ ...editDraft, group: v })}
              />
            </Field>
          </div>
          <ModalActions>
            <Button variant="ghost" onClick={() => setEditDraft(null)}>
              ยกเลิก
            </Button>
            <Button
              onClick={async () => {
                const saved = await updateHistory(editDraft.id, {
                  template: editDraft.template,
                  msgType: editDraft.msgType,
                  group: editDraft.group,
                  success: editDraft.success,
                });
                if (saved) setEditDraft(null);
              }}
            >
              บันทึกการแก้ไข
            </Button>
          </ModalActions>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          title="ยืนยันการลบประวัติ"
          message={`ต้องการลบประวัติการส่ง "${deleteTarget.template}" ใช่หรือไม่? การลบนี้ไม่สามารถย้อนกลับได้`}
          confirmLabel="ลบข้อมูล"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            if (await deleteHistory(deleteTarget.id)) setDeleteTarget(null);
          }}
        />
      )}
    </Card>
  );
}
