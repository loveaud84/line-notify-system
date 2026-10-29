import { useMemo, useState } from 'react';
import { theme } from '../theme';
import type { StudentGroup } from '../types';
import { PAGE_SIZE_OPTIONS } from '../data/seed';
import { usePagination } from '../lib/usePagination';
import { useStore } from '../store';
import { ConnectLineModal } from '../components/ConnectLineModal';
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
  SearchBox,
  SectionTitle,
  Select,
  StatusDot,
  TableHead,
  TableRow,
  Toolbar,
} from '../components/ui';

const COLUMNS = '1.2fr 1.7fr 0.9fr 1fr 1.6fr';

export function StudentGroupsPage() {
  const { data, addStudentGroup, updateStudentGroup, deleteStudentGroup } = useStore();
  const majorNames = useMemo(() => data.majors.map((m) => m.name), [data.majors]);

  const [assignStudentId, setAssignStudentId] = useState('');
  const [assignMajor, setAssignMajor] = useState('');
  const [assignGroup, setAssignGroup] = useState('');
  const [assignError, setAssignError] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState<{ id: string; group: string } | null>(null);

  const [search, setSearch] = useState('');
  const [editDraft, setEditDraft] = useState<StudentGroup | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StudentGroup | null>(null);
  const [connectTarget, setConnectTarget] = useState<StudentGroup | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return data.studentGroups;
    return data.studentGroups.filter(
      (g) => g.studentId.includes(query) || g.group.toLowerCase().includes(query),
    );
  }, [data.studentGroups, search]);

  const pagination = usePagination(filtered);

  const submit = async () => {
    const sid = assignStudentId.trim();
    const group = assignGroup.trim();
    if (!sid || !group) {
      setAssignError(true);
      setAssignSuccess(null);
      return;
    }
    // A student id absent from the students table is rejected by a foreign key,
    // so only report success once the server has accepted the row.
    const created = await addStudentGroup({
      studentId: sid,
      major: assignMajor || majorNames[0] || '',
      group,
    });
    if (created) {
      setAssignStudentId('');
      setAssignGroup('');
      setAssignError(false);
      setAssignSuccess({ id: sid, group });
    }
  };

  /** The student record behind a group row, if one exists. */
  const studentFor = (studentId: string) =>
    data.students.find((s) => s.studentId === studentId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Card padding={24}>
        <SectionTitle>จัดกลุ่มนักศึกษา</SectionTitle>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1.6fr 1.6fr 1fr',
            gap: 16,
            alignItems: 'end',
          }}
        >
          <Field label="เลขนักศึกษา">
            <Input
              value={assignStudentId}
              onChange={(v) => {
                setAssignStudentId(v);
                setAssignError(false);
                setAssignSuccess(null);
              }}
              placeholder="ระบุเลขนักศึกษา"
            />
          </Field>
          <Field label="สาขาวิชา">
            <Select
              value={assignMajor || majorNames[0] || ''}
              onChange={setAssignMajor}
              options={majorNames}
            />
          </Field>
          <Field label="กลุ่ม">
            <Input value={assignGroup} onChange={setAssignGroup} placeholder="ระบุกลุ่ม" />
          </Field>
          <Button onClick={() => void submit()} style={{ padding: '11px 22px', textAlign: 'center' }}>
            + จัดกลุ่ม
          </Button>
        </div>

        {assignError && (
          <InlineMessage tone="error">กรุณาระบุเลขนักศึกษาและชื่อกลุ่มก่อนจัดกลุ่ม</InlineMessage>
        )}
        {assignSuccess && (
          <InlineMessage tone="success">
            เพิ่มนักศึกษา {assignSuccess.id} เข้ากลุ่ม "{assignSuccess.group}" เรียบร้อยแล้ว
          </InlineMessage>
        )}
      </Card>

      <Card>
        <Toolbar title="ข้อมูลกลุ่มนักศึกษา">
          <SearchBox
            value={search}
            onChange={(v) => {
              setSearch(v);
              pagination.reset();
            }}
            placeholder="ค้นหาชื่อกลุ่ม"
            minWidth={220}
          />
        </Toolbar>

        <TableHead
          template={COLUMNS}
          columns={['เลขนักศึกษา', 'สาขาวิชา', 'กลุ่ม', 'สถานะ LINE', 'จัดการ']}
        />

        {filtered.length === 0 && <EmptyRow>ไม่พบข้อมูลที่ตรงกับ "{search}"</EmptyRow>}

        {pagination.items.map((group) => {
          const student = studentFor(group.studentId);
          const connected = Boolean(student?.lineConnectedAt);
          return (
          <TableRow key={group.id} template={COLUMNS}>
            <Cell bold>{group.studentId}</Cell>
            <Cell muted>{group.major}</Cell>
            <Cell muted>{group.group}</Cell>
            <StatusDot
              color={connected ? theme.success : '#b5651d'}
              label={connected ? 'เชื่อมต่อแล้ว' : 'ยังไม่เชื่อมต่อ'}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <RowAction tone="line" onClick={() => setConnectTarget(group)}>
                {connected ? 'จัดการ LINE OA' : 'เชื่อมต่อ LINE OA'}
              </RowAction>
              <RowAction onClick={() => setEditDraft(group)}>แก้ไข</RowAction>
              <RowAction tone="danger" onClick={() => setDeleteTarget(group)}>
                ลบ
              </RowAction>
            </div>
          </TableRow>
          );
        })}

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

      {connectTarget && (
        <ConnectLineModal
          studentId={connectTarget.studentId}
          student={studentFor(connectTarget.studentId)}
          onClose={() => setConnectTarget(null)}
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
          message={
            <>
              ต้องการลบข้อมูลนักศึกษา "{deleteTarget.studentId}" ออกจากกลุ่ม
              <span style={{ color: theme.textDark, fontWeight: 600 }}> {deleteTarget.group} </span>
              ใช่หรือไม่? การลบนี้ไม่สามารถย้อนกลับได้
            </>
          }
          confirmLabel="ลบข้อมูล"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            if (await deleteStudentGroup(deleteTarget.id)) setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}
