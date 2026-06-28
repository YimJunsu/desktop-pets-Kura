const fs = require('fs');
const path = require('path');
const os = require('os');

const settingsDir = path.join(os.homedir(), '.claude');
const settingsPath = path.join(settingsDir, 'settings.json');

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

  let settings = {};
  if (fs.existsSync(settingsPath)) {
    try {
      const content = fs.readFileSync(settingsPath, 'utf8');
      settings = JSON.parse(content || '{}');
    } catch (err) {
      console.warn(`Failed to parse existing settings.json, creating new one:`, err.message);
    }
  }

  // Ensure hooks structure exists
  if (!settings.hooks) {
    settings.hooks = {};
  }

  // Hook commands to notify the desktop pet server
  // Using curl (standard on modern Windows 10/11 and Unix)
  const preCmd = 'curl -s -X POST -H "Content-Type: application/json" -d "{\\\"event\\\":\\\"thinking\\\"}" http://127.0.0.1:18900/event';
  const postCmd = 'curl -s -X POST -H "Content-Type: application/json" -d "{\\\"event\\\":\\\"complete\\\"}" http://127.0.0.1:18900/event';

  settings.hooks.preCommand = preCmd;
  settings.hooks.postCommand = postCmd;

  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    console.log(`Successfully registered preCommand and postCommand hooks in ${settingsPath}`);
  } catch (err) {
    console.error(`Failed to write settings.json:`, err.message);
  }
}

// Execute if run directly
if (require.main === module) {
  registerClaudeHooks();
}

module.exports = { registerClaudeHooks };
