#!/usr/bin/env node
// Kuro Desktop Pet - Claude Code hook relay.
// Claude Code invokes this on lifecycle events: node kuro-hook.js <EventName>
// It reads the live pet server port from ~/.kuro-pet/port.txt and POSTs a
// mapped event to the pet's hook-server, driving the pet's reaction.
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Claude Code event name -> pet event understood by hook-server.js
const EVENT_MAP = {
  SessionStart: 'session_start',   // thinking
  UserPromptSubmit: 'thinking',    // thinking
  PreToolUse: 'tool_start',        // typing/writing
  PostToolUse: 'tool_end',         // thinking
  Notification: 'thinking',
  Stop: 'complete',                // happy celebration
  SubagentStop: 'tool_end',
  SessionEnd: 'session_end'        // happy
};

function mapEvent(name) {
  return EVENT_MAP[name] || 'idle';
}

function readPort() {
  try {
    const raw = fs.readFileSync(path.join(os.homedir(), '.kuro-pet', 'port.txt'), 'utf8').trim();
    const n = parseInt(raw, 10);
    if (!isNaN(n)) return n;
  } catch (e) {}
  return 18900; // ponytail: default port, port.txt covers the shifted case
}

function send(petEvent, port) {
  const data = JSON.stringify({ event: petEvent });
  const req = http.request({
    hostname: '127.0.0.1', port, path: '/event', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
  }, (res) => { res.on('data', () => {}); res.on('end', () => process.exit(0)); });
  req.on('error', () => process.exit(0));   // pet app closed -> silent no-op
  req.setTimeout(2000, () => { req.destroy(); process.exit(0); });
  req.write(data);
  req.end();
}

if (process.argv[2] === '--selftest') {
  const assert = require('assert');
  assert.strictEqual(mapEvent('PreToolUse'), 'tool_start');
  assert.strictEqual(mapEvent('Stop'), 'complete');
  assert.strictEqual(mapEvent('SessionStart'), 'session_start');
  assert.strictEqual(mapEvent('Unknown'), 'idle');
  console.log('ok');
  process.exit(0);
}

send(mapEvent(process.argv[2]), readPort());
