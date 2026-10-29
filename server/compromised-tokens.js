// Channel access tokens known to be compromised.
//
// The token the project started with was hardcoded into the shared Claude
// Design file, so anyone with access to that project could send messages as the
// Official Account. Refusing it here means a stale copy in a .env — on a laptop,
// a server, a teammate's machine — cannot quietly go back into service.
//
// Only SHA-256 fingerprints are stored: the list is safe to commit, and no
// usable secret lives in the repository.

import { createHash } from 'node:crypto';

const COMPROMISED_SHA256 = new Set([
  // Leaked via the `mockToken` constant in "Line Notify System.dc.html".
  '85d24925c4e46ebba125206c3912bf332ef09b70157d4cda7b7a304e7bec5b5e',
]);

/** True when this exact token has been marked as leaked. */
export function isCompromisedToken(token) {
  if (!token) return false;
  const fingerprint = createHash('sha256').update(token.trim()).digest('hex');
  return COMPROMISED_SHA256.has(fingerprint);
}
