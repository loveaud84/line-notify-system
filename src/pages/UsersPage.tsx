import { useMemo, useState } from 'react';
import { theme } from '../theme';
import type { User } from '../types';
import { PAGE_SIZE_OPTIONS, PREFIX_OPTIONS } from '../data/seed';
import { usePagination } from '../lib/usePagination';
import { useStore } from '../store';
import { EyeIcon } from '../components/NavIcons';
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
  Pill,
  ResultCount,
  RowAction,
  RowActions,
  SearchBox,
  SectionTitle,
  Select,
  StatusDot,
  TableHead,
  TableRow,
  Toolbar,
} from '../components/ui';

const COLUMNS = '1.5fr 1.6fr 0.7fr 0.7fr 1.7fr';

const LEVEL_OPTIONS = [
  { value: 'admin', label: 'แอดมิน' },
  { value: 'user', label: 'ผู้ใช้งาน' },
];
const STATUS_OPTIONS = [
  { value: 'active', label: 'ใช้งาน' },
  { value: 'inactive', label: 'ไม่ได้ใช้งาน' },
];

const LEVEL_FILTERS = [
  { value: 'all', label: 'ระดับ: ทั้งหมด' },
  { value: 'admin', label: 'แอดมิน' },
  { value: 'user', label: 'ผู้ใช้งาน' },
];
const STATUS_FILTERS = [
  { value: 'all', label: 'สถานะ: ทั้งหมด' },
  { value: 'active', label: 'ใช้งาน' },
  { value: 'inactive', label: 'ไม่ได้ใช้งาน' },
];

interface EditDraft {
  id: number;
  fullName: string;
  email: string;
  username: string;
  level: string;
  status: string;
}

interface PasswordDraft {
  id: number;
  fullName: string;
  password: string;
  confirmPassword: string;
}

