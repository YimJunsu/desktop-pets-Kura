const fs = require('fs');
const path = require('path');
const os = require('os');

const settingsDir = path.join(os.homedir(), '.claude');
const settingsPath = path.join(settingsDir, 'settings.json');

// Claude Code lifecycle events the pet reacts to (mapped in kuro-hook.js)
const HOOK_EVENTS = ['SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse', 'Stop', 'SessionEnd'];

function hasKuroHook(group) {
  return group && Array.isArray(group.hooks) &&
    group.hooks.some(h => typeof h.command === 'string' && h.command.includes('kuro-hook.js'));
}

function registerClaudeHooks() {
  console.log('Registering Claude Code hooks...');

  if (!fs.existsSync(settingsDir)) {
    try {
      fs.mkdirSync(settingsDir, { recursive: true });
    } catch (err) {
      console.error(`Failed to create directory ${settingsDir}:`, err.message);
      return;
    }
  }

  // Copy the hook relay to an external path so it survives ASAR packaging
  // (same pattern as mcp-bridge.js for Claude Desktop).
  const externalDir = path.join(os.homedir(), '.kuro-pet');
  if (!fs.existsSync(externalDir)) {
    try { fs.mkdirSync(externalDir, { recursive: true }); } catch (e) {}
  }
  const hookPath = path.join(externalDir, 'kuro-hook.js');
  try {
    const content = fs.readFileSync(path.resolve(__dirname, 'kuro-hook.js'), 'utf8');
    fs.writeFileSync(hookPath, content, 'utf8');
  } catch (err) {
    console.error('Failed to copy kuro-hook.js:', err.message);
  }

  let settings = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8') || '{}');
    } catch (err) {
      console.warn(`Failed to parse existing settings.json, creating new one:`, err.message);
    }
  }
  if (!settings.hooks) settings.hooks = {};

  // Remove the old invalid format previous versions wrote (no-op keys CC ignored)
  delete settings.hooks.preCommand;
  delete settings.hooks.postCommand;

  for (const event of HOOK_EVENTS) {
    const cmd = `node "${hookPath}" ${event}`;
    if (!Array.isArray(settings.hooks[event])) settings.hooks[event] = [];

    // Idempotent + non-destructive: refresh our entry, leave other tools' hooks alone
    const existing = settings.hooks[event].filter(hasKuroHook);
    if (existing.length === 0) {
      settings.hooks[event].push({
        matcher: '',
        hooks: [{ type: 'command', command: cmd, timeout: 5 }]
      });
    } else {
      for (const group of existing) {
        for (const h of group.hooks) {
          if (typeof h.command === 'string' && h.command.includes('kuro-hook.js')) h.command = cmd;
        }
      }
    }
  }

  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    console.log(`Successfully registered Claude Code pet hooks in ${settingsPath}`);
  } catch (err) {
    console.error(`Failed to write settings.json:`, err.message);
  }
}

// Execute if run directly
if (require.main === module) {
  registerClaudeHooks();
}

module.exports = { registerClaudeHooks };
