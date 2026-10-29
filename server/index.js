// API server for ระบบแจ้งเตือนนักศึกษาผ่าน LINE.
//
// Two responsibilities:
//
// 1. CRUD over PostgreSQL for users, majors, students, groups and send history.
// 2. Proxying the LINE Messaging API (see routes/line.js for why that has to
//    happen server-side).

import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { pool } from './db/pool.js';
import { isCompromisedToken } from './compromised-tokens.js';
import { requireAuth } from './middleware/auth.js';
import { compressResponses, securityHeaders, serveFrontend } from './middleware/web.js';
import { authRouter } from './routes/auth.js';
import { dataRouter } from './routes/data.js';
import { isMockMode, lineRouter, resolveToken } from './routes/line.js';
import { asyncRoute, describeDbError } from './routes/helpers.js';

// API_PORT wins over PORT, in that order, for a specific reason: local dev
// tooling sets PORT to Vite's port, and inheriting that made the API try to
// bind the same port as the web server. .env pins API_PORT for development, so
// it takes precedence there. Hosting platforms assign PORT and require the
// service to listen on it, and they do not set API_PORT — so PORT wins in
// production without any extra configuration.
const PORT = Number(process.env.API_PORT ?? process.env.PORT ?? 8787);

// Refuse a token that is known to have leaked. Without this, a stale .env on
// any machine could quietly put the compromised credential back into service.
if (isCompromisedToken(process.env.LINE_CHANNEL_ACCESS_TOKEN)) {
  console.error(
    `
[line] ⛔ Channel Access Token นี้ถูกระบุว่ารั่วไหลแล้ว จึงไม่อนุญาตให้ใช้

     token ตัวนี้ถูกฝังไว้ในไฟล์ดีไซน์ที่แชร์กันได้ ใครที่เห็นไฟล์นั้นจึงส่งข้อความ
     ในนาม Official Account ของคุณได้

     วิธีแก้:
       1. เข้า https://developers.line.biz/console/ -> Channel -> แท็บ Messaging API
       2. กด Issue เพื่อออก token ตัวใหม่
       3. กด Revoke ที่ token ตัวเก่า
       4. นำ token ตัวใหม่มาใส่ใน LINE_CHANNEL_ACCESS_TOKEN ของไฟล์ .env

     ระหว่างนี้ถ้าต้องการรันระบบต่อ ให้ลบค่า LINE_CHANNEL_ACCESS_TOKEN ออก
     ระบบจะทำงานในโหมดจำลอง (ไม่ส่งข้อความจริง)
`,
  );
  process.exit(1);
}

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const app = express();
app.use(securityHeaders());
app.use(compressResponses());
app.use(express.json({ limit: '1mb' }));

// Behind a hosting proxy the real client address arrives in X-Forwarded-For.
// The rate limiter needs it to tell callers apart, and `secure` cookies need
// to know the original request was HTTPS.
//
// This is its own setting rather than being inferred from NODE_ENV: get it
// wrong in either direction and the login limiter misbehaves. Left on, an
// attacker not behind a proxy can forge the header to dodge the limit; left
// off behind a proxy, every user shares one bucket and a single wrong password
// locks out everybody.
if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1);

if (!process.env.SESSION_SECRET) {
  console.error(
    `
[auth] ไม่พบ SESSION_SECRET
     เพิ่มค่าสุ่มยาว ๆ ลงในไฟล์ .env เช่น SESSION_SECRET=<สุ่ม 32 ตัวอักษรขึ้นไป>
`,
  );
  process.exit(1);
}

// Sessions live in PostgreSQL, not in server memory: a restart or a second
// instance must not sign everyone out.
const PgSession = connectPgSimple(session);

app.use(
  session({
    store: new PgSession({ pool, tableName: 'session', createTableIfMissing: true }),
    name: 'lineNotify.sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      // Keeps the cookie unreadable from JavaScript, so an XSS hole cannot
      // steal the session.
      httpOnly: true,
      // HTTPS-only in production; plain HTTP in local development.
      secure: IS_PRODUCTION,
      // 'lax' still sends the cookie on normal navigation while blocking it on
      // cross-site form posts.
      sameSite: 'lax',
      path: '/',
    },
  }),
);

// Log every write. Reads are far too chatty to be useful, but knowing exactly
// which DELETE hit which id — and when — is worth the one line it costs.
app.use((req, _res, next) => {
  if (req.method !== 'GET') {
    const at = new Date().toLocaleTimeString('th-TH');
    console.log(`[api] ${at} ${req.method} ${req.originalUrl}`);
  }
  next();
});

// Everything under /api needs a session except the paths allowlisted inside
// requireAuth, so a route added later is closed by default.
app.use('/api', requireAuth);

app.use('/api/auth', authRouter);
app.use('/api/line', lineRouter);
app.use('/api', dataRouter);

app.get(
  '/api/health',
  asyncRoute(async (req, res) => {
    const { token, source } = resolveToken(req);

    let database = 'ok';
    try {
      await pool.query('SELECT 1');
    } catch (error) {
      database = `error: ${error.message}`;
    }

    res.json({ ok: database === 'ok', database, mock: isMockMode(token), tokenSource: source });
  }),
);

app.use('/api', (_req, res) => res.status(404).json({ message: 'ไม่พบ endpoint ที่เรียก' }));

// Serve the built frontend from the same origin as the API. Absent in
// development, where Vite serves it instead.
const servingFrontend = serveFrontend(app);

// Central error handler: turns constraint violations into readable Thai and
// keeps stack traces out of the response body.
// eslint-disable-next-line no-unused-vars -- Express identifies this by arity.
app.use((error, _req, res, _next) => {
  const friendly = describeDbError(error);
  if (friendly) return res.status(409).json({ message: friendly });

  console.error('[api]', error);
  res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
});

async function start() {
  try {
    await pool.query('SELECT 1');
    console.log('[db] เชื่อมต่อ PostgreSQL สำเร็จ');
  } catch (error) {
    console.error(
      `\n[db] เชื่อมต่อฐานข้อมูลไม่สำเร็จ: ${error.message}\n` +
        '     ตรวจสอบค่า DATABASE_URL ในไฟล์ .env และว่า PostgreSQL ทำงานอยู่\n' +
        '     จากนั้นสร้างตารางด้วย: npm run db:setup\n',
    );
  }

  const { token, source } = resolveToken(null);
  const mode = isMockMode(token) ? 'โหมดจำลอง (ไม่ส่งจริง)' : `ส่งจริง (token: ${source})`;
  app.listen(PORT, () => {
    console.log(`[api] เซิร์ฟเวอร์ทำงานที่ http://localhost:${PORT} — LINE: ${mode}`);
    if (servingFrontend) {
      console.log('[web] เสิร์ฟหน้าเว็บจาก dist/ ที่พอร์ตเดียวกัน');
    } else if (IS_PRODUCTION) {
      console.warn('[web] ไม่พบโฟลเดอร์ dist/ — รัน npm run build ก่อน ไม่งั้นจะเปิดหน้าเว็บไม่ได้');
    }
    if (!process.env.TRUST_PROXY && IS_PRODUCTION) {
      console.warn(
        '[web] ยังไม่ได้ตั้ง TRUST_PROXY=true — ถ้าอยู่หลัง proxy ของ host ' +
          'การจำกัดจำนวนครั้งล็อกอินจะนับรวมผู้ใช้ทุกคนเป็นคนเดียวกัน',
      );
    }
  });
}

start();
