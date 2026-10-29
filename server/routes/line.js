// LINE Messaging API integration.
//
// Nothing here can run in the browser: LINE sends no CORS headers, so a push or
// profile lookup from a page is always blocked. Routing through the server also
// keeps the channel access token out of the client entirely.

import express from 'express';
import { randomUUID } from 'node:crypto';
import { query, queryOne } from '../db/pool.js';
import { requireAdmin } from '../middleware/auth.js';
import { asyncRoute, str } from './helpers.js';

export const lineRouter = express.Router();

const LINE_API = 'https://api.line.me/v2/bot';

/** LINE accepts at most 500 recipients per multicast call. */
const MULTICAST_LIMIT = 500;
const WELCOME_TEXT =
  'ยืนยันการเชื่อมต่อระบบแจ้งเตือนนักศึกษาผ่าน LINE เรียบร้อยแล้ว\n' +
  'ต่อจากนี้ท่านจะได้รับข่าวสารและประกาศจากงานทะเบียนผ่านช่องทางนี้';

/**
 * Resolves the token to use for a request.
 *
 * Only the server's own configuration is consulted. An earlier version accepted
 * a token from an `x-line-token` header as a local-demo convenience, which made
 * this an open relay: anyone could have had the server send messages with a
 * token of their choosing. The header is now ignored entirely.
 */
export function resolveToken() {
  const serverToken = (process.env.LINE_CHANNEL_ACCESS_TOKEN ?? '').trim();
  return serverToken
    ? { token: serverToken, source: 'server' }
    : { token: '', source: 'none' };
}

/** True when there is no usable token, so calls are simulated rather than real. */
export function isMockMode(token) {
  return !token || process.env.LINE_MOCK === 'true';
}

/**
 * Fetches a LINE user profile.
 *
 * This doubles as the connection check: LINE only returns a profile when the
 * user has added this Official Account as a friend. A 404 therefore means
 * "valid-looking id, but this person has not added the OA" — which is exactly
 * what the operator needs to be told.
 */
async function fetchLineProfile(uid, token) {
  const response = await fetch(`${LINE_API}/profile/${encodeURIComponent(uid)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.ok) {
    const body = await response.json();
    return { ok: true, profile: body };
  }

  const body = await response.json().catch(() => ({}));

  const message =
    response.status === 404
      ? 'ไม่พบผู้ใช้รายนี้ — นักศึกษายังไม่ได้เพิ่ม LINE Official Account เป็นเพื่อน หรือ UID ไม่ถูกต้อง'
      : response.status === 401 || response.status === 403
        ? 'Channel Access Token ไม่ถูกต้องหรือหมดอายุ — ตรวจสอบค่าในไฟล์ .env ของเซิร์ฟเวอร์'
        : (body.message ?? `LINE ตอบกลับด้วยสถานะ ${response.status}`);

  return { ok: false, status: response.status, message };
}

/** Pushes one text message to a single recipient. */
async function pushText(uid, text, token) {
  const response = await fetch(`${LINE_API}/message/push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ to: uid, messages: [{ type: 'text', text }] }),
  });

  if (response.ok) return { to: uid, ok: true };

  const body = await response.json().catch(() => ({}));
  return {
    to: uid,
    ok: false,
    status: response.status,
    message: body.message ?? `HTTP ${response.status}`,
  };
}

/**
 * Sends one text to many recipients in a single call.
 *
 * Unlike push, multicast delivers to a whole batch at once — sending to 400
 * students is one request instead of 400.
 *
 * IMPORTANT: LINE answers 200 for the batch as a whole and never reports
 * per-recipient results. A user id that is malformed, unknown, or belongs to
 * someone who has not added the Official Account is silently dropped and still
 * counts toward that 200. So a success here means "LINE accepted the request",
 * NOT "every student received it" — the wording surfaced to the operator has to
 * reflect that. Use /api/line/connect beforehand to prove a uid is reachable.
 */
async function multicast(uids, text, token) {
  const response = await fetch(`${LINE_API}/message/multicast`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      // Makes a retried request idempotent, so a network hiccup cannot deliver
      // the same announcement to a student twice.
      'X-Line-Retry-Key': randomUUID(),
    },
    body: JSON.stringify({ to: uids, messages: [{ type: 'text', text }] }),
  });

  if (response.ok) return { ok: true, count: uids.length };

  const body = await response.json().catch(() => ({}));
  return {
    ok: false,
    count: uids.length,
    status: response.status,
    message: body.message ?? `HTTP ${response.status}`,
  };
}

