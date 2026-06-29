const http = require('http');
const readline = require('readline');

// Helper to send events to the local hook server
function sendPetEvent(eventType) {
  const data = JSON.stringify({ event: eventType });
  const req = http.request({
    hostname: '127.0.0.1',
    port: 18900,
    path: '/event',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  }, (res) => {
    // Read response to free memory
    res.on('data', () => {});
  });
  
  req.on('error', () => {
    // Ignore if pet server is not running
  });
  
  req.write(data);
  req.end();
}

// Immediately notify pet that session has started
sendPetEvent('session_start');

// Set up JSON-RPC interface for Claude Desktop's MCP protocol (Stdio)
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', (line) => {
  try {
    const request = JSON.parse(line);
    
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
