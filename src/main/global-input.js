const { ipcMain } = require('electron');

let uiohook = null;
let uiohookActive = false;

function setupGlobalInput(mainWindow) {
  try {
    // Dynamically load uiohook-napi
    const uiohookModule = require('uiohook-napi');
    uiohook = uiohookModule.uIOhook;
    
    let lastMouseMoveTime = 0;
    let lastKeyTime = 0;

    // Listen for global key down
    uiohook.on('keydown', (e) => {
      const now = Date.now();
      // Debounce key presses slightly (100ms) to avoid spamming IPC
      if (now - lastKeyTime > 100) {
        lastKeyTime = now;
        sendInputEvent(mainWindow, { type: 'typing' });
      }
    });

    // Listen for global mouse movement
    uiohook.on('mousemove', (e) => {
      const now = Date.now();
      // Only send mouse move once per second to conserve performance
      if (now - lastMouseMoveTime > 1000) {
        lastMouseMoveTime = now;
        sendInputEvent(mainWindow, { type: 'mousemove' });
      }
    });

    // Start global listener
    uiohook.start();
    uiohookActive = true;

  } catch (err) {
    console.error('Failed to load global-input hooks (uiohook-napi):', err.message);
  }
}

function sendInputEvent(win, data) {
  if (win && !win.isDestroyed()) {
    win.webContents.send('global-input', data);
  }
}

// Clean stop on close
function stopGlobalInput() {
  if (uiohook && uiohookActive) {
    try {
      uiohook.stop();
      uiohookActive = false;
    } catch (e) {
      console.error('Error stopping uiohook:', e);
    }
  }
}

module.exports = { setupGlobalInput, stopGlobalInput };
