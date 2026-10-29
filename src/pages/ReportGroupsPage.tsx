import { useMemo, useState } from 'react';
import type { StudentGroup } from '../types';
import { PAGE_SIZE_OPTIONS } from '../data/seed';
import { downloadSpreadsheet, exportStamp } from '../lib/export';
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
  TableHead,
  TableRow,
} from '../components/ui';

const COLUMNS = '1.6fr 2.2fr 1.2fr 0.9fr';

interface Filters {
  studentId: string;
  major: string;
  group: string;
}

const EMPTY_FILTERS: Filters = { studentId: '', major: 'all', group: 'all' };

export function ReportGroupsPage() {
  const { data, updateStudentGroup, deleteStudentGroup } = useStore();
  const majorNames = useMemo(() => data.majors.map((m) => m.name), [data.majors]);
  const groupNames = useMemo(
    () => [...new Set(data.studentGroups.map((g) => g.group))],
    [data.studentGroups],
  );

  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);

  const [editDraft, setEditDraft] = useState<StudentGroup | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StudentGroup | null>(null);

  const filtered = useMemo(() => {
    const id = applied.studentId.trim();
    return data.studentGroups.filter(
      (g) =>
        (!id || g.studentId.includes(id)) &&
        (applied.major === 'all' || g.major === applied.major) &&
        (applied.group === 'all' || g.group === applied.group),
    );
  }, [data.studentGroups, applied]);

  const pagination = usePagination(filtered);

  const setField = (key: keyof Filters, value: string) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const exportReport = () => {
    downloadSpreadsheet(
      `รายงานจัดกลุ่มนักศึกษา-${exportStamp()}`,
      ['เลขนักศึกษา', 'สาขาวิชา', 'กลุ่ม'],
      filtered.map((g) => [g.studentId, g.major, g.group]),
    );
  };

  return (
    <Card>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 1.6fr 1.6fr',
          gap: 14,
          alignItems: 'end',
          marginBottom: 16,
        }}
      >
        <Field label="เลขนักศึกษา">
          <Input
            value={draft.studentId}
            onChange={(v) => setField('studentId', v)}
            placeholder="ค้นหาเลขนักศึกษา"
            style={{ fontSize: 13, padding: '9px 12px' }}
          />
        </Field>
        <Field label="สาขาวิชา">
          <Select
            value={draft.major}
            onChange={(v) => setField('major', v)}
            options={[
              { value: 'all', label: 'สาขาวิชา: ทั้งหมด' },
              ...majorNames.map((m) => ({ value: m, label: m })),
            ]}
            style={{ fontSize: 13, padding: '9px 12px' }}
          />
        </Field>
        <Field label="กลุ่ม">
          <Select
            value={draft.group}
            onChange={(v) => setField('group', v)}
            options={[
              { value: 'all', label: 'กลุ่ม: ทั้งหมด' },
              ...groupNames.map((g) => ({ value: g, label: g })),
            ]}
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
        resultLabel={`พบ ${filtered.length} จาก ${data.studentGroups.length} รายการ`}
        onExport={exportReport}
      />

      <TableHead template={COLUMNS} columns={['เลขนักศึกษา', 'สาขาวิชา', 'กลุ่ม', 'จัดการ']} />

      {filtered.length === 0 && <EmptyRow>ไม่พบข้อมูลที่ตรงกับเงื่อนไขที่ค้นหา</EmptyRow>}

      {pagination.items.map((group) => (
        <TableRow key={group.id} template={COLUMNS}>
          <Cell bold>{group.studentId}</Cell>
          <Cell muted>{group.major}</Cell>
          <Cell muted>{group.group}</Cell>
          <RowActions>
            <RowAction onClick={() => setEditDraft(group)}>แก้ไข</RowAction>
            <RowAction tone="danger" onClick={() => setDeleteTarget(group)}>
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
        <Modal width={440} onBackdropClick={() => setEditDraft(null)}>
          <ModalTitle>แก้ไขกลุ่มนักศึกษา</ModalTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="เลขนักศึกษา">
              <Input
                value={editDraft.studentId}
                onChange={(v) => setEditDraft({ ...editDraft, studentId: v })}
              />
            </Field>
            <Field label="สาขาวิชา">
              <Select
                value={editDraft.major || majorNames[0] || ''}
                onChange={(v) => setEditDraft({ ...editDraft, major: v })}
                options={majorNames}
              />
            </Field>
            <Field label="กลุ่ม">
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
                const { id, ...patch } = editDraft;
                if (await updateStudentGroup(id, patch)) setEditDraft(null);
              }}
            >
              บันทึกการแก้ไข
            </Button>
          </ModalActions>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          title="ยืนยันการลบข้อมูล"
          message={`ต้องการลบข้อมูลนักศึกษา "${deleteTarget.studentId}" ออกจากกลุ่มใช่หรือไม่? การลบนี้ไม่สามารถย้อนกลับได้`}
          confirmLabel="ลบข้อมูล"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            if (await deleteStudentGroup(deleteTarget.id)) setDeleteTarget(null);
          }}
        />
      )}
    </Card>
  );
}
