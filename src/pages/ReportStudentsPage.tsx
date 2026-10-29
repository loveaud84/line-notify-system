import { useMemo, useState } from 'react';
import type { Student } from '../types';
import { GENDER_OPTIONS, PAGE_SIZE_OPTIONS } from '../data/seed';
import { downloadSpreadsheet, exportStamp } from '../lib/export';
import { usePagination } from '../lib/usePagination';
import { useStore } from '../store';
import { ReportFilterBar } from '../components/ReportFilterBar';
import { StudentEditModal } from '../components/StudentEditModal';
import {
  Card,
  CardTitle,
  Cell,
  ConfirmDeleteModal,
  EmptyRow,
  Field,
  Input,
  PaginationBar,
  RowAction,
  RowActions,
  Select,
  TableHead,
  TableRow,
} from '../components/ui';

const COLUMNS = '0.8fr 1.7fr 0.5fr 1.3fr 0.8fr 1.6fr 1fr 0.9fr';

interface Filters {
  studentId: string;
  name: string;
  gender: string;
  major: string;
  phone: string;
}

const EMPTY_FILTERS: Filters = { studentId: '', name: '', gender: 'all', major: 'all', phone: '' };

export function ReportStudentsPage() {
  const { data, updateStudent, deleteStudent } = useStore();
  const majorNames = useMemo(() => data.majors.map((m) => m.name), [data.majors]);

  // Drafts are what the inputs bind to; `applied` is what the table filters on.
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);

  const [editDraft, setEditDraft] = useState<Student | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);

  const fullName = (s: Student) => `${s.prefix}${s.firstLast}`;

  const filtered = useMemo(() => {
    const id = applied.studentId.trim();
    const name = applied.name.trim().toLowerCase();
    const phone = applied.phone.trim();
    return data.students.filter(
      (s) =>
        (!id || s.studentId.includes(id)) &&
        (!name || fullName(s).toLowerCase().includes(name)) &&
        (applied.gender === 'all' || s.gender === applied.gender) &&
        (applied.major === 'all' || s.major === applied.major) &&
        (!phone || s.phone.includes(phone)),
    );
  }, [data.students, applied]);

  const pagination = usePagination(filtered);

  const setField = (key: keyof Filters, value: string) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const exportReport = () => {
    downloadSpreadsheet(
      `รายงานข้อมูลนักศึกษา-${exportStamp()}`,
      ['รหัสนักศึกษา', 'ชื่อ-นามสกุล', 'เพศ', 'สาขาวิชา', 'เบอร์โทร', 'อีเมล', 'ไอดี LINE', 'Uid LINE'],
      filtered.map((s) => [
        s.studentId,
        fullName(s),
        s.gender,
        s.major,
        s.phone,
        s.email,
        s.lineId,
        s.lineUid,
      ]),
    );
  };

  return (
    <Card>
      <CardTitle style={{ marginBottom: 16 }}>ข้อมูลนักศึกษา</CardTitle>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5,1fr)',
          gap: 14,
          alignItems: 'end',
          marginBottom: 16,
        }}
      >
        <Field label="รหัสนักศึกษา">
          <Input
            value={draft.studentId}
            onChange={(v) => setField('studentId', v)}
            placeholder="เช่น 6801001"
            style={{ fontSize: 13, padding: '9px 12px' }}
          />
        </Field>
        <Field label="ชื่อ">
          <Input
            value={draft.name}
            onChange={(v) => setField('name', v)}
            placeholder="ค้นหาชื่อ"
            style={{ fontSize: 13, padding: '9px 12px' }}
          />
        </Field>
        <Field label="เพศ">
          <Select
            value={draft.gender}
            onChange={(v) => setField('gender', v)}
            options={[
              { value: 'all', label: 'เพศ: ทั้งหมด' },
              ...GENDER_OPTIONS.map((g) => ({ value: g, label: g })),
            ]}
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
        <Field label="เบอร์โทรศัพท์">
          <Input
            value={draft.phone}
            onChange={(v) => setField('phone', v)}
            placeholder="ค้นหาเบอร์โทร"
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
        resultLabel={`พบ ${filtered.length} จาก ${data.students.length} คน`}
        onExport={exportReport}
      />

      <TableHead
        template={COLUMNS}
        columns={[
          'รหัสนักศึกษา',
          'ชื่อ-นามสกุล',
          'เพศ',
          'สาขาวิชา',
          'เบอร์โทร',
          'อีเมล',
          'ไอดี LINE',
          'จัดการ',
        ]}
      />

      {filtered.length === 0 && <EmptyRow>ไม่พบนักศึกษาที่ตรงกับเงื่อนไขที่ค้นหา</EmptyRow>}

      {pagination.items.map((student) => (
        <TableRow key={student.id} template={COLUMNS}>
          <Cell muted>{student.studentId}</Cell>
          <Cell bold>{fullName(student)}</Cell>
          <Cell muted>{student.gender}</Cell>
          <Cell muted>{student.major}</Cell>
          <Cell muted>{student.phone}</Cell>
          <Cell muted>{student.email}</Cell>
          <Cell muted>{student.lineId}</Cell>
          <RowActions>
            <RowAction onClick={() => setEditDraft(student)}>แก้ไข</RowAction>
            <RowAction tone="danger" onClick={() => setDeleteTarget(student)}>
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
        <StudentEditModal
          draft={editDraft}
          majorNames={majorNames}
          onChange={setEditDraft}
          onCancel={() => setEditDraft(null)}
          onSave={async () => {
            const { id, ...patch } = editDraft;
            if (await updateStudent(id, patch)) setEditDraft(null);
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          title="ยืนยันการลบนักศึกษา"
          message={`ต้องการลบข้อมูลนักศึกษา "${fullName(deleteTarget)}" ออกจากระบบใช่หรือไม่? การลบนี้ไม่สามารถย้อนกลับได้`}
          confirmLabel="ลบนักศึกษา"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            if (await deleteStudent(deleteTarget.id)) setDeleteTarget(null);
          }}
        />
      )}
    </Card>
  );
}
