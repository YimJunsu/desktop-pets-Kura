const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Single Instance Application Lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

let mainWindow = null;

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// Initialize Electron Store
let store;
try {
  const Store = require('electron-store');
  
  // Load default settings
  const defaultSettingsPath = path.join(__dirname, '../../config/default-settings.json');
  let defaults = {};
  if (fs.existsSync(defaultSettingsPath)) {
    defaults = JSON.parse(fs.readFileSync(defaultSettingsPath, 'utf8'));
  }
  
  store = new Store({ defaults });
} catch (e) {
  console.error('Failed to initialize electron-store:', e);
}

let cursorPollInterval = null;

function getWindowSize(sizeStr) {
  // We make the window larger than the pet to accommodate speech bubbles and animations
  // S: Pet 128x128 -> Window 256x256
  // M: Pet 192x192 -> Window 320x320
  // L: Pet 256x256 -> Window 400x400
  switch (sizeStr) {
    case 'S': return { width: 256, height: 256, petSize: 128 };
    case 'L': return { width: 400, height: 400, petSize: 256 };
    case 'M':
    default:
      return { width: 320, height: 320, petSize: 192 };
  }
}

function clampToScreen(x, y, width, height) {
  const displays = screen.getAllDisplays();
  
  // Check if the window is visible on ANY of the screens
  let isVisible = false;
  for (const display of displays) {
    const bounds = display.bounds;
    const intersects = (
      x < bounds.x + bounds.width &&
      x + width > bounds.x &&
      y < bounds.y + bounds.height &&
      y + height > bounds.y
    );
    if (intersects) {
      isVisible = true;
      break;
    }
  }

  // If not visible on any screen, reset to primary display bottom-right
  if (!isVisible) {
    const primaryDisplay = screen.getPrimaryDisplay();
    const bounds = primaryDisplay.workArea;
    x = bounds.x + bounds.width - width - 20;
    y = bounds.y + bounds.height - height - 20;
  } else {
    // Find the display nearest to the window center
    const nearestDisplay = screen.getDisplayNearestPoint({
      x: Math.round(x + width / 2),
      y: Math.round(y + height / 2)
    });
    const bounds = nearestDisplay.workArea;
    
    // Clamp to work area of this display
    x = Math.max(bounds.x, Math.min(x, bounds.x + bounds.width - width));
    y = Math.max(bounds.y, Math.min(y, bounds.y + bounds.height - height));
  }
  
  return { x: Math.round(x), y: Math.round(y) };
}

function createMainWindow() {
  const sizeSetting = store ? store.get('size') || 'M' : 'M';
  const { width, height } = getWindowSize(sizeSetting);
  
  let x = undefined;
  let y = undefined;
  
  const savedPos = store ? store.get('position') : null;
  if (savedPos && typeof savedPos.x === 'number' && typeof savedPos.y === 'number') {
    const clamped = clampToScreen(savedPos.x, savedPos.y, width, height);
    x = clamped.x;
    y = clamped.y;
  } else {
    // Default position: Bottom-right corner of primary display
    const primaryDisplay = screen.getPrimaryDisplay();
    const bounds = primaryDisplay.workArea;
    x = bounds.x + bounds.width - width - 20;
    y = bounds.y + bounds.height - height - 20;
  }

  mainWindow = new BrowserWindow({
    width: width,
    height: height,
    x: x,
    y: y,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Redirect renderer console to terminal for debugging
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.error(`[Renderer Console]: ${message} (at ${path.basename(sourceId)}:${line})`);
  });

  // Load HTML
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Start with click-through enabled
  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  // Initialize global input hooks
  const { setupGlobalInput } = require('./global-input');
  setupGlobalInput(mainWindow);

  // Start HTTP hook server for AI coding agents
  const { startHookServer } = require('../hooks/hook-server');
  startHookServer(mainWindow);

  // Poll cursor position at 50ms interval and send to renderer
  if (cursorPollInterval) clearInterval(cursorPollInterval);
  cursorPollInterval = setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const point = screen.getCursorScreenPoint();
    mainWindow.webContents.send('cursor-move', point);
  }, 50);

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (cursorPollInterval) {
      clearInterval(cursorPollInterval);
      cursorPollInterval = null;
    }
    // Stop global hooks
    const { stopGlobalInput } = require('./global-input');
    stopGlobalInput();
    
    // Stop hook server
    const { stopHookServer } = require('../hooks/hook-server');
    stopHookServer();
  });

  // Prevent app crash
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('Renderer process gone:', details);
  });
}

