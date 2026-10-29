import { useState } from 'react';
import { ORG_NAME, theme } from '../theme';
import type { User } from '../types';
import { ApiError, login } from '../lib/api';
import { Modal } from '../components/ui';

type Phase = 'form' | 'success' | 'fail';

export function LoginPage({ onAuthenticated }: { onAuthenticated: (user: User) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showEmptyError, setShowEmptyError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<Phase>('form');
  const [matchedUser, setMatchedUser] = useState<User | null>(null);
  const [failMessage, setFailMessage] = useState('');

  /**
   * Credentials are checked server-side against a bcrypt hash — the browser
   * never receives a password hash, and no password leaves this component
   * except in the login request itself.
   */
  const submit = async () => {
    if (loading) return;

    const u = username.trim();
    const p = password.trim();
    if (!u || !p) {
      setShowEmptyError(true);
      return;
    }

    setShowEmptyError(false);
    setLoading(true);

    try {
      const { user } = await login(u, p, rememberMe);
      setMatchedUser(user);
      setPhase('success');
    } catch (error) {
      setFailMessage(
        error instanceof ApiError
          ? error.message
          : 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
      );
      setPhase('fail');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    fontSize: 14,
    padding: '11px 14px',
    border: `1px solid ${theme.border}`,
    borderRadius: 8,
    width: '100%',
    fontFamily: 'inherit',
    color: theme.textDark,
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  return (
    <>
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: theme.primary,
          padding: 24,
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: 380,
            maxWidth: '100%',
            background: '#fff',
            borderRadius: 14,
            padding: '36px 32px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 14,
              marginBottom: 28,
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 12,
                background: theme.accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: 19, fontWeight: 700, color: '#fff', letterSpacing: '0.3px' }}>
                SM
              </span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: theme.textDark }}>{ORG_NAME}</div>
              <div style={{ fontSize: 12.5, color: theme.textMuted, marginTop: 3 }}>ผ่าน LINE</div>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
          >
            <div>
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: theme.textMuted,
                  marginBottom: 6,
                }}
              >
                ชื่อผู้ใช้งาน
              </div>
              <input
                value={username}
                autoComplete="username"
                placeholder="กรอกชื่อผู้ใช้งาน"
                onChange={(e) => setUsername(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: theme.textMuted,
                  marginBottom: 6,
                }}
              >
                รหัสผ่าน
              </div>
              <input
                type="password"
                value={password}
                autoComplete="current-password"
                placeholder="กรอกรหัสผ่าน"
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
              />
            </div>

            {showEmptyError && (
              <div
                style={{
                  fontSize: 12.5,
                  color: theme.danger,
                  background: '#fdecea',
                  borderRadius: 7,
                  padding: '9px 12px',
                }}
              >
                กรุณากรอกชื่อผู้ใช้งานและรหัสผ่าน
              </div>
            )}

            <div
              onClick={() => setRememberMe((v) => !v)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <div
                style={{
                  width: 17,
                  height: 17,
                  borderRadius: 4,
                  border: `1.6px solid ${rememberMe ? theme.primary : theme.border}`,
                  background: rememberMe ? theme.primary : '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {rememberMe && <span style={{ color: '#fff', fontSize: 11, lineHeight: 1 }}>✓</span>}
              </div>
              <span style={{ fontSize: 13, color: theme.textDark }}>จดจำการเข้าสู่ระบบ</span>
            </div>

            <button
              type="submit"
              style={{
                marginTop: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 9,
                fontSize: 14,
                fontWeight: 700,
                padding: 12,
                borderRadius: 8,
                border: 'none',
                background: theme.primary,
                color: '#fff',
                cursor: 'pointer',
                opacity: loading ? 0.75 : 1,
              }}
            >
              {loading && (
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.35)',
                    borderTopColor: '#fff',
                    animation: 'loginSpin 0.7s linear infinite',
                  }}
                />
              )}
              <span>{loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}</span>
            </button>
          </form>

        </div>
      </div>

      {phase === 'success' && matchedUser && (
        <Modal width={360}>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'rgba(58,140,90,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <span style={{ color: theme.success, fontSize: 24, fontWeight: 700 }}>✓</span>
            </div>
            <div
              style={{ fontSize: 16, fontWeight: 700, color: theme.textDark, marginBottom: 6 }}
            >
              เข้าสู่ระบบเรียบร้อยแล้ว
            </div>
            <div style={{ fontSize: 13, color: theme.textMuted, marginBottom: 22 }}>
              ยินดีต้อนรับ {matchedUser.fullName}
            </div>
            <div
              onClick={() => onAuthenticated(matchedUser)}
              style={{
                textAlign: 'center',
                fontSize: 14,
                fontWeight: 700,
                padding: 11,
                borderRadius: 8,
                background: theme.primary,
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              เข้าสู่ระบบ
            </div>
          </div>
        </Modal>
      )}

      {phase === 'fail' && (
        <Modal width={380}>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'rgba(192,57,43,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <span style={{ color: theme.danger, fontSize: 24, fontWeight: 700 }}>!</span>
            </div>
            <div
              style={{ fontSize: 16, fontWeight: 700, color: theme.textDark, marginBottom: 6 }}
            >
              เข้าสู่ระบบไม่สำเร็จ
            </div>
            <div
              style={{
                fontSize: 13,
                lineHeight: 1.6,
                color: theme.textMuted,
                marginBottom: 22,
              }}
            >
              {failMessage}
            </div>
            <div
              onClick={() => {
                setPhase('form');
                setPassword('');
              }}
              style={{
                textAlign: 'center',
                fontSize: 14,
                fontWeight: 700,
                padding: 11,
                borderRadius: 8,
                background: theme.primary,
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              ตกลง
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
