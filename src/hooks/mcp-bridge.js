const http = require('http');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const os = require('os');

const logDir = path.join(os.homedir(), '.kuro-pet');
if (!fs.existsSync(logDir)) {
  try { fs.mkdirSync(logDir, { recursive: true }); } catch (e) {}
}
const debugLogPath = path.join(logDir, 'bridge-debug.log');

let targetPort = 18900;
try {
  const portFilePath = path.join(logDir, 'port.txt');
  if (fs.existsSync(portFilePath)) {
    const fileContent = fs.readFileSync(portFilePath, 'utf8').trim();
    const parsedPort = parseInt(fileContent, 10);
    if (!isNaN(parsedPort)) {
      targetPort = parsedPort;
    }
  }
} catch (e) {
  // Fallback to 18900
}

function logDebug(msg) {
  try {
    if (fs.existsSync(debugLogPath)) {
      const stats = fs.statSync(debugLogPath);
      // Cap at 1MB (1,048,576 bytes) to prevent infinite growth
      if (stats.size > 1024 * 1024) {
        fs.writeFileSync(debugLogPath, `[${new Date().toISOString()}] [Log Capped & Reset]\n`, 'utf8');
      }
    }
    fs.appendFileSync(debugLogPath, `[${new Date().toISOString()}] ${msg}\n`, 'utf8');
  } catch (e) {}
}

// Helper to send events to the local hook server
function sendPetEvent(eventType) {
  logDebug(`Sending pet event: ${eventType}`);
  const data = JSON.stringify({ event: eventType });
  const req = http.request({
    hostname: '127.0.0.1',
    port: targetPort,
    path: '/event',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  }, (res) => {
    // Read response to free memory
    res.on('data', () => {});
  });
  
  req.on('error', (err) => {
    logDebug(`Failed to send event: ${err.message}`);
  });
  
  req.write(data);
  req.end();
}

function sendPetAskEvent(question, options, callback) {
  logDebug(`Asking pet question: ${question} with options: ${options.join(', ')}`);
  const data = JSON.stringify({ question, options });
  
  const req = http.request({
    hostname: '127.0.0.1',
    port: targetPort,
    path: '/ask',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  }, (res) => {
    let body = '';
    res.on('data', (chunk) => {
      body += chunk.toString();
    });
    res.on('end', () => {
      if (res.statusCode === 200) {
        try {
          const parsed = JSON.parse(body);
          const selectedOption = options[parsed.selectedIndex] !== undefined ? options[parsed.selectedIndex] : 'Invalid selection';
          callback(null, `User selected: ${selectedOption}`);
        } catch (e) {
          callback('Failed to parse answer response');
        }
      } else {
        callback(`Server returned status ${res.statusCode}`);
      }
    });
  });
  
  req.on('error', (err) => {
    logDebug(`Failed to send ask event: ${err.message}`);
    callback(`Failed to connect to pet app: ${err.message}`);
  });
  
  req.setTimeout(60000, () => {
    req.destroy();
    callback('Timed out waiting for user response on the pet app');
  });

  req.write(data);
  req.end();
}

// Immediately notify pet that session has started
logDebug('MCP Bridge process started');
sendPetEvent('session_start');

// Set up JSON-RPC interface for Claude Desktop's MCP protocol (Stdio)
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', (line) => {
  logDebug(`Received line: ${line.substring(0, 150)}`);
  try {
    const request = JSON.parse(line);
    logDebug(`Parsed method: ${request.method}`);
    
    // Check request method
    if (request.method === 'initialize') {
      // Respond to initialize handshake
      const response = {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: 'kuro-pet-bridge',
            version: '1.0.0'
          }
        }
      };
      process.stdout.write(JSON.stringify(response) + '\n');
      sendPetEvent('thinking');
    } 
    else if (request.method === 'tools/list') {
      sendPetEvent('thinking');
      // Provide a mock tool to update pet state manually if desired
      const response = {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          tools: [
            {
              name: 'pet_happy',
              description: 'Trigger a happy emotion and animation on the desktop pet.',
              inputSchema: {
                type: 'object',
                properties: {}
              }
            },
            {
              name: 'pet_ask_question',
              description: 'Display a multiple-choice question on the pet chat bubble and wait for the user to click an option.',
              inputSchema: {
                type: 'object',
                properties: {
                  question: {
                    type: 'string',
                    description: 'The question to ask the user (e.g. \"어떤 방식으로 구현할까요?\")'
                  },
                  options: {
                    type: 'array',
                    items: {
                      type: 'string'
                    },
                    description: 'List of answer choices/buttons (e.g. [\"A안\", \"B안\", \"추후 결정\"])'
                  }
                },
                required: ['question', 'options']
              }
            }
          ]
        }
      };
      process.stdout.write(JSON.stringify(response) + '\n');
    }
    else if (request.method === 'tools/call') {
      // Whenever a tool is called, trigger pet typing/happy
      if (request.params.name === 'pet_happy') {
        sendPetEvent('complete');
        const response = {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [{ type: 'text', text: 'Pet is now happy! 🐾' }]
          }
        };
        process.stdout.write(JSON.stringify(response) + '\n');
      } else if (request.params.name === 'pet_ask_question') {
        const args = request.params.arguments || {};
        const q = args.question || '질문이 없습니다.';
        const opts = args.options || [];
        sendPetAskEvent(q, opts, (err, answer) => {
          const response = {
            jsonrpc: '2.0',
            id: request.id,
            result: {
              content: [{ type: 'text', text: err ? `Error: ${err}` : answer }]
            }
          };
          process.stdout.write(JSON.stringify(response) + '\n');
        });
      } else {
        // Any other tool triggers writing/typing motion
        sendPetEvent('tool_start');
        const response = {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [{ type: 'text', text: 'Action received.' }]
          }
        };
        process.stdout.write(JSON.stringify(response) + '\n');
      }
    }
  } catch (err) {
    // Avoid crashing on invalid JSON
  }
});

// Notify complete on exit
process.on('exit', () => {
  sendPetEvent('session_end');
});
