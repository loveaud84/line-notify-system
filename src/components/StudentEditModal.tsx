import type { Student } from '../types';
import { GENDER_OPTIONS, PREFIX_OPTIONS } from '../data/seed';
import { Button, Field, Input, Modal, ModalActions, ModalTitle, Select } from './ui';

/** Shared by the students page and the student report, which both edit in place. */
export function StudentEditModal({
  draft,
  majorNames,
  onChange,
  onCancel,
  onSave,
}: {
  draft: Student;
  majorNames: string[];
  onChange: (draft: Student) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const set = (key: keyof Student, value: string) => onChange({ ...draft, [key]: value });

  return (
    <Modal width={520} onBackdropClick={onCancel}>
      <ModalTitle>แก้ไขข้อมูลนักศึกษา</ModalTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="รหัสนักศึกษา">
          <Input value={draft.studentId} onChange={(v) => set('studentId', v)} />
        </Field>
        <Field label="คำนำหน้าชื่อ">
          <Select value={draft.prefix} onChange={(v) => set('prefix', v)} options={PREFIX_OPTIONS} />
        </Field>
        <Field label="ชื่อ - นามสกุล">
          <Input value={draft.firstLast} onChange={(v) => set('firstLast', v)} />
        </Field>
        <Field label="เพศ">
          <Select value={draft.gender} onChange={(v) => set('gender', v)} options={GENDER_OPTIONS} />
        </Field>
        <Field label="สาขาวิชา">
          <Select
            value={draft.major || majorNames[0] || ''}
            onChange={(v) => set('major', v)}
            options={majorNames}
          />
        </Field>
        <Field label="เบอร์โทรศัพท์">
          <Input value={draft.phone} onChange={(v) => set('phone', v)} />
        </Field>
        <Field label="อีเมล">
          <Input value={draft.email} onChange={(v) => set('email', v)} />
        </Field>
        <Field label="ไอดี LINE">
          <Input value={draft.lineId} onChange={(v) => set('lineId', v)} />
        </Field>
        <Field label="Uid LINE">
          <Input value={draft.lineUid} onChange={(v) => set('lineUid', v)} />
        </Field>
      </div>
      <ModalActions>
        <Button variant="ghost" onClick={onCancel}>
          ยกเลิก
        </Button>
        <Button onClick={onSave}>บันทึกการแก้ไข</Button>
      </ModalActions>
    </Modal>
  );
}
