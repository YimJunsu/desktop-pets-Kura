const fs = require('fs');
const path = require('path');
const os = require('os');

function registerAntigravityMcp() {
  console.log('Registering Antigravity MCP hooks...');
  
  const configDir = path.join(os.homedir(), '.gemini', 'config');
  const configPath = path.join(configDir, 'mcp_config.json');

  if (!fs.existsSync(configDir)) {
    try {
      fs.mkdirSync(configDir, { recursive: true });
    } catch (err) {
      console.error(`Failed to create directory ${configDir}:`, err.message);
      return false;
    }
  }

  let config = {};
  if (fs.existsSync(configPath)) {
    try {
      const content = fs.readFileSync(configPath, 'utf8');
      config = JSON.parse(content || '{}');
    } catch (err) {
      console.warn(`Failed to parse existing config, creating new:`, err.message);
    }
  }

  if (!config.mcpServers) {
    config.mcpServers = {};
  }

  // Register kuro-pet bridge dynamically
  const bridgePath = path.resolve(__dirname, 'mcp-bridge.js');
  config.mcpServers['kuro-pet'] = {
    command: 'node',
    args: [bridgePath]
  };

  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    console.log(`Successfully registered Antigravity MCP server in ${configPath}`);
    return true;
  } catch (err) {
    console.error(`Failed to write Antigravity MCP config:`, err.message);
    return false;
  }
}

module.exports = { registerAntigravityMcp };
