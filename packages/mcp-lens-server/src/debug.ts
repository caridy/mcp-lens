/**
 * Debug logging for mcp-lens-server.
 *
 * Enable by setting MCP_LENS_DEBUG=1 (or any truthy value). Logs go to
 * stderr by default; set MCP_LENS_DEBUG_FILE to a path to write there
 * instead (appends, creates if missing).
 *
 * Each entry is a single JSON line with a timestamp, event type, and
 * payload. This makes it trivial to tail/grep in real time:
 *
 *   MCP_LENS_DEBUG=1 npx -y @mcp-lens/server 2>lens-debug.log
 *   tail -f lens-debug.log | jq .
 *
 * Or with a file:
 *
 *   MCP_LENS_DEBUG=1 MCP_LENS_DEBUG_FILE=./lens.log npx -y @mcp-lens/server
 */

import { appendFileSync, writeFileSync } from 'node:fs';

const ENABLED = Boolean(process.env.MCP_LENS_DEBUG);
const FILE = process.env.MCP_LENS_DEBUG_FILE || '';

let headerWritten = false;

function writeEntry(line: string): void {
  if (FILE) {
    appendFileSync(FILE, line + '\n');
  } else {
    process.stderr.write(line + '\n');
  }
}

function ensureHeader(): void {
  if (headerWritten) return;
  headerWritten = true;
  const meta = {
    event: 'session_start',
    ts: new Date().toISOString(),
    pid: process.pid,
    node: process.version,
    debug_file: FILE || '(stderr)',
  };
  writeEntry(JSON.stringify(meta));
}

export function debugLog(event: string, payload: unknown): void {
  if (!ENABLED) return;
  ensureHeader();
  const entry = {
    event,
    ts: new Date().toISOString(),
    payload,
  };
  try {
    writeEntry(JSON.stringify(entry));
  } catch {
    // JSON.stringify can fail on circular refs; fall back to a safe shape.
    writeEntry(JSON.stringify({ event, ts: entry.ts, payload: '[unserializable]' }));
  }
}

export function isDebugEnabled(): boolean {
  return ENABLED;
}