export function UsersPage() {
  const { data, addUser, updateUser, deleteUser } = useStore();

  const [prefix, setPrefix] = useState('นาย');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [level, setLevel] = useState('user');
  const [status, setStatus] = useState('active');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [formError, setFormError] = useState(false);

  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [passwordDraft, setPasswordDraft] = useState<PasswordDraft | null>(null);
  const [passwordError, setPasswordError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.users.filter(
      (u) =>
        (!query || u.fullName.toLowerCase().includes(query)) &&
        (levelFilter === 'all' || (levelFilter === 'admin') === u.isAdmin) &&
        (statusFilter === 'all' || (statusFilter === 'active') === u.isActive),
    );
  }, [data.users, search, levelFilter, statusFilter]);

  const pagination = usePagination(filtered);
  const hasActiveFilters = Boolean(search.trim()) || levelFilter !== 'all' || statusFilter !== 'all';

  const clearForm = () => {
    setPrefix('นาย');
    setFirstName('');
    setLastName('');
    setLevel('user');
    setStatus('active');
    setEmail('');
    setUsername('');
    setPassword('');
    setFormError(false);
  };

  const submitNewUser = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setFormError(true);
      return;
    }
    const created = await addUser({
      fullName: `${prefix}${firstName.trim()} ${lastName.trim()}`,
      isAdmin: level === 'admin',
      isActive: status === 'active',
      username: username.trim(),
      password: password.trim(),
      email: email.trim(),
    });
    // Keep the form populated on failure so a duplicate username can be fixed.
    if (created) {
      clearForm();
      pagination.reset();
    }
  };

  const saveEdit = async () => {
    if (!editDraft) return;
    const saved = await updateUser(editDraft.id, {
      fullName: editDraft.fullName,
      email: editDraft.email,
      isAdmin: editDraft.level === 'admin',
      isActive: editDraft.status === 'active',
    });
    if (saved) setEditDraft(null);
  };

  const savePassword = async () => {
    if (!passwordDraft) return;
    const pw = passwordDraft.password.trim();
    if (!pw) {
      setPasswordError('กรุณาระบุรหัสผ่านใหม่');
      return;
    }
    if (pw !== passwordDraft.confirmPassword.trim()) {
      setPasswordError('รหัสผ่านและการยืนยันไม่ตรงกัน');
      return;
    }
    if (await updateUser(passwordDraft.id, { password: pw })) {
      setPasswordDraft(null);
      setPasswordError('');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Card padding={24}>
        <SectionTitle>เพิ่มข้อมูลผู้ใช้งาน</SectionTitle>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.4fr 1.4fr 1fr 1fr',
            gap: 16,
            alignItems: 'end',
          }}
        >
          <Field label="คำนำหน้าชื่อ">
            <Select value={prefix} onChange={setPrefix} options={PREFIX_OPTIONS} />
          </Field>
          <Field label="ชื่อ">
            <Input
              value={firstName}
              onChange={(v) => {
                setFirstName(v);
                setFormError(false);
              }}
              placeholder="ระบุชื่อ"
            />
          </Field>
          <Field label="นามสกุล">
            <Input
              value={lastName}
              onChange={(v) => {
                setLastName(v);
                setFormError(false);
              }}
              placeholder="ระบุนามสกุล"
            />
          </Field>
          <Field label="ระดับ">
            <Select value={level} onChange={setLevel} options={LEVEL_OPTIONS} />
          </Field>
          <Field label="สถานะ">
            <Select value={status} onChange={setStatus} options={STATUS_OPTIONS} />
          </Field>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
            alignItems: 'end',
            marginTop: 16,
          }}
        >
          <Field label="Email">
            <Input value={email} onChange={setEmail} placeholder="ระบุอีเมล" />
          </Field>
          <Field label="Username">
            <Input value={username} onChange={setUsername} placeholder="ระบุ username" />
          </Field>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
            alignItems: 'end',
            marginTop: 16,
          }}
        >
          <Field label="Password">
            <div style={{ position: 'relative' }}>
              <Input
                type={passwordVisible ? 'text' : 'password'}
                value={password}
                onChange={setPassword}
                placeholder="ระบุ password"
                style={{ padding: '11px 40px 11px 14px' }}
              />
              <div
                onClick={() => setPasswordVisible((v) => !v)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 20,
                  height: 20,
                }}
              >
                <EyeIcon crossed={passwordVisible} color={theme.textMuted} />
              </div>
            </div>
          </Field>
        </div>

        {formError && <InlineMessage tone="error">กรุณาระบุชื่อและนามสกุลก่อนเพิ่มผู้ใช้งาน</InlineMessage>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
          <Button variant="ghost" onClick={clearForm} style={{ padding: '11px 22px' }}>
            เคลียร์ข้อมูล
          </Button>
          <Button onClick={() => void submitNewUser()} style={{ padding: '11px 22px' }}>
            + เพิ่มผู้ใช้งาน
          </Button>
        </div>
      </Card>

      <Card>
        <Toolbar title="รายชื่อผู้ใช้งานระบบ">
          <SearchBox
            value={search}
            onChange={(v) => {
              setSearch(v);
              pagination.reset();
            }}
            placeholder="ค้นหาตามชื่อ"
          />
          <Select
            value={levelFilter}
            onChange={(v) => {
              setLevelFilter(v);
              pagination.reset();
            }}
            options={LEVEL_FILTERS}
            compact
          />
          <Select
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v);
              pagination.reset();
            }}
            options={STATUS_FILTERS}
            compact
          />
          {hasActiveFilters && (
            <div
              onClick={() => {
                setSearch('');
                setLevelFilter('all');
                setStatusFilter('all');
                pagination.reset();
              }}
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: theme.primary,
                padding: '8px 14px',
                borderRadius: 7,
                border: `1px solid ${theme.border}`,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              ล้างตัวกรองทั้งหมด
            </div>
          )}
          <ResultCount>
            พบ {filtered.length} จาก {data.users.length} คน
          </ResultCount>
        </Toolbar>

        <TableHead
          template={COLUMNS}
          columns={['คำนำหน้า / ชื่อ - นามสกุล', 'Email', 'ระดับ', 'สถานะ', 'จัดการ']}
        />

        {filtered.length === 0 && (
          <EmptyRow>
            {search.trim()
              ? `ไม่พบผู้ใช้งานที่ตรงกับ "${search}"`
              : 'ไม่พบผู้ใช้งานที่ตรงกับเงื่อนไขที่เลือก'}
          </EmptyRow>
        )}

        {pagination.items.map((user) => (
          <TableRow key={user.id} template={COLUMNS}>
            <Cell bold>{user.fullName}</Cell>
            <Cell muted>{user.email || '—'}</Cell>
            <div style={{ whiteSpace: 'nowrap' }}>
              <Pill
                color={user.isAdmin ? theme.primary : '#5a6b7a'}
                background={user.isAdmin ? theme.bg : '#eef1f4'}
              >
                {user.isAdmin ? 'แอดมิน' : 'ผู้ใช้งาน'}
              </Pill>
            </div>
            <StatusDot
              color={user.isActive ? theme.success : '#8a97a3'}
              label={user.isActive ? 'ใช้งาน' : 'ไม่ได้ใช้งาน'}
            />
            <RowActions>
              <RowAction
                onClick={() =>
                  setEditDraft({
                    id: user.id,
                    fullName: user.fullName,
                    email: user.email ?? '',
                    username: user.username ?? '',
                    level: user.isAdmin ? 'admin' : 'user',
                    status: user.isActive ? 'active' : 'inactive',
                  })
                }
              >
                แก้ไข
              </RowAction>
              <RowAction
                onClick={() => {
                  setPasswordDraft({
                    id: user.id,
                    fullName: user.fullName,
                    password: '',
                    confirmPassword: '',
                  });
                  setPasswordError('');
                }}
              >
                เปลี่ยนรหัสผ่าน
              </RowAction>
              <RowAction tone="danger" onClick={() => setDeleteTarget(user)}>
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
          <ModalTitle>แก้ไขข้อมูลผู้ใช้งาน</ModalTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="ชื่อ - นามสกุล">
              <Input
                value={editDraft.fullName}
                onChange={(v) => setEditDraft({ ...editDraft, fullName: v })}
              />
            </Field>
            <Field label="Email">
              <Input
                value={editDraft.email}
                onChange={(v) => setEditDraft({ ...editDraft, email: v })}
                placeholder="ระบุอีเมล"
              />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="ระดับ">
                <Select
                  value={editDraft.level}
                  onChange={(v) => setEditDraft({ ...editDraft, level: v })}
                  options={LEVEL_OPTIONS}
                />
              </Field>
              <Field label="สถานะ">
                <Select
                  value={editDraft.status}
                  onChange={(v) => setEditDraft({ ...editDraft, status: v })}
                  options={STATUS_OPTIONS}
                />
              </Field>
            </div>
            <Field label="Username">
              <Input value={editDraft.username || '(ไม่ได้ตั้งค่า)'} onChange={() => {}} disabled />
            </Field>
          </div>
          <ModalActions>
            <Button variant="ghost" onClick={() => setEditDraft(null)}>
              ยกเลิก
            </Button>
            <Button onClick={() => void saveEdit()}>บันทึกการแก้ไข</Button>
          </ModalActions>
        </Modal>
      )}

      {passwordDraft && (
        <Modal onBackdropClick={() => setPasswordDraft(null)}>
          <ModalTitle subtitle={`สำหรับผู้ใช้งาน "${passwordDraft.fullName}"`}>
            เปลี่ยนรหัสผ่าน
          </ModalTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="รหัสผ่านใหม่">
              <Input
                type="password"
                value={passwordDraft.password}
                onChange={(v) => {
                  setPasswordDraft({ ...passwordDraft, password: v });
                  setPasswordError('');
                }}
                placeholder="ระบุรหัสผ่านใหม่"
              />
            </Field>
            <Field label="ยืนยันรหัสผ่านใหม่">
              <Input
                type="password"
                value={passwordDraft.confirmPassword}
                onChange={(v) => {
                  setPasswordDraft({ ...passwordDraft, confirmPassword: v });
                  setPasswordError('');
                }}
                placeholder="ยืนยันรหัสผ่านใหม่"
              />
            </Field>
          </div>
          {passwordError && <InlineMessage tone="error">{passwordError}</InlineMessage>}
          <ModalActions>
            <Button variant="ghost" onClick={() => setPasswordDraft(null)}>
              ยกเลิก
            </Button>
            <Button onClick={() => void savePassword()}>บันทึกรหัสผ่าน</Button>
          </ModalActions>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          title="ยืนยันการลบผู้ใช้งาน"
          message={`ต้องการลบผู้ใช้งาน "${deleteTarget.fullName}" ออกจากระบบใช่หรือไม่? การลบนี้ไม่สามารถย้อนกลับได้`}
          confirmLabel="ลบผู้ใช้งาน"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            if (await deleteUser(deleteTarget.id)) setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}
