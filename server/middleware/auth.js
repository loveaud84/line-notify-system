// Access control for the API.
//
// Every /api route except sign-in and the health check goes through
// requireAuth, so a route added later is protected by default rather than
// forgotten. requireAdmin layers on top for the destructive operations.

/** Paths that must stay reachable without a session. */
const PUBLIC_PATHS = new Set(['/api/auth/login', '/api/health']);

/**
 * Rejects anything without a signed-in session.
 *
 * Mounted on /api as a whole: an endpoint has to be listed in PUBLIC_PATHS to
 * be reachable anonymously, which is the safe direction for the default.
 */
export function requireAuth(req, res, next) {
  if (PUBLIC_PATHS.has(req.originalUrl.split('?')[0])) return next();

  if (!req.session?.user) {
    return res.status(401).json({ message: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' });
  }
  next();
}

/**
 * Restricts a route to administrators.
 *
 * Reads the flag from the session rather than the request body, so a caller
 * cannot grant themselves admin by sending `isAdmin: true`.
 */
export function requireAdmin(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({ message: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' });
  }
  if (!req.session.user.isAdmin) {
    return res
      .status(403)
      .json({ message: 'คุณไม่มีสิทธิ์ดำเนินการนี้ — เฉพาะแอดมินเท่านั้น' });
  }
  next();
}
