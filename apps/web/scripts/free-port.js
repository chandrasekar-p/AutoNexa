#!/usr/bin/env node
/**
 * Runs automatically before `next dev`/`next start` (see package.json's
 * predev/prestart hooks) — kills whatever is already listening on the
 * target port first. Next.js itself doesn't fail on a busy port, it just
 * silently falls back to :3001 (or the next free port) — which has
 * already caused real confusion this project's history: a second
 * accidental instance ended up serving on the wrong port while everyone
 * kept looking at :3000. Killing any stale listener first keeps the app
 * on its expected port instead of drifting.
 */
const { execSync } = require('child_process');

const port = process.argv[2] || process.env.PORT || '3000';

let pids = [];
try {
  pids = execSync(`lsof -ti:${port}`, { stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .trim()
    .split('\n')
    .filter(Boolean);
} catch {
  // lsof exits non-zero when nothing matches — port is already free.
}

if (pids.length === 0) {
  process.exit(0);
}

console.log(`[free-port] Port ${port} is already in use by pid(s) ${pids.join(', ')} — stopping so this server can bind cleanly.`);
for (const pid of pids) {
  try {
    process.kill(Number(pid), 'SIGKILL');
  } catch {
    // Already gone.
  }
}
execSync('sleep 0.3');