/** Splits a list into chunks of at most `size`. */
function chunk(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

/** Row -> the camelCase shape the frontend uses. */
const toStudent = (row) => ({
  id: row.id,
  studentId: row.student_id,
  prefix: row.prefix,
  firstLast: row.first_last,
  gender: row.gender,
  major: row.major ?? '',
  phone: row.phone ?? '',
  email: row.email ?? '',
  lineId: row.line_id ?? '',
  lineUid: row.line_uid ?? '',
  lineDisplayName: row.line_display_name ?? '',
  linePictureUrl: row.line_picture_url ?? '',
  lineConnectedAt: row.line_connected_at ? row.line_connected_at.toISOString() : null,
});

/* ------------------------------------------------------------------ verify */

/** Checks the configured token by asking LINE for this bot's own profile. */
lineRouter.post(
  '/verify',
  requireAdmin,
  asyncRoute(async (req, res) => {
    const { token } = resolveToken(req);

    if (isMockMode(token)) {
      return res.json({
        ok: true,
        mock: true,
        displayName: 'งานทะเบียนและประมวลผล มหาวิทยาลัย (จำลอง)',
      });
    }

    try {
      const response = await fetch(`${LINE_API}/info`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        return res.status(response.status).json({
          ok: false,
          mock: false,
          message: body.message ?? `LINE ตอบกลับด้วยสถานะ ${response.status}`,
        });
      }
      res.json({
        ok: true,
        mock: false,
        displayName: body.displayName ?? '',
        basicId: body.basicId ?? '',
      });
    } catch (error) {
      res
        .status(502)
        .json({ ok: false, mock: false, message: `ไม่สามารถติดต่อ LINE API ได้: ${error.message}` });
    }
  }),
);

/* ----------------------------------------------------------------- connect */

/**
 * Links a student to the Official Account.
 *
 * Verifies the uid with LINE before writing anything, so a saved connection
 * always reflects a real friendship rather than a typo. Sends a welcome message
 * only after the profile check passes.
 */
lineRouter.post(
  '/connect',
  asyncRoute(async (req, res) => {
    const studentId = str(req.body?.studentId);
    const lineUid = str(req.body?.lineUid);
    const sendWelcome = req.body?.sendWelcome !== false;

    if (!studentId) return res.status(400).json({ message: 'ไม่ได้ระบุรหัสนักศึกษา' });
    if (!lineUid) return res.status(400).json({ message: 'กรุณาระบุ LINE User ID' });

    // LINE user ids are always a 'U' followed by 32 hex characters. Catching the
    // format here turns a confusing 404 into a precise message.
    if (!/^U[0-9a-f]{32}$/i.test(lineUid)) {
      return res.status(400).json({
        message:
          'รูปแบบ LINE User ID ไม่ถูกต้อง — ต้องขึ้นต้นด้วยตัว U แล้วตามด้วยตัวอักษรและตัวเลข 32 ตัว',
      });
    }

    const student = await queryOne('SELECT id FROM students WHERE student_id = $1', [studentId]);
    if (!student) {
      return res
        .status(404)
        .json({ message: `ไม่พบนักศึกษารหัส ${studentId} ในระบบ — กรุณาเพิ่มข้อมูลนักศึกษาก่อน` });
    }

    // The same uid pointing at two students would make sends ambiguous.
    const taken = await queryOne(
      'SELECT student_id FROM students WHERE line_uid = $1 AND student_id <> $2',
      [lineUid, studentId],
    );
    if (taken) {
      return res.status(409).json({
        message: `LINE User ID นี้ถูกใช้กับนักศึกษารหัส ${taken.student_id} แล้ว`,
      });
    }

    const { token } = resolveToken(req);
    const mock = isMockMode(token);

    let profile;
    let welcomeSent = false;

    if (mock) {
      profile = { displayName: `ผู้ใช้ทดลอง ${studentId}`, pictureUrl: '' };
      welcomeSent = sendWelcome;
    } else {
      let result;
      try {
        result = await fetchLineProfile(lineUid, token);
      } catch (error) {
        return res
          .status(502)
          .json({ message: `ไม่สามารถติดต่อ LINE API ได้: ${error.message}` });
      }

      if (!result.ok) {
        return res.status(result.status === 404 ? 404 : 502).json({ message: result.message });
      }

      profile = result.profile;

      if (sendWelcome) {
        const push = await pushText(lineUid, WELCOME_TEXT, token).catch((error) => ({
          ok: false,
          message: error.message,
        }));
        welcomeSent = push.ok;
        // A failed welcome does not undo the link — the profile check already
        // proved the connection is real, so the link is still saved below.
      }
    }

    const updated = await queryOne(
      `WITH updated AS (
         UPDATE students SET
           line_uid          = $2,
           line_display_name = $3,
           line_picture_url  = $4,
           line_connected_at = now()
         WHERE student_id = $1
         RETURNING *
       )
       SELECT u.*, m.name AS major FROM updated u LEFT JOIN majors m ON m.id = u.major_id`,
      [studentId, lineUid, profile.displayName ?? '', profile.pictureUrl ?? ''],
    );

    res.json({
      ok: true,
      mock,
      welcomeSent,
      profile: { displayName: profile.displayName ?? '', pictureUrl: profile.pictureUrl ?? '' },
      student: toStudent(updated),
      message: mock
        ? 'จำลองการเชื่อมต่อสำเร็จ (ยังไม่ได้ตั้งค่า Channel Access Token)'
        : 'เชื่อมต่อกับ LINE Official Account สำเร็จ',
    });
  }),
);

/** Clears the verified connection, keeping the student record itself. */
lineRouter.post(
  '/disconnect',
  asyncRoute(async (req, res) => {
    const studentId = str(req.body?.studentId);
    if (!studentId) return res.status(400).json({ message: 'ไม่ได้ระบุรหัสนักศึกษา' });

    const updated = await queryOne(
      `WITH updated AS (
         UPDATE students SET
           line_display_name = '',
           line_picture_url  = '',
           line_connected_at = NULL
         WHERE student_id = $1
         RETURNING *
       )
       SELECT u.*, m.name AS major FROM updated u LEFT JOIN majors m ON m.id = u.major_id`,
      [studentId],
    );

    if (!updated) return res.status(404).json({ message: 'ไม่พบนักศึกษารายนี้' });

    res.json({ ok: true, student: toStudent(updated), message: 'ยกเลิกการเชื่อมต่อเรียบร้อยแล้ว' });
  }),
);

/* ---------------------------------------------------------- send to group */

/**
 * Sends one announcement to every reachable member of a student group.
 *
 * The recipient list is resolved here rather than in the browser: the client
 * only names a group, so it cannot send to an arbitrary uid, and the recorded
 * recipient count always matches who the server actually addressed.
 *
 * Delivery uses multicast, so a 400-student group costs one API call per 500
 * members instead of one call per student.
 */
lineRouter.post(
  '/messages/send',
  asyncRoute(async (req, res) => {
    const group = str(req.body?.group);
    const title = str(req.body?.title);
    const text = str(req.body?.text);
    const msgType = str(req.body?.msgType) || 'ข้อความ';

    if (!group) return res.status(400).json({ message: 'กรุณาเลือกกลุ่มผู้รับ' });
    if (!text) return res.status(400).json({ message: 'กรุณาระบุเนื้อหาข้อความก่อนส่ง' });

    const members = await query(
      `SELECT s.student_id, s.line_uid
       FROM student_groups g
       JOIN students s ON s.student_id = g.student_id
       WHERE g.group_name = $1
       ORDER BY s.student_id`,
      [group],
    );

    if (members.length === 0) {
      return res
        .status(404)
        .json({ message: `ไม่พบนักศึกษาในกลุ่ม "${group}" — กรุณาจัดกลุ่มนักศึกษาก่อนส่งข้อความ` });
    }

    // A student without a uid cannot be reached; count them so the operator
    // knows the announcement did not go to the whole group.
    const reachable = members.filter((m) => m.line_uid?.trim());
    const skippedNoUid = members.length - reachable.length;

    // The same person appearing twice in one multicast is rejected by LINE.
    const uids = [...new Set(reachable.map((m) => m.line_uid.trim()))];

    if (uids.length === 0) {
      return res.status(400).json({
        message:
          `นักศึกษาในกลุ่ม "${group}" ทั้ง ${members.length} คนยังไม่มี Uid LINE — ` +
          'กรุณาเพิ่ม Uid LINE ที่หน้าข้อมูลนักศึกษา หรือกดเชื่อมต่อ LINE OA ก่อน',
      });
    }

    const messageText = title ? `${title}\n\n${text}` : text;
    const { token } = resolveToken(req);
    const mock = isMockMode(token);
    const batches = chunk(uids, MULTICAST_LIMIT);

    let sent = 0;
    let failed = 0;
    let firstError = '';

    if (mock) {
      sent = uids.length;
    } else {
      for (const batch of batches) {
        const result = await multicast(batch, messageText, token).catch((error) => ({
          ok: false,
          count: batch.length,
          message: error.message,
        }));
        if (result.ok) {
          sent += result.count;
        } else {
          failed += result.count;
          if (!firstError) firstError = result.message ?? '';
        }
      }
    }

    const succeeded = failed === 0;

    // Record the attempt either way — a failed announcement is exactly what an
    // operator needs to find again later.
    const historyRow = await queryOne(
      `INSERT INTO history_log
         (sent_at, template, msg_type, group_name, recipient_count, success, body)
       VALUES (now(), $1, $2, $3, $4, $5, $6)
       RETURNING id, sent_at`,
      [title || '(ไม่มีหัวข้อ)', msgType, group, sent, succeeded, text],
    );

    const parts = [];
    if (mock) {
      parts.push(`จำลองการส่งสำเร็จ ${sent} คน (ยังไม่ได้ตั้งค่า Channel Access Token)`);
    } else if (succeeded) {
      // Deliberately "ส่งออกแล้ว" not "ส่งสำเร็จ": LINE accepted the batch but
      // does not confirm who received it, and quietly drops any uid that is not
      // a friend of the Official Account.
      parts.push(`ส่งออกไปยัง LINE แล้ว ${sent} คน`);
      if (batches.length > 1) parts.push(`แบ่งส่ง ${batches.length} ชุด`);
      parts.push('LINE ไม่แจ้งผลรายบุคคล ผู้ที่ยังไม่ได้เพิ่ม OA เป็นเพื่อนจะไม่ได้รับ');
    } else {
      parts.push(`ส่งไม่สำเร็จ ${failed} คน จากทั้งหมด ${uids.length} คน`);
      if (firstError) parts.push(firstError);
    }
    if (skippedNoUid > 0) parts.push(`ข้าม ${skippedNoUid} คนที่ยังไม่มี Uid LINE`);

    res.status(succeeded ? 200 : 502).json({
      ok: succeeded,
      mock,
      group,
      totalInGroup: members.length,
      recipients: uids.length,
      sent,
      failed,
      skippedNoUid,
      batches: batches.length,
      historyId: historyRow.id,
      message: parts.join(' · '),
    });
  }),
);

/* -------------------------------------------------------------------- push */

/**
 * Pushes one text message to each recipient uid.
 *
 * LINE's push endpoint takes a single recipient per call, so this fans out and
 * reports per-recipient results — the UI needs to know that 8 of 10 succeeded,
 * not just that "something failed".
 */
lineRouter.post(
  '/push',
  asyncRoute(async (req, res) => {
    const { to, text } = req.body ?? {};
    const recipients = (Array.isArray(to) ? to : [to]).filter(
      (uid) => typeof uid === 'string' && uid.trim(),
    );

    if (recipients.length === 0) {
      return res.status(400).json({
        ok: false,
        message: 'ไม่พบ LINE User ID ของผู้รับ — กรุณาตรวจสอบว่านักศึกษาในกลุ่มมี Uid LINE แล้ว',
      });
    }
    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ ok: false, message: 'ไม่มีเนื้อหาข้อความที่จะส่ง' });
    }

    const { token } = resolveToken(req);

    if (isMockMode(token)) {
      return res.json({
        ok: true,
        mock: true,
        sent: recipients.length,
        failed: 0,
        results: recipients.map((uid) => ({ to: uid, ok: true })),
        message: `จำลองการส่งสำเร็จ ${recipients.length} คน (ยังไม่ได้ตั้งค่า Channel Access Token)`,
      });
    }

    const results = await Promise.all(
      recipients.map((uid) =>
        pushText(uid, text, token).catch((error) => ({
          to: uid,
          ok: false,
          message: error.message,
        })),
      ),
    );

    const failed = results.filter((r) => !r.ok);
    res.json({
      ok: failed.length === 0,
      mock: false,
      sent: results.length - failed.length,
      failed: failed.length,
      results,
      message: failed.length
        ? `ส่งไม่สำเร็จ ${failed.length}/${results.length} คน — ${failed[0].message ?? ''}`
        : `ส่งสำเร็จทั้งหมด ${results.length} คน`,
    });
  }),
);