// IPC Handlers
ipcMain.on('set-ignore-mouse-events', (event, ignore, forward) => {
  const webContents = event.sender;
  const win = BrowserWindow.fromWebContents(webContents);
  if (win && !win.isDestroyed()) {
    win.setIgnoreMouseEvents(ignore, { forward: !!forward });
  }
});

ipcMain.handle('get-settings', () => {
  return store ? store.store : {};
});

ipcMain.handle('update-settings', (event, key, value) => {
  if (store) {
    store.set(key, value);
    
    // Broadcast setting changes to all windows (e.g. settings-modal updates model key)
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send('settings-updated', { key, value });
      }
    }

    // If size changed, dynamically resize window
    if (key === 'size') {
      const { width, height } = getWindowSize(value);
      if (mainWindow && !mainWindow.isDestroyed()) {
        const bounds = mainWindow.getBounds();
        // Resize but try to keep bottom-right alignment consistent
        const dx = bounds.width - width;
        const dy = bounds.height - height;
        const targetX = bounds.x + dx;
        const targetY = bounds.y + dy;
        const clamped = clampToScreen(targetX, targetY, width, height);
        mainWindow.setBounds({
          x: clamped.x,
          y: clamped.y,
          width: width,
          height: height
        });
        store.set('position', { x: clamped.x, y: clamped.y });
      }
    }
    return store.store;
  }
  return {};
});

let settingsWindow = null;

ipcMain.handle('open-settings-window', () => {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }

  const iconPath = path.join(__dirname, '../../assets/tray-icon.png');
  settingsWindow = new BrowserWindow({
    width: 340,
    height: 390,
    transparent: true,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    center: true,
    skipTaskbar: true,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  settingsWindow.loadFile(path.join(__dirname, '../renderer/settings-modal.html'));

  settingsWindow.on('closed', () => {
    settingsWindow = null;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.focus();
    }
  });
});

ipcMain.handle('close-settings-window', () => {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.close();
    settingsWindow = null;
  }
});

ipcMain.handle('save-position', (event, pos) => {
  if (store && pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      const bounds = win.getBounds();
      const clamped = clampToScreen(pos.x, pos.y, bounds.width, bounds.height);
      store.set('position', clamped);
      win.setPosition(clamped.x, clamped.y);
    }
    return true;
  }
  return false;
});

ipcMain.handle('load-svg', async (event, relativePath) => {
  try {
    const safePath = path.normalize(path.join(__dirname, '../renderer', relativePath));
    const projectRoot = path.normalize(path.join(__dirname, '../..'));
    // Make comparison case-insensitive to handle Windows drive letter variations (d: vs D:)
    if (!safePath.toLowerCase().startsWith(projectRoot.toLowerCase())) {
      throw new Error('Access denied');
    }
    if (fs.existsSync(safePath)) {
      return fs.readFileSync(safePath, 'utf8');
    }
    throw new Error(`File not found: ${safePath}`);
  } catch (err) {
    console.error('Error loading SVG:', err);
    throw err;
  }
});

let loadingWindow = null;

function createLoadingWindow() {
  loadingWindow = new BrowserWindow({
    width: 320,
    height: 200,
    transparent: true,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    center: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  loadingWindow.loadFile(path.join(__dirname, '../renderer/loading.html'));

  loadingWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.error(`[Loading Console]: ${message} (at ${path.basename(sourceId)}:${line})`);
  });
  
  loadingWindow.once('ready-to-show', () => {
    loadingWindow.show();
  });
}

ipcMain.on('log', (event, msg) => {
  // Removed for memory optimization
});

// App lifecycle
app.whenReady().then(() => {
  createLoadingWindow();

  setTimeout(() => {
    createMainWindow();

    // Create tray icon
    const { createTray } = require('./tray');
    createTray(mainWindow, store);

    if (loadingWindow && !loadingWindow.isDestroyed()) {
      loadingWindow.close();
      loadingWindow = null;
    }
  }, 1500);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

process.on('uncaughtException', (err) => {
  // We keep error logging for crash troubleshooting
  console.error('Uncaught exception in main process:', err);
});
