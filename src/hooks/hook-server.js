const http = require('http');

let server = null;
let currentPort = 18900;
let pendingAskResponse = null;

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
      } else if (req.method === 'POST' && req.url === '/ask') {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            
            if (pendingAskResponse) {
              try {
                pendingAskResponse.writeHead(400, { 'Content-Type': 'application/json' });
                pendingAskResponse.end(JSON.stringify({ error: 'New question asked' }));
              } catch (e) {}
              pendingAskResponse = null;
            }
            
            pendingAskResponse = res;
            
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('ask-question', {
                question: data.question,
                options: data.options
              });
            } else {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Main window not available' }));
              pendingAskResponse = null;
            }
          } catch (err) {
            console.error('Error in /ask:', err);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
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
      // Write port to ~/.kuro-pet/port.txt
      try {
        const fs = require('fs');
        const path = require('path');
        const os = require('os');
        const portDir = path.join(os.homedir(), '.kuro-pet');
        if (!fs.existsSync(portDir)) {
          fs.mkdirSync(portDir, { recursive: true });
        }
        fs.writeFileSync(path.join(portDir, 'port.txt'), port.toString(), 'utf8');
      } catch (e) {
        console.error('Failed to write port file:', e);
      }
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

function answerPendingQuestion(selectedIndex) {
  if (pendingAskResponse) {
    try {
      pendingAskResponse.writeHead(200, { 'Content-Type': 'application/json' });
      pendingAskResponse.end(JSON.stringify({ selectedIndex }));
    } catch (e) {}
    pendingAskResponse = null;
    return true;
  }
  return false;
}

module.exports = { startHookServer, stopHookServer, answerPendingQuestion };
