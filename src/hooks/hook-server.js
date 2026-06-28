const http = require('http');

let server = null;
let currentPort = 18900;

function startHookServer(mainWindow) {
  const maxPortTries = 10;
  
  function tryListen(port, tries) {
    if (tries >= maxPortTries) {
      console.error(`Hook server failed to find an open port after ${maxPortTries} attempts.`);
      return;
    }

    server = http.createServer((req, res) => {
      // Set CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      if (req.method === 'POST' && req.url === '/event') {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            
            // Map the agent event to the pet state command
            handleAgentEvent(mainWindow, data);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
          }
        });
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        tryListen(port + 1, tries + 1);
      } else {
        console.error('Hook server error:', err);
      }
    });

    server.listen(port, '127.0.0.1', () => {
      currentPort = port;
    });
  }

  tryListen(currentPort, 0);
}

function handleAgentEvent(win, data) {
  if (!win || win.isDestroyed()) return;

  const eventType = data.event; // session_start, session_end, tool_start, tool_end, thinking, error, complete
  let mappedType = 'idle';

  switch (eventType) {
    case 'session_start':
    case 'thinking':
      mappedType = 'thinking';
      break;
    case 'tool_start':
      mappedType = 'writing'; // typing state
      break;
    case 'tool_end':
      mappedType = 'thinking';
      break;
    case 'complete':
    case 'session_end':
      mappedType = 'success'; // happy state
      break;
    case 'error':
      mappedType = 'error'; // error state
      break;
    default:
      mappedType = 'idle';
  }

  win.webContents.send('agent-event', { type: mappedType, originalEvent: eventType });
}

function stopHookServer() {
  if (server) {
    server.close();
    server = null;
  }
}

module.exports = { startHookServer, stopHookServer };
