// Production web concerns: security headers, compression, and serving the
// built frontend.
//
// In development Vite serves the frontend on its own port and proxies /api
// here, so none of this runs. In production there is a single service: Express
// serves dist/ and the API from the same origin, which is also what keeps the
// session cookie working without any CORS configuration.

import express from 'express';
import compression from 'compression';
import helmet from 'helmet';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = join(__dirname, '..', '..', 'dist');

/**
 * Security headers.
 *
 * The CSP is written against what this app actually loads. React's `style`
 * props compile to inline style attributes, so 'unsafe-inline' is required for
 * styles — it is not required for scripts, which stay locked to 'self'.
 */
export function securityHeaders() {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // No inline or remote scripts: everything ships in the bundle.
        scriptSrc: ["'self'"],
        // Inline styles come from React style props; Google Fonts serves the
        // Thai typeface the design specifies.
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        // LINE profile pictures are shown after a verified connection.
        imgSrc: ["'self'", 'data:', 'https://profile.line-scdn.net'],
        // The page only ever calls its own API; LINE is contacted server-side.
        connectSrc: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
    // The app loads no cross-origin resources that this would break, and it
    // keeps the LINE profile images working.
    crossOriginEmbedderPolicy: false,
  });
}

export function compressResponses() {
  return compression();
}

/**
 * Serves the built frontend, when there is one.
 *
 * Returns false if dist/ is missing so the caller can warn instead of serving
 * 404s for every page — the most likely cause is a deploy that skipped
 * `npm run build`.
 */
export function serveFrontend(app) {
  if (!existsSync(DIST_DIR)) return false;

  // Hashed asset filenames can be cached hard; index.html must not be, or
  // browsers keep serving the previous deploy's bundle.
  app.use(
    express.static(DIST_DIR, {
      index: false,
      setHeaders: (res, path) => {
        if (path.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
        else res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      },
    }),
  );

  // Anything that is not an API route is the single-page app. Registered after
  // the API routers so it can never shadow them.
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(join(DIST_DIR, 'index.html'));
  });

  return true;
}

export { DIST_DIR };
