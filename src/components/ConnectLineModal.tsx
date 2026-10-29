import { useState } from 'react';
import { theme } from '../theme';
import type { Student } from '../types';
import { connectStudentToLine, disconnectStudentFromLine } from '../lib/lineApi';
import { formatThaiShort } from '../lib/thai';
import { useStore } from '../store';
import { Button, Field, InlineMessage, Input, Modal, ModalActions, ModalTitle } from './ui';

type Status = 'form' | 'working' | 'success';

/**
 * Links a student to the LINE Official Account.
 *
 * The server asks LINE for the user's profile before saving anything, so a
 * success here means LINE confirmed the student has added the OA as a friend —
 * not merely that a uid was typed into the box.
 */
export function ConnectLineModal({
  studentId,
  student,
  onClose,
}: {
  studentId: string;
  /** The matching student record, or undefined when the id has no record. */
  student: Student | undefined;
  onClose: () => void;
}) {
  const { reload } = useStore();

  const [uid, setUid] = useState(student?.lineUid ?? '');
  const [status, setStatus] = useState<Status>('form');
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    displayName: string;
    pictureUrl: string;
    mock: boolean;
    welcomeSent: boolean;
  } | null>(null);

  const alreadyConnected = Boolean(student?.lineConnectedAt);

  const connect = async () => {
    if (status === 'working') return;

    setStatus('working');
    setError('');

    const response = await connectStudentToLine(studentId, uid.trim());

    if (!response.ok) {
      setStatus('form');
      setError(response.message);
      return;
    }

    setResult({
      displayName: response.profile.displayName,
      pictureUrl: response.profile.pictureUrl,
      mock: response.mock,
      welcomeSent: response.welcomeSent,
    });
    setStatus('success');
    // Pull the saved connection back so the tables update behind the modal.
    await reload();
  };

  const disconnect = async () => {
    if (status === 'working') return;
    setStatus('working');
    setError('');

    const response = await disconnectStudentFromLine(studentId);
    if (!response.ok) {
      setStatus('form');
      setError(response.message);
      return;
    }
    await reload();
    onClose();
  };

  /* --------------------------------------------------------------- success */

  if (status === 'success' && result) {
    return (
      <Modal width={440} onBackdropClick={onClose}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 34, marginBottom: 12 }}>✅</div>
          <div
            style={{ fontSize: 15.5, fontWeight: 700, color: theme.textDark, marginBottom: 14 }}
          >
            เชื่อมต่อ LINE OA สำเร็จ
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: 14,
              border: `1px solid ${theme.border}`,
              borderRadius: 10,
              textAlign: 'left',
              marginBottom: 16,
            }}
          >
            {result.pictureUrl ? (
              <img
                src={result.pictureUrl}
                alt=""
                style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0 }}
              />
            ) : (
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: theme.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  flexShrink: 0,
                }}
              >
                👤
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11.5, color: theme.textMuted }}>ชื่อบัญชี LINE</div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: theme.textDark,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {result.displayName || '(ไม่มีชื่อ)'}
              </div>
              <div style={{ fontSize: 11.5, color: theme.textMuted, marginTop: 2 }}>
                นักศึกษารหัส {studentId}
              </div>
            </div>
          </div>

          {result.mock ? (
            <div
              style={{
                fontSize: 12,
                lineHeight: 1.7,
                color: theme.warning,
                background: 'rgba(201,138,46,0.08)',
                borderRadius: 8,
                padding: '10px 12px',
                marginBottom: 18,
                textAlign: 'left',
              }}
            >
              <strong>โหมดจำลอง</strong> — ยังไม่ได้ตรวจสอบกับ LINE จริง
              เนื่องจากยังไม่ได้ตั้งค่า <code>LINE_CHANNEL_ACCESS_TOKEN</code> ในไฟล์ .env
              ของเซิร์ฟเวอร์ ชื่อบัญชีด้านบนเป็นข้อมูลจำลอง
            </div>
          ) : !result.welcomeSent ? (
            <div
              style={{
                fontSize: 12,
                lineHeight: 1.7,
                color: theme.warning,
                marginBottom: 18,
                textAlign: 'left',
              }}
            >
              บันทึกการเชื่อมต่อแล้ว แต่ส่งข้อความต้อนรับไม่สำเร็จ
            </div>
          ) : (
            <div style={{ fontSize: 12.5, color: theme.textMuted, marginBottom: 18 }}>
              ส่งข้อความยืนยันไปยัง LINE ของนักศึกษาแล้ว
            </div>
          )}

          <Button onClick={onClose} style={{ display: 'inline-block' }}>
            ตกลง
          </Button>
        </div>
      </Modal>
    );
  }

  /* ------------------------------------------------------------------ form */

  return (
    <Modal width={460} onBackdropClick={onClose}>
      <ModalTitle subtitle={`นักศึกษารหัส ${studentId}`}>เชื่อมต่อ LINE OA</ModalTitle>

      {!student && (
        <InlineMessage tone="error">
          ไม่พบข้อมูลนักศึกษารหัสนี้ในระบบ — กรุณาเพิ่มข้อมูลนักศึกษาที่หน้า "ข้อมูลนักศึกษา" ก่อน
        </InlineMessage>
      )}

      {alreadyConnected && student && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '11px 13px',
            borderRadius: 8,
            background: 'rgba(58,140,90,0.08)',
            marginBottom: 16,
          }}
        >
          <div
            style={{ width: 8, height: 8, borderRadius: '50%', background: theme.success, flexShrink: 0 }}
          />
          <div style={{ fontSize: 12.5, color: theme.textDark, lineHeight: 1.6 }}>
            เชื่อมต่อแล้วกับบัญชี{' '}
            <strong>{student.lineDisplayName || '(ไม่มีชื่อ)'}</strong>
            <br />
            <span style={{ color: theme.textMuted }}>
              เมื่อ {formatThaiShort(student.lineConnectedAt!)}
            </span>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="LINE User ID (uid)">
          <Input
            value={uid}
            onChange={(v) => {
              setUid(v);
              setError('');
            }}
            placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            style={{ fontFamily: 'monospace', fontSize: 13 }}
          />
        </Field>

        <div
          style={{
            fontSize: 11.5,
            lineHeight: 1.7,
            color: theme.textMuted,
            background: theme.bg,
            borderRadius: 8,
            padding: '11px 13px',
          }}
        >
          ระบบจะตรวจสอบ uid นี้กับ LINE ก่อนบันทึก
          หากนักศึกษายังไม่ได้เพิ่ม Official Account เป็นเพื่อน จะเชื่อมต่อไม่สำเร็จ
          <br />
          เมื่อยืนยันได้แล้วระบบจะส่งข้อความต้อนรับให้อัตโนมัติ
        </div>
      </div>

      {error && <InlineMessage tone="error">{error}</InlineMessage>}

      <ModalActions>
        {alreadyConnected && (
          <Button
            variant="ghost"
            onClick={() => void disconnect()}
            style={{ marginRight: 'auto', color: theme.danger }}
          >
            ยกเลิกการเชื่อมต่อ
          </Button>
        )}
        <Button variant="ghost" onClick={onClose}>
          ปิด
        </Button>
        <Button
          onClick={() => void connect()}
          style={student ? undefined : { opacity: 0.5, cursor: 'not-allowed' }}
        >
          {status === 'working' ? 'กำลังตรวจสอบ...' : alreadyConnected ? 'เชื่อมต่อใหม่' : 'เชื่อมต่อ'}
        </Button>
      </ModalActions>
    </Modal>
  );
}
