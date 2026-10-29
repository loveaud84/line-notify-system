import { useMemo, useState } from 'react';
import { theme } from '../theme';
import type { HistoryEntry, MsgType } from '../types';
import { MSG_TYPES, PAGE_SIZE_OPTIONS } from '../data/seed';
import { formatThaiShort } from '../lib/thai';
import { usePagination } from '../lib/usePagination';
import { useStore } from '../store';
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
  SearchBox,
  Select,
  StatusDot,
  TableHead,
  TableRow,
} from '../components/ui';

const COLUMNS = '1fr 1.5fr 0.9fr 1.1fr 0.7fr 0.9fr 1.3fr';

const ALL_TYPES = 'ทุกประเภท';
const ALL_GROUPS = 'ทุกกลุ่ม';
const ALL_STATUSES = 'ทั้งหมด';

export function HistoryPage() {
  const { data, updateHistory, deleteHistory } = useStore();

  const [search, setSearch] = useState('');
  const [msgTypeFilter, setMsgTypeFilter] = useState(ALL_TYPES);
  const [groupFilter, setGroupFilter] = useState(ALL_GROUPS);
  const [statusFilter, setStatusFilter] = useState(ALL_STATUSES);

  const [viewEntry, setViewEntry] = useState<HistoryEntry | null>(null);
  const [editDraft, setEditDraft] = useState<HistoryEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HistoryEntry | null>(null);

  const groupOptions = useMemo(
    () => [ALL_GROUPS, ...new Set(data.historyLog.map((h) => h.group))],
    [data.historyLog],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.historyLog.filter(
      (h) =>
        (!query || h.template.toLowerCase().includes(query)) &&
        (msgTypeFilter === ALL_TYPES || h.msgType === msgTypeFilter) &&
        (groupFilter === ALL_GROUPS || h.group === groupFilter) &&
        (statusFilter === ALL_STATUSES ||
          (statusFilter === 'สำเร็จ') === h.success),
    );
  }, [data.historyLog, search, msgTypeFilter, groupFilter, statusFilter]);

  const pagination = usePagination(filtered);

  return (
    <Card>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <SearchBox
            value={search}
            onChange={(v) => {
              setSearch(v);
              pagination.reset();
            }}
            placeholder="ค้นหาหัวข้อ"
          />
          <Select
            value={msgTypeFilter}
            onChange={(v) => {
              setMsgTypeFilter(v);
              pagination.reset();
            }}
            options={[ALL_TYPES, ...MSG_TYPES]}
            compact
          />
          <Select
            value={groupFilter}
            onChange={(v) => {
              setGroupFilter(v);
              pagination.reset();
            }}
            options={groupOptions}
            compact
          />
          <Select
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v);
              pagination.reset();
            }}
            options={[ALL_STATUSES, 'สำเร็จ', 'ล้มเหลว']}
            compact
          />
        </div>
      </div>

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

      {filtered.length === 0 && (
        <EmptyRow>
          {data.historyLog.length === 0
            ? 'ยังไม่มีประวัติการส่งข้อความ'
            : 'ไม่พบประวัติที่ตรงกับเงื่อนไขการค้นหา'}
        </EmptyRow>
      )}

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
            <RowAction tone="primary" onClick={() => setViewEntry(entry)}>
              ดูข้อความ
            </RowAction>
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

      {viewEntry && (
        <Modal width={460} onBackdropClick={() => setViewEntry(null)}>
          <div
            style={{ fontSize: 15.5, fontWeight: 700, color: theme.textDark, marginBottom: 4 }}
          >
            {viewEntry.template}
          </div>
          <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 16 }}>
            {formatThaiShort(viewEntry.sentAt)} · {viewEntry.msgType} · {viewEntry.group}
          </div>
          <div
            style={{
              fontSize: 13.5,
              lineHeight: 1.7,
              padding: 14,
              border: `1px solid ${theme.border}`,
              borderRadius: 7,
              minHeight: 120,
              color: theme.textDark,
              whiteSpace: 'pre-line',
              background: theme.bg,
            }}
          >
            {viewEntry.text || '(ไม่มีเนื้อหาข้อความที่บันทึกไว้)'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
            <Button onClick={() => setViewEntry(null)}>ปิด</Button>
          </div>
        </Modal>
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
