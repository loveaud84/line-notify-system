/**
 * Client for the Express LINE proxy in server/index.js.
 *
 * Nothing here talks to api.line.me directly — that request is blocked by CORS
 * from a browser, and it would leak the channel access token to every visitor.
 */

export interface PushResult {
  ok: boolean;
  /** True when the server had no token and simulated the send. */
  mock: boolean;
  sent: number;
  failed: number;
  message: string;
}

export interface VerifyResult {
  ok: boolean;
  mock: boolean;
  displayName?: string;
  message?: string;
}

export interface SendGroupResult {
  ok: boolean;
  /** True when the server had no token and simulated the send. */
  mock: boolean;
  /** Everyone assigned to the group, including those with no LINE uid. */
  totalInGroup: number;
  /** Distinct uids the message was actually addressed to. */
  recipients: number;
  sent: number;
  failed: number;
  /** Group members skipped because they have no LINE uid on file. */
  skippedNoUid: number;
  /** How many multicast calls it took (500 recipients each). */
  batches: number;
  message: string;
}

export interface ConnectResult {
  ok: boolean;
  /** True when the server had no token and simulated the verification. */
  mock: boolean;
  /** False when the link was saved but the welcome message could not be sent. */
  welcomeSent: boolean;
  profile: { displayName: string; pictureUrl: string };
  message: string;
}

const NETWORK_ERROR =
  'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้ — ตรวจสอบว่ารันคำสั่ง npm run dev แล้วเซิร์ฟเวอร์ทำงานอยู่';

/**
 * Sends one announcement to a whole student group.
 *
 * Only the group name goes over the wire — the server resolves the LINE uids
 * from the database, dedupes them, sends by multicast, and writes the history
 * entry. That keeps the recorded recipient count honest and means the browser
 * never handles a recipient list it could tamper with.
 */
export async function sendGroupMessage(
  params: { group: string; title: string; text: string; msgType: string },
): Promise<SendGroupResult> {
  const empty = {
    mock: false,
    totalInGroup: 0,
    recipients: 0,
    sent: 0,
    failed: 0,
    skippedNoUid: 0,
    batches: 0,
  };

  try {
    const response = await fetch('/api/line/messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const body = await response.json().catch(() => ({}));
    return {
      ...empty,
      ...body,
      ok: response.ok && Boolean(body.ok),
      message: body.message ?? `เซิร์ฟเวอร์ตอบกลับด้วยสถานะ ${response.status}`,
    };
  } catch {
    return { ...empty, ok: false, message: NETWORK_ERROR };
  }
}

export async function pushMessage(
  recipients: string[],
  text: string,
): Promise<PushResult> {
  try {
    const response = await fetch('/api/line/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: recipients, text }),
    });
    const body = await response.json().catch(() => ({}));
    return {
      ok: Boolean(body.ok),
      mock: Boolean(body.mock),
      sent: body.sent ?? 0,
      failed: body.failed ?? recipients.length,
      message: body.message ?? `เซิร์ฟเวอร์ตอบกลับด้วยสถานะ ${response.status}`,
    };
  } catch {
    return { ok: false, mock: false, sent: 0, failed: recipients.length, message: NETWORK_ERROR };
  }
}

/**
 * Links a student to the Official Account.
 *
 * The server verifies the uid with LINE before saving, so a resolved `ok: true`
 * means the student really has added the OA — not merely that a uid was typed.
 */
export async function connectStudentToLine(
  studentId: string,
  lineUid: string,
): Promise<ConnectResult> {
  try {
    const response = await fetch('/api/line/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, lineUid }),
    });
    const body = await response.json().catch(() => ({}));
    return {
      ok: response.ok && Boolean(body.ok),
      mock: Boolean(body.mock),
      welcomeSent: Boolean(body.welcomeSent),
      profile: body.profile ?? { displayName: '', pictureUrl: '' },
      message: body.message ?? `เซิร์ฟเวอร์ตอบกลับด้วยสถานะ ${response.status}`,
    };
  } catch {
    return {
      ok: false,
      mock: false,
      welcomeSent: false,
      profile: { displayName: '', pictureUrl: '' },
      message: NETWORK_ERROR,
    };
  }
}

/** Clears a student's verified connection. */
export async function disconnectStudentFromLine(
  studentId: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    const response = await fetch('/api/line/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId }),
    });
    const body = await response.json().catch(() => ({}));
    return {
      ok: response.ok && Boolean(body.ok),
      message: body.message ?? `เซิร์ฟเวอร์ตอบกลับด้วยสถานะ ${response.status}`,
    };
  } catch {
    return { ok: false, message: NETWORK_ERROR };
  }
}

export async function verifyConnection(): Promise<VerifyResult> {
  try {
    const response = await fetch('/api/line/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const body = await response.json().catch(() => ({}));
    return {
      ok: Boolean(body.ok),
      mock: Boolean(body.mock),
      displayName: body.displayName,
      message: body.message,
    };
  } catch {
    return { ok: false, mock: false, message: NETWORK_ERROR };
  }
}
