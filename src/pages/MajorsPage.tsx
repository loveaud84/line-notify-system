import { useMemo, useState } from 'react';
import type { Major } from '../types';
import { FACULTY_OPTIONS, PAGE_SIZE_OPTIONS } from '../data/seed';
import { usePagination } from '../lib/usePagination';
import { useStore } from '../store';
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
  RowAction,
  RowActions,
  SearchBox,
  SectionTitle,
  Select,
  TableHead,
  TableRow,
  Toolbar,
} from '../components/ui';

const COLUMNS = '2.4fr 2fr 1fr';

export function MajorsPage() {
  const { data, addMajor, updateMajor, deleteMajor } = useStore();

  const [name, setName] = useState('');
  const [faculty, setFaculty] = useState('');
  const [formError, setFormError] = useState(false);
  const [search, setSearch] = useState('');

  const [editDraft, setEditDraft] = useState<Major | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Major | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return data.majors;
    return data.majors.filter(
      (m) => m.name.toLowerCase().includes(query) || m.faculty.toLowerCase().includes(query),
    );
  }, [data.majors, search]);

  const pagination = usePagination(filtered);

  const submit = async () => {
    if (!name.trim()) {
      setFormError(true);
      return;
    }
    // Keep the typed values on failure so a duplicate name can be corrected.
    if (await addMajor({ name: name.trim(), faculty: faculty.trim() })) {
      setName('');
      setFormError(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Card padding={24}>
        <SectionTitle>เพิ่มข้อมูลสาขาวิชา</SectionTitle>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.6fr 1.4fr 1fr',
            gap: 16,
            alignItems: 'end',
          }}
        >
          <Field label="ชื่อสาขาวิชา">
            <Input
              value={name}
              onChange={(v) => {
                setName(v);
                setFormError(false);
              }}
              placeholder="ระบุสาขาวิชา"
            />
          </Field>
          <Field label="คณะ">
            <Input value={faculty} onChange={setFaculty} placeholder="ระบุคณะ" />
          </Field>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button
              variant="ghost"
              onClick={() => {
                setName('');
                setFaculty('');
                setFormError(false);
              }}
              style={{ padding: '11px 18px' }}
            >
              เคลียร์ข้อมูล
            </Button>
            <Button onClick={() => void submit()} style={{ padding: '11px 22px', flex: 1, textAlign: 'center' }}>
              + เพิ่มสาขาวิชา
            </Button>
          </div>
        </div>
        {formError && <InlineMessage tone="error">กรุณาระบุชื่อสาขาวิชาก่อนเพิ่มข้อมูล</InlineMessage>}
      </Card>

      <Card>
        <Toolbar title="ข้อมูลสาขาวิชา">
          <SearchBox
            value={search}
            onChange={(v) => {
              setSearch(v);
              pagination.reset();
            }}
            placeholder="ค้นหาสาขาวิชา"
            minWidth={220}
          />
        </Toolbar>

        <TableHead template={COLUMNS} columns={['ชื่อสาขาวิชา', 'คณะ', 'จัดการ']} />

        {filtered.length === 0 && <EmptyRow>ไม่พบสาขาวิชาที่ตรงกับ "{search}"</EmptyRow>}

        {pagination.items.map((major) => (
          <TableRow key={major.id} template={COLUMNS}>
            <Cell bold>{major.name}</Cell>
            <Cell muted>{major.faculty}</Cell>
            <RowActions>
              <RowAction onClick={() => setEditDraft(major)}>แก้ไข</RowAction>
              <RowAction tone="danger" onClick={() => setDeleteTarget(major)}>
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
        <Modal onBackdropClick={() => setEditDraft(null)}>
          <ModalTitle>แก้ไขข้อมูลสาขาวิชา</ModalTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="ชื่อสาขาวิชา">
              <Input
                value={editDraft.name}
                onChange={(v) => setEditDraft({ ...editDraft, name: v })}
              />
            </Field>
            <Field label="คณะ">
              <Select
                value={editDraft.faculty || FACULTY_OPTIONS[0]}
                onChange={(v) => setEditDraft({ ...editDraft, faculty: v })}
                options={FACULTY_OPTIONS}
              />
            </Field>
          </div>
          <ModalActions>
            <Button variant="ghost" onClick={() => setEditDraft(null)}>
              ยกเลิก
            </Button>
            <Button
              onClick={async () => {
                if (await updateMajor(editDraft.id, { name: editDraft.name, faculty: editDraft.faculty })) {
                  setEditDraft(null);
                }
              }}
            >
              บันทึกการแก้ไข
            </Button>
          </ModalActions>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          title="ยืนยันการลบสาขาวิชา"
          message={`ต้องการลบสาขาวิชา "${deleteTarget.name}" ออกจากระบบใช่หรือไม่? การลบนี้ไม่สามารถย้อนกลับได้`}
          confirmLabel="ลบสาขาวิชา"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            if (await deleteMajor(deleteTarget.id)) setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}
