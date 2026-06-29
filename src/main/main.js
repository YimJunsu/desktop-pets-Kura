const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Expose V8 garbage collector and limit cache sizes to reduce idle memory footprints (max 130MB limit)
app.commandLine.appendSwitch('disable-gpu-program-cache');
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('js-flags', '--expose-gc --max-semi-space-size=1 --max-old-space-size=64');

const { initDatabase, getSettings, updateSetting, dbPath } = require('./db');
const { registerClaudeHooks } = require('../hooks/claude-code');
const { registerClaudeDesktopHooks } = require('../hooks/claude-desktop');

// Single Instance Application Lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

let mainWindow = null;
let settingsData = {}; // Memory cache of SQLite settings

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

let cursorPollInterval = null;
let currentPollIntervalMs = 80;

function startCursorPolling(intervalMs) {
  if (cursorPollInterval) clearInterval(cursorPollInterval);
  currentPollIntervalMs = intervalMs;
  
  cursorPollInterval = setInterval(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const point = screen.getCursorScreenPoint();
      mainWindow.webContents.send('cursor-move', point);
    }
  }, intervalMs);
}

function getWindowSize(sizeStr) {
  switch (sizeStr) {
    case 'S': return { width: 290, height: 300, petSize: 128 };
    case 'L': return { width: 400, height: 460, petSize: 256 };
    case 'M':
    default:
      return { width: 320, height: 380, petSize: 192 };
  }
}

function clampToScreen(x, y, width, height) {
  const displays = screen.getAllDisplays();
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

  if (!isVisible) {
    const primaryDisplay = screen.getPrimaryDisplay();
    const bounds = primaryDisplay.workArea;
    x = bounds.x + bounds.width - width - 20;
    y = bounds.y + bounds.height - height - 20;
  } else {
    const nearestDisplay = screen.getDisplayNearestPoint({
      x: Math.round(x + width / 2),
      y: Math.round(y + height / 2)
    });
    const bounds = nearestDisplay.workArea;
    x = Math.max(bounds.x, Math.min(x, bounds.x + bounds.width - width));
    y = Math.max(bounds.y, Math.min(y, bounds.y + bounds.height - height));
  }
  
  return { x: Math.round(x), y: Math.round(y) };
}

function createMainWindow() {
  const sizeSetting = settingsData.size || 'M';
  const { width, height } = getWindowSize(sizeSetting);
  
  let x = undefined;
  let y = undefined;
  
  const savedPos = settingsData.position || null;
  if (savedPos && typeof savedPos.x === 'number' && typeof savedPos.y === 'number') {
    const clamped = clampToScreen(savedPos.x, savedPos.y, width, height);
    x = clamped.x;
    y = clamped.y;
  } else {
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
    icon: path.join(__dirname, '../../assets/tray-icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.error(`[Renderer Console]: ${message} (at ${path.basename(sourceId)}:${line})`);
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });



  mainWindow.once('ready-to-show', () => {
    startCursorPolling(80); // Default optimized active polling

    // Safely close the splash loading window once the main window is ready to show
    if (loadingWindow && !loadingWindow.isDestroyed()) {
      loadingWindow.close();
      loadingWindow = null;
    }
  });

  // Click-through: Pass mouse inputs to window underneath if cursor is over transparent pixels
  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  // Start keyboard/mouse event listener
  const { setupGlobalInput } = require('./global-input');
  setupGlobalInput(mainWindow);

  // Start HTTP agent webhook server
  const { startHookServer } = require('../hooks/hook-server');
  startHookServer(mainWindow);
}

// IPC Handlers
ipcMain.on('update-polling-rate', (event, rateType) => {
  if (rateType === 'low') {
    if (currentPollIntervalMs !== 1000) startCursorPolling(1000);
  } else if (rateType === 'idle') {
    if (currentPollIntervalMs !== 150) startCursorPolling(150);
  } else {
    if (currentPollIntervalMs !== 80) startCursorPolling(80);
  }
});

ipcMain.on('set-ignore-mouse-events', (event, ignore, forward) => {
  const webContents = event.sender;
  const win = BrowserWindow.fromWebContents(webContents);
  if (win && !win.isDestroyed()) {
    win.setIgnoreMouseEvents(ignore, { forward: !!forward });
  }
});

