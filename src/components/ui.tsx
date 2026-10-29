import type { CSSProperties, ReactNode } from 'react';
import { theme } from '../theme';

/* ------------------------------------------------------------------ layout */

export function Card({
  children,
  padding = 20,
  style,
}: {
  children: ReactNode;
  padding?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        background: '#fff',
        border: `1px solid ${theme.border}`,
        borderRadius: 10,
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ fontSize: 14.5, fontWeight: 700, color: theme.textDark, ...style }}>
      {children}
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: 15, fontWeight: 700, color: theme.textDark, marginBottom: 18 }}>
      {children}
    </div>
  );
}

/** Label above a form control. */
export function Field({
  label,
  children,
  style,
}: {
  label: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div style={style}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: theme.textMuted,
          marginBottom: 6,
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ inputs */

const controlStyle: CSSProperties = {
  fontSize: 13.5,
  padding: '11px 14px',
  border: `1px solid ${theme.border}`,
  borderRadius: 7,
  width: '100%',
  fontFamily: 'inherit',
  color: theme.textDark,
  outline: 'none',
  boxSizing: 'border-box',
};

export function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled,
  style,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  style?: CSSProperties;
}) {
  return (
    <input
      type={type}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{
        ...controlStyle,
        ...(disabled
          ? { color: theme.textMuted, background: theme.bg, cursor: 'not-allowed' }
          : null),
        ...style,
      }}
    />
  );
}

export function TextArea({
  value,
  onChange,
  placeholder,
  style,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  style?: CSSProperties;
}) {
  return (
    <textarea
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{
        ...controlStyle,
        padding: 14,
        lineHeight: 1.7,
        minHeight: 140,
        resize: 'vertical',
        ...style,
      }}
    />
  );
}

export interface Option {
  value: string;
  label: string;
}

/** Accepts either plain strings or {value,label} pairs, as the design mixed both. */
export function Select({
  value,
  onChange,
  options,
  compact,
  style,
}: {
  value: string;
  onChange: (value: string) => void;
  options: (Option | string)[];
  compact?: boolean;
  style?: CSSProperties;
}) {
  const normalised: Option[] = options.map((o) =>
    typeof o === 'string' ? { value: o, label: o } : o,
  );
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        ...controlStyle,
        background: '#fff',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        ...(compact ? { fontSize: 13, padding: '8px 12px', width: 'auto' } : null),
        ...style,
      }}
    >
      {normalised.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function SearchBox({
  value,
  onChange,
  placeholder,
  icon = '🔍',
  minWidth = 200,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: string;
  minWidth?: number;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 14px',
        border: `1px solid ${theme.border}`,
        borderRadius: 7,
        minWidth,
      }}
    >
      <span style={{ color: theme.textMuted, fontSize: 13 }}>{icon}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          border: 'none',
          outline: 'none',
          fontSize: 13,
          fontFamily: 'inherit',
          color: theme.textDark,
          width: '100%',
          background: 'transparent',
        }}
      />
    </div>
  );
}

/* ----------------------------------------------------------------- buttons */

