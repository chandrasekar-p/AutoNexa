#!/usr/bin/env node
/**
 * Runs automatically before start/start:dev (see package.json's
 * prestart/prestart:dev hooks) — kills whatever is already listening on
 * the target port before Nest tries to bind to it.
 *
 * Exists because Nest doesn't retry on EADDRINUSE: if a previous
 * `start:dev` was left running (or its process outlived a deleted dist/
 * directory — Linux keeps a deleted-but-open file's process alive,
 * serving stale in-memory code with no way to tell from the outside), the
 * new instance would silently fail to bind while looking like it started
 * fine, leaving the old process to keep answering requests with
 * out-of-date code. That exact scenario caused real, confusing bugs this
 * project's history (login working with stale code, dashboard fixes not
 * appearing) — this makes every start self-healing instead of relying on
 * someone remembering to `lsof -i:PORT` and kill it by hand first.
 */
const { execSync } = require('child_process');

const port = process.argv[2] || process.env.PORT || '4000';

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
// Give the OS a beat to actually release the socket before the caller tries to bind it.
execSync('sleep 0.3');