ipcMain.handle('open-external', async (event, url) => {
  const { shell } = require('electron');
  await shell.openExternal(url);
});

ipcMain.handle('get-settings', async () => {
  return settingsData;
});

ipcMain.handle('update-settings', async (event, key, value) => {
  settingsData[key] = value;
  await updateSetting(key, value);
  
  // Broadcast to all windows
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.webContents.send('settings-updated', { key, value });
    }
  }

  if (key === 'size') {
    const { width, height } = getWindowSize(value);
    if (mainWindow && !mainWindow.isDestroyed()) {
      const bounds = mainWindow.getBounds();
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
      settingsData.position = { x: clamped.x, y: clamped.y };
      await updateSetting('position', settingsData.position);
    }
  }
  return settingsData;
});

ipcMain.handle('save-position', async (event, pos) => {
  const webContents = event.sender;
  const win = BrowserWindow.fromWebContents(webContents);
  if (win && pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
    const bounds = win.getBounds();
    const clamped = clampToScreen(pos.x, pos.y, bounds.width, bounds.height);
    settingsData.position = clamped;
    await updateSetting('position', clamped);
    win.setPosition(clamped.x, clamped.y);
    return true;
  }
  return false;
});

ipcMain.handle('load-svg', async (event, relativePath) => {
  try {
    const safePath = path.normalize(path.join(__dirname, '../renderer', relativePath));
    const projectRoot = path.normalize(path.join(__dirname, '../..'));
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

// IDE Integration IPC Handlers
ipcMain.handle('register-claude-code', async () => {
  try {
    registerClaudeHooks();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('register-claude-desktop', async () => {
  try {
    const success = registerClaudeDesktopHooks();
    return { success };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('check-integration-status', async () => {
  const status = {
    claudeCode: false,
    claudeDesktop: false,
    dbPath: dbPath
  };

  // Check Claude Code
  const claudeSettingsPath = path.join(os.homedir(), '.claude', 'settings.json');
  if (fs.existsSync(claudeSettingsPath)) {
    try {
      const content = JSON.parse(fs.readFileSync(claudeSettingsPath, 'utf8'));
      if (content.hooks && content.hooks.preCommand && content.hooks.preCommand.includes('18900')) {
        status.claudeCode = true;
      }
    } catch (e) {}
  }

  // Check Claude Desktop
  const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  const desktopConfigPath = path.join(appData, 'Claude', 'claude_desktop_config.json');
  if (fs.existsSync(desktopConfigPath)) {
    try {
      const content = JSON.parse(fs.readFileSync(desktopConfigPath, 'utf8'));
      if (content.mcpServers && content.mcpServers['kuro-pet']) {
        status.claudeDesktop = true;
      }
    } catch (e) {}
  }

  return status;
});

let settingsWindow = null;

ipcMain.handle('open-settings-window', () => {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }

  // Adjusted size to 440x520 to fit sidebar tabs comfortably
  settingsWindow = new BrowserWindow({
    width: 440,
    height: 520,
    transparent: true,
    frame: false,
    resizable: false,
    hasShadow: false,
    icon: path.join(__dirname, '../../assets/tray-icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  settingsWindow.loadFile(path.join(__dirname, '../renderer/settings-modal.html'));

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
});

ipcMain.handle('close-settings-window', () => {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.close();
    settingsWindow = null;
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
    if (loadingWindow && !loadingWindow.isDestroyed()) {
      loadingWindow.show();
    }
  });
}

ipcMain.on('log', (event, msg) => {
  // Console logging helper
});

// App lifecycle
app.whenReady().then(async () => {
  createLoadingWindow();

  try {
    // 1. Initialize SQLite Database
    await initDatabase();
    // 2. Read settings from database
    settingsData = await getSettings();
    console.log('SQLite local database initialized successfully at:', dbPath);
  } catch (err) {
    console.error('Failed to initialize local SQLite settings database:', err);
  }

  setTimeout(() => {
    createMainWindow();

    // Create tray icon
    const { createTray } = require('./tray');
    createTray(mainWindow, settingsData);
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
  console.error('Uncaught exception in main process:', err);
});
