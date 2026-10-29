import express from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { queryOne } from '../db/pool.js';
import { asyncRoute, str } from './helpers.js';

export const authRouter = express.Router();

/** Session lifetime when "จดจำการเข้าสู่ระบบ" is ticked. */
const REMEMBER_ME_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Caps password guessing per IP.
 *
 * Counts only failed attempts, so someone signing in and out repeatedly is
 * never locked out of their own account.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'ลองเข้าสู่ระบบผิดหลายครั้งเกินไป กรุณารออีก 15 นาทีแล้วลองใหม่' },
});

/** The shape handed to the client — never includes the password hash. */
const publicUser = (row) => ({
  id: row.id,
  fullName: row.full_name,
  username: row.username ?? '',
  email: row.email ?? '',
  isAdmin: row.is_admin,
  isActive: row.is_active,
});

/**
 * Verifies a username and password against the stored bcrypt hash.
 *
 * The same message is returned whether the username is unknown or the password
 * is wrong, so this cannot be used to discover which accounts exist.
 */
authRouter.post(
  '/login',
  loginLimiter,
  asyncRoute(async (req, res) => {
    const username = str(req.body?.username);
    const password = str(req.body?.password);
    const rememberMe = req.body?.rememberMe === true;

    if (!username || !password) {
      return res.status(400).json({ message: 'กรุณากรอกชื่อผู้ใช้งานและรหัสผ่าน' });
    }

    const user = await queryOne('SELECT * FROM users WHERE username = $1', [username]);

    // Compare against a dummy hash when the user is missing, so a wrong
    // username takes the same time as a wrong password.
    const hash =
      user?.password_hash ?? '$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin';
    const passwordMatches = await bcrypt.compare(password, hash);

    if (!user || !passwordMatches) {
      return res
        .status(401)
        .json({ message: 'Username และ Password ไม่ถูกต้อง กรุณากรอกข้อมูลเข้าสู่ระบบใหม่' });
    }

    if (!user.is_active) {
      return res
        .status(403)
        .json({ message: 'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ' });
    }

    // New session id on every sign-in, so a session fixated before login
    // cannot be reused afterwards.
    req.session.regenerate((error) => {
      if (error) {
        console.error('[auth] regenerate ล้มเหลว:', error);
        return res.status(500).json({ message: 'ไม่สามารถสร้าง session ได้' });
      }

      req.session.user = publicUser(user);
      // Unticked: a browser-session cookie that dies when the browser closes.
      req.session.cookie.maxAge = rememberMe ? REMEMBER_ME_MS : null;

      req.session.save((saveError) => {
        if (saveError) {
          console.error('[auth] บันทึก session ล้มเหลว:', saveError);
          return res.status(500).json({ message: 'ไม่สามารถบันทึก session ได้' });
        }
        res.json({ user: req.session.user });
      });
    });
  }),
);

/** Who is signed in. The app calls this on load to restore the session. */
authRouter.get('/me', (req, res) => {
  if (!req.session?.user) {
    return res.status(401).json({ message: 'ยังไม่ได้เข้าสู่ระบบ' });
  }
  res.json({ user: req.session.user });
});

/** Destroys the session server-side, not just the client's copy. */
authRouter.post('/logout', (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      console.error('[auth] ทำลาย session ล้มเหลว:', error);
      return res.status(500).json({ message: 'ออกจากระบบไม่สำเร็จ' });
    }
    res.clearCookie('lineNotify.sid');
    res.json({ ok: true });
  });
});
