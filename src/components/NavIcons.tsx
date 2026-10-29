/**
 * Sidebar glyphs, built from positioned divs exactly as the design drew them.
 * Kept as CSS shapes rather than swapped for an icon font so the sidebar renders
 * identically without pulling in a dependency.
 */

export type NavIconName =
  | 'dashboard'
  | 'users'
  | 'majors'
  | 'students'
  | 'groups'
  | 'mail'
  | 'history'
  | 'reports'
  | 'recipients'
  | 'settings';

const box = { flexShrink: 0 } as const;

export function NavIcon({ name, color, accent }: { name: NavIconName; color: string; accent: string }) {
  switch (name) {
    case 'dashboard':
      return (
        <div
          style={{
            ...box,
            width: 14,
            height: 14,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: '1fr 1fr',
            gap: 2,
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ background: color, borderRadius: 1.5 }} />
          ))}
        </div>
      );

    case 'mail':
      return (
        <div
          style={{
            ...box,
            width: 14,
            height: 10,
            position: 'relative',
            background: '#ffffff',
            border: `1px solid ${accent}`,
            borderRadius: 2,
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -1,
              left: -1,
              width: 0,
              height: 0,
              borderLeft: '7px solid transparent',
              borderRight: '7px solid transparent',
              borderTop: `6px solid ${accent}`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 1,
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '5px solid #ffffff',
            }}
          />
        </div>
      );

    case 'reports':
      return (
        <div
          style={{
            ...box,
            width: 11,
            height: 14,
            position: 'relative',
            border: `1.3px solid ${color}`,
            borderRadius: 2,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1.5,
          }}
        >
          <div style={{ width: 6, height: 1.3, background: color }} />
          <div style={{ width: 6, height: 1.3, background: color }} />
          <div style={{ width: 4, height: 1.3, background: color }} />
        </div>
      );

    case 'history':
      return (
        <div
          style={{
            ...box,
            width: 13,
            height: 13,
            borderRadius: '50%',
            border: `1.5px solid ${color}`,
            position: 'relative',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 1,
              left: 5.5,
              width: 1.5,
              height: 5,
              background: color,
              borderRadius: 1,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 5,
              left: 5.5,
              width: 4,
              height: 1.5,
              background: color,
              borderRadius: 1,
            }}
          />
        </div>
      );

    case 'groups':
      return (
        <div style={{ ...box, width: 14, height: 14, position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              top: 1,
              left: 0,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: color,
              opacity: 0.55,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 1,
              right: 0,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: color,
            }}
          />
        </div>
      );

    case 'users':
      return (
        <div style={{ ...box, width: 14, height: 14, position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 4,
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: color,
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 1,
              width: 12,
              height: 6,
              borderRadius: '6px 6px 0 0',
              background: color,
            }}
          />
        </div>
      );

    case 'majors':
      return (
        <div style={{ ...box, width: 14, height: 11, display: 'flex', gap: 1.5 }}>
          <div style={{ flex: 1, height: '100%', borderRadius: '2px 1px 1px 2px', background: color }} />
          <div style={{ flex: 1, height: '100%', borderRadius: '1px 2px 2px 1px', background: color }} />
        </div>
      );

    case 'recipients':
      return (
        <div style={{ ...box, width: 14, height: 14, position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: color,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: color,
              opacity: 0.55,
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 6,
              borderRadius: '6px 6px 2px 2px',
              background: color,
              opacity: 0.8,
            }}
          />
        </div>
      );

    case 'settings':
      return (
        <div
          style={{
            ...box,
            width: 14,
            height: 14,
            borderRadius: '50%',
            border: `1.6px solid ${color}`,
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <div style={{ width: 4, height: 4, borderRadius: '50%', background: color }} />
          {/* Four teeth at the cardinal points. */}
          <div
            style={{ position: 'absolute', top: -2.5, left: 6, width: 2, height: 3, background: color }}
          />
          <div
            style={{ position: 'absolute', bottom: -2.5, left: 6, width: 2, height: 3, background: color }}
          />
          <div
            style={{ position: 'absolute', left: -2.5, top: 6, width: 3, height: 2, background: color }}
          />
          <div
            style={{ position: 'absolute', right: -2.5, top: 6, width: 3, height: 2, background: color }}
          />
        </div>
      );

    case 'students':
      return (
        <div style={{ ...box, width: 14, height: 14, position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              top: 1,
              left: 1,
              width: 12,
              height: 6,
              background: color,
              clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 5,
              width: 1.5,
              height: 6,
              background: color,
            }}
          />
        </div>
      );
  }
}

export function LogoutIcon() {
  const stroke = 'rgba(255,255,255,0.68)';
  return (
    <div style={{ width: 14, height: 14, position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 1,
          width: 9,
          height: 12,
          border: `1.6px solid ${stroke}`,
          borderRight: 'none',
          borderRadius: '3px 0 0 3px',
        }}
      />
      <div
        style={{ position: 'absolute', right: 0, top: 6, width: 7, height: 1.6, background: stroke }}
      />
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 3.5,
          width: 0,
          height: 0,
          borderTop: '3px solid transparent',
          borderBottom: '3px solid transparent',
          borderLeft: `4px solid ${stroke}`,
        }}
      />
    </div>
  );
}

export function CalendarIcon({ color }: { color: string }) {
  return (
    <div
      style={{ width: 16, height: 15, border: `1.6px solid ${color}`, borderRadius: 2, position: 'relative' }}
    >
      <div
        style={{ position: 'absolute', top: -4, left: 2, width: 2, height: 4, background: color, borderRadius: 1 }}
      />
      <div
        style={{ position: 'absolute', top: -4, right: 2, width: 2, height: 4, background: color, borderRadius: 1 }}
      />
      <div style={{ position: 'absolute', top: 2.5, left: 0, right: 0, height: 1.4, background: color }} />
    </div>
  );
}

export function BellIcon({ color }: { color: string }) {
  return <div style={{ width: 16, height: 16, border: `2px solid ${color}`, borderRadius: '4px 4px 8px 8px' }} />;
}

/** The eye toggle beside password fields; the bar appears when revealed. */
export function EyeIcon({ crossed, color }: { crossed: boolean; color: string }) {
  return (
    <div
      style={{
        width: 18,
        height: 11,
        border: `1.6px solid ${color}`,
        borderRadius: '50% / 100%',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
      {crossed && (
        <div
          style={{
            position: 'absolute',
            left: -2,
            right: -2,
            top: '50%',
            height: 1.6,
            background: color,
            transform: 'rotate(-30deg)',
          }}
        />
      )}
    </div>
  );
}
