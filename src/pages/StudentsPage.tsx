import { useMemo, useRef, useState } from 'react';
import { theme } from '../theme';
import type { Student, StudentInput } from '../types';
import { GENDER_OPTIONS, PAGE_SIZE_OPTIONS, PREFIX_OPTIONS } from '../data/seed';
import { parseStudentCsv } from '../lib/csvImport';
import { usePagination } from '../lib/usePagination';
import { useStore } from '../store';
import { StudentEditModal } from '../components/StudentEditModal';
import {
  Button,
  Card,
  Cell,
  ConfirmDeleteModal,
  EmptyRow,
  Field,
  InlineMessage,
  Input,
  Modal,
  ModalActions,
  ModalTitle,
  PaginationBar,
  ResultCount,
  RowAction,
  RowActions,
  SearchBox,
  SectionTitle,
  Select,
  TableHead,
  TableRow,
  Toolbar,
} from '../components/ui';

const COLUMNS = '0.8fr 2.4fr 0.5fr 2fr 0.9fr 0.9fr 0.9fr';

const EMPTY_FORM = {
  studentId: '',
  prefix: 'นาย',
  firstLast: '',
  gender: 'ชาย',
  major: '',
  phone: '',
  email: '',
  lineId: '',
  lineUid: '',
};

export function StudentsPage() {
  const { data, addStudent, addStudents, updateStudent, deleteStudent } = useStore();
  const majorNames = useMemo(() => data.majors.map((m) => m.name), [data.majors]);

  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(false);

  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');
  const [majorFilter, setMajorFilter] = useState('all');
  const [phoneFilter, setPhoneFilter] = useState('');

  const [editDraft, setEditDraft] = useState<Student | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [csvOpen, setCsvOpen] = useState(false);

  const setField = (key: keyof typeof EMPTY_FORM, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const fullName = (s: Student) => `${s.prefix}${s.firstLast}`;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const phone = phoneFilter.trim();
    return data.students.filter(
      (s) =>
        (!query ||
          fullName(s).toLowerCase().includes(query) ||
          s.studentId.includes(query)) &&
        (genderFilter === 'all' || s.gender === genderFilter) &&
        (majorFilter === 'all' || s.major === majorFilter) &&
        (!phone || s.phone.includes(phone)),
    );
  }, [data.students, search, genderFilter, majorFilter, phoneFilter]);

  const pagination = usePagination(filtered);

  const submit = async () => {
    if (!form.studentId.trim() || !form.firstLast.trim()) {
      setFormError(true);
      return;
    }
    const created = await addStudent({
      ...form,
      studentId: form.studentId.trim(),
      firstLast: form.firstLast.trim(),
      major: form.major,
    });
    // Keep the form on failure so a duplicate student id can be corrected.
    if (created) {
      setForm({ ...EMPTY_FORM, prefix: form.prefix, gender: form.gender });
      setFormError(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Card padding={24}>
        <SectionTitle>เพิ่มข้อมูลนักศึกษา</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
          <Field label="รหัสนักศึกษา">
            <Input
              value={form.studentId}
              onChange={(v) => {
                setField('studentId', v);
                setFormError(false);
              }}
              placeholder="ระบุรหัสนักศึกษา"
            />
          </Field>
          <Field label="คำนำหน้าชื่อ">
            <Select
              value={form.prefix}
              onChange={(v) => setField('prefix', v)}
              options={PREFIX_OPTIONS}
            />
          </Field>
          <Field label="ชื่อ - นามสกุล">
            <Input
              value={form.firstLast}
              onChange={(v) => {
                setField('firstLast', v);
                setFormError(false);
              }}
              placeholder="ระบุชื่อและนามสกุล"
            />
          </Field>
          <Field label="เพศ">
            <Select
              value={form.gender}
              onChange={(v) => setField('gender', v)}
              options={GENDER_OPTIONS}
            />
          </Field>
          <Field label="สาขาวิชา">
            <Select
              value={form.major}
              onChange={(v) => setField('major', v)}
              options={[{ value: '', label: 'เลือกสาขาวิชา' }, ...majorNames]}
            />
          </Field>
          <Field label="เบอร์โทรศัพท์">
            <Input
              value={form.phone}
              onChange={(v) => setField('phone', v)}
              placeholder="08x-xxx-xxxx"
            />
          </Field>
          <Field label="อีเมล">
            <Input
              value={form.email}
              onChange={(v) => setField('email', v)}
              placeholder="ระบุอีเมล"
            />
          </Field>
          <Field label="ไอดี LINE">
            <Input
              value={form.lineId}
              onChange={(v) => setField('lineId', v)}
              placeholder="ระบุไอดี LINE"
            />
          </Field>
          <Field label="Uid LINE">
            <Input
              value={form.lineUid}
              onChange={(v) => setField('lineUid', v)}
              placeholder="ระบุ Uid LINE"
            />
          </Field>
        </div>

        {formError && (
          <InlineMessage tone="error">
            กรุณาระบุรหัสนักศึกษาและชื่อ-นามสกุลก่อนเพิ่มข้อมูล
          </InlineMessage>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
          <Button variant="ghost" onClick={() => setCsvOpen(true)} style={{ padding: '11px 22px' }}>
            นำเข้าไฟล์ CSV
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setForm(EMPTY_FORM);
              setFormError(false);
            }}
            style={{ padding: '11px 22px' }}
          >
            เคลียร์ข้อมูล
          </Button>
          <Button onClick={() => void submit()} style={{ padding: '11px 22px' }}>
            + เพิ่มนักศึกษา
          </Button>
        </div>
      </Card>

      <Card>
        <Toolbar title="ข้อมูลนักศึกษา">
          <SearchBox
            value={search}
            onChange={(v) => {
              setSearch(v);
              pagination.reset();
            }}
            placeholder="ค้นหาชื่อหรือรหัสนักศึกษา"
            minWidth={220}
          />
          <Select
            value={genderFilter}
            onChange={(v) => {
              setGenderFilter(v);
              pagination.reset();
            }}
            options={[
              { value: 'all', label: 'เพศ: ทั้งหมด' },
              ...GENDER_OPTIONS.map((g) => ({ value: g, label: g })),
            ]}
            compact
          />
          <Select
            value={majorFilter}
            onChange={(v) => {
              setMajorFilter(v);
              pagination.reset();
            }}
            options={[
              { value: 'all', label: 'สาขาวิชา: ทั้งหมด' },
              ...majorNames.map((m) => ({ value: m, label: m })),
            ]}
            compact
          />
          <SearchBox
            value={phoneFilter}
            onChange={(v) => {
              setPhoneFilter(v);
              pagination.reset();
            }}
            placeholder="ค้นหาเบอร์โทรศัพท์"
            icon="📞"
            minWidth={160}
          />
          <ResultCount>
            พบ {filtered.length} จาก {data.students.length} คน
          </ResultCount>
        </Toolbar>

        <TableHead
          template={COLUMNS}
          columns={[
            'รหัสนักศึกษา',
            'ชื่อ-นามสกุล',
            'เพศ',
            'สาขาวิชา',
            'เบอร์โทร',
            'ไอดี LINE',
            'จัดการ',
          ]}
        />

        {filtered.length === 0 && (
          <EmptyRow>
            {search.trim()
              ? `ไม่พบนักศึกษาที่ตรงกับ "${search}"`
              : 'ไม่พบนักศึกษาที่ตรงกับเงื่อนไขที่เลือก'}
          </EmptyRow>
        )}

        {pagination.items.map((student) => (
          <TableRow key={student.id} template={COLUMNS}>
            <Cell muted>{student.studentId}</Cell>
            <Cell bold>{fullName(student)}</Cell>
            <Cell muted>{student.gender}</Cell>
            <Cell muted>{student.major}</Cell>
            <Cell muted>{student.phone}</Cell>
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
      </Card>

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

      {csvOpen && (
        <CsvImportModal
          onClose={() => setCsvOpen(false)}
          onImport={async (students) => {
            if (await addStudents(students)) setCsvOpen(false);
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
    </div>
  );
}

function CsvImportModal({
  onClose,
  onImport,
}: {
  onClose: () => void;
  onImport: (students: StudentInput[]) => void | Promise<void>;
}) {
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<ReturnType<typeof parseStudentCsv> | null>(null);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const readFile = async (file: File) => {
    setFileName(file.name);
    setError('');
    try {
      const result = parseStudentCsv(await file.text());
      if (result.students.length === 0) {
        setError('ไม่พบข้อมูลนักศึกษาที่นำเข้าได้ในไฟล์นี้');
        setParsed(null);
        return;
      }
      setParsed(result);
    } catch {
      setError('ไม่สามารถอ่านไฟล์นี้ได้ กรุณาตรวจสอบว่าเป็นไฟล์ CSV');
      setParsed(null);
    }
  };

  return (
    <Modal width={460} onBackdropClick={onClose}>
      <ModalTitle subtitle="ไฟล์ต้องมีคอลัมน์: รหัสนักศึกษา, คำนำหน้าชื่อ, ชื่อ-นามสกุล, เพศ, สาขาวิชา, เบอร์โทรศัพท์, อีเมล, ไอดี LINE, Uid LINE">
        นำเข้าข้อมูลนักศึกษาจากไฟล์ CSV
      </ModalTitle>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (file) void readFile(file);
        }}
        style={{
          border: `2px dashed ${theme.border}`,
          borderRadius: 10,
          padding: '28px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: theme.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{ width: 14, height: 16, border: `1.5px solid ${theme.primary}`, borderRadius: 2 }}
          />
        </div>

        {fileName ? (
          <>
            <div style={{ fontSize: 13, fontWeight: 600, color: theme.textDark }}>{fileName}</div>
            <div style={{ fontSize: 11.5, color: theme.textMuted }}>
              {parsed ? `พร้อมนำเข้า ${parsed.students.length} รายการ` : 'ตรวจสอบไฟล์ไม่ผ่าน'}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 13, color: theme.textMuted }}>
            ลากไฟล์มาวาง หรือเลือกไฟล์จากเครื่อง
          </div>
        )}

        <label
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            padding: '9px 18px',
            borderRadius: 7,
            border: `1px solid ${theme.border}`,
            color: theme.textDark,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          เลือกไฟล์ CSV
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void readFile(file);
            }}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {error && <InlineMessage tone="error">{error}</InlineMessage>}
      {parsed && parsed.skipped.length > 0 && (
        <InlineMessage tone="error">
          ข้ามไป {parsed.skipped.length} แถวที่ข้อมูลไม่ครบ (แถวที่{' '}
          {parsed.skipped.map((s) => s.line).join(', ')})
        </InlineMessage>
      )}

      <ModalActions>
        <Button variant="ghost" onClick={onClose}>
          ยกเลิก
        </Button>
        <Button
          onClick={() => { if (parsed) void onImport(parsed.students); }}
          style={parsed ? undefined : { opacity: 0.5, cursor: 'not-allowed' }}
        >
          นำเข้าข้อมูล
        </Button>
      </ModalActions>
    </Modal>
  );
}