type ButtonVariant = 'primary' | 'ghost' | 'danger';

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  style,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  style?: CSSProperties;
}) {
  const palette: Record<ButtonVariant, CSSProperties> = {
    primary: { background: theme.primary, color: '#fff', border: `1px solid ${theme.primary}` },
    ghost: { background: 'transparent', color: theme.textDark, border: `1px solid ${theme.border}` },
    danger: { background: theme.danger, color: '#fff', border: `1px solid ${theme.danger}` },
  };
  return (
    <div
      onClick={onClick}
      className="row-action"
      style={{
        padding: size === 'sm' ? '6px 12px' : '10px 18px',
        borderRadius: size === 'sm' ? 6 : 7,
        fontSize: size === 'sm' ? 12 : 13,
        fontWeight: 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        userSelect: 'none',
        ...palette[variant],
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** The small outlined buttons in the last column of every table. */
export function RowAction({
  children,
  onClick,
  tone = 'neutral',
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: 'neutral' | 'danger' | 'primary' | 'line';
}) {
  const tones = {
    neutral: { border: theme.border, color: theme.textDark },
    danger: { border: theme.dangerBorder, color: theme.danger },
    primary: { border: theme.border, color: theme.primary },
    line: { border: theme.lineGreenBorder, color: theme.lineGreen },
  }[tone];

  return (
    <div
      onClick={onClick}
      className="row-action"
      style={{
        fontSize: 12,
        fontWeight: 600,
        padding: '6px 12px',
        borderRadius: 6,
        border: `1px solid ${tones.border}`,
        color: tones.color,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ modals */

export function Modal({
  children,
  width = 420,
  onBackdropClick,
}: {
  children: ReactNode;
  width?: number;
  onBackdropClick?: () => void;
}) {
  return (
    <div
      onClick={onBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        background: theme.overlay,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 26,
          width,
          maxWidth: '92vw',
          maxHeight: '88vh',
          overflowY: 'auto',
          boxShadow: theme.modalShadow,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalTitle({ children, subtitle }: { children: ReactNode; subtitle?: string }) {
  return (
    <>
      <div
        style={{
          fontSize: 15.5,
          fontWeight: 700,
          color: theme.textDark,
          marginBottom: subtitle ? 4 : 20,
        }}
      >
        {children}
      </div>
      {subtitle && (
        <div style={{ fontSize: 12.5, color: theme.textMuted, marginBottom: 20 }}>{subtitle}</div>
      )}
    </>
  );
}

export function ModalActions({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
      {children}
    </div>
  );
}

/** Destructive confirmation, shared by all six "ยืนยันการลบ" dialogs. */
export function ConfirmDeleteModal({
  title,
  message,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal width={380} onBackdropClick={onCancel}>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          background: theme.dangerSoft,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <div style={{ width: 16, height: 16, borderRadius: 3, background: theme.danger }} />
      </div>
      <div style={{ fontSize: 15.5, fontWeight: 700, color: theme.textDark, marginBottom: 8 }}>
        {title}
      </div>
      <div
        style={{ fontSize: 13, lineHeight: 1.6, color: theme.textMuted, marginBottom: 22 }}
      >
        {message}
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={onCancel}>
          ยกเลิก
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ tables */

export function TableHead({ columns, template }: { columns: string[]; template: string }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: template,
        columnGap: 14,
        padding: '10px 12px',
        fontSize: 11.5,
        fontWeight: 700,
        color: theme.textMuted,
        borderBottom: `1px solid ${theme.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {columns.map((c) => (
        <div key={c}>{c}</div>
      ))}
    </div>
  );
}

export function TableRow({
  children,
  template,
}: {
  children: ReactNode;
  template: string;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: template,
        columnGap: 14,
        padding: '13px 12px',
        fontSize: 13,
        color: theme.textDark,
        borderBottom: `1px solid ${theme.border}`,
        alignItems: 'center',
      }}
    >
      {children}
    </div>
  );
}

/** Truncating table cell — the design applied this to nearly every column. */
export function Cell({
  children,
  muted,
  bold,
}: {
  children: ReactNode;
  muted?: boolean;
  bold?: boolean;
}) {
  return (
    <div
      style={{
        color: muted ? theme.textMuted : theme.textDark,
        fontWeight: bold ? 600 : undefined,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {children}
    </div>
  );
}

export function RowActions({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', gap: 8 }}>{children}</div>;
}

export function EmptyRow({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        padding: '32px 12px',
        textAlign: 'center',
        fontSize: 13,
        color: theme.textMuted,
      }}
    >
      {children}
    </div>
  );
}

export function StatusDot({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
      <div
        style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }}
      />
      <span style={{ fontSize: 12, fontWeight: 600, color }}>{label}</span>
    </div>
  );
}

export function Pill({
  children,
  color,
  background,
}: {
  children: ReactNode;
  color: string;
  background: string;
}) {
  return (
    <span
      style={{
        fontSize: 11.5,
        fontWeight: 600,
        color,
        background,
        padding: '4px 10px',
        borderRadius: 12,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------- pagination */

export function PaginationBar({
  page,
  totalPages,
  pageSize,
  pageNumbers,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  pageSize: number;
  pageNumbers: number[];
  pageSizeOptions: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const arrow = (glyph: string, onClick: () => void, dim: boolean) => (
    <div
      onClick={onClick}
      style={{
        width: 32,
        height: 32,
        borderRadius: 6,
        border: `1px solid ${theme.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: dim ? theme.disabled : theme.textDark,
        fontSize: 14,
        userSelect: 'none',
      }}
    >
      {glyph}
    </div>
  );

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 16,
        marginTop: 4,
        flexWrap: 'wrap',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ fontSize: 12, color: theme.textMuted, whiteSpace: 'nowrap' }}>
          หน้า {page} จาก {totalPages}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: theme.textMuted, whiteSpace: 'nowrap' }}>แสดง</span>
          <Select
            value={String(pageSize)}
            onChange={(v) => onPageSizeChange(Number(v))}
            options={pageSizeOptions.map((n) => ({ value: String(n), label: `${n} / หน้า` }))}
            compact
            style={{ fontSize: 12.5, padding: '6px 10px', borderRadius: 6 }}
          />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {arrow('‹', onPrev, page <= 1)}
        {pageNumbers.map((n) => {
          const active = n === page;
          return (
            <div
              key={n}
              onClick={() => onPageChange(n)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: 12.5,
                fontWeight: 600,
                background: active ? theme.primary : '#fff',
                color: active ? '#fff' : theme.textDark,
                border: `1px solid ${active ? theme.primary : theme.border}`,
                userSelect: 'none',
              }}
            >
              {n}
            </div>
          );
        })}
        {arrow('›', onNext, page >= totalPages)}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ alerts */

export function InlineMessage({ tone, children }: { tone: 'error' | 'success'; children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 12,
        marginTop: 12,
        lineHeight: 1.6,
        color: tone === 'error' ? theme.danger : theme.success,
      }}
    >
      {children}
    </div>
  );
}

export function ResultCount({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: 12.5, color: theme.textMuted, whiteSpace: 'nowrap' }}>{children}</div>
  );
}

export function Toolbar({ title, children }: { title: string; children: ReactNode }) {
  return (
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
      <CardTitle style={{ whiteSpace: 'nowrap' }}>{title}</CardTitle>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {children}
      </div>
    </div>
  );
}
