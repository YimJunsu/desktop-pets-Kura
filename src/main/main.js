const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { autoUpdater } = require('electron-updater');

// Disable hardware acceleration to completely eliminate heavy GPU processes
app.disableHardwareAcceleration();

// Expose V8 garbage collector and limit cache sizes to reduce idle memory footprints
app.commandLine.appendSwitch('disable-gpu-program-cache');
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-webgl');
app.commandLine.appendSwitch('disable-webgl2');
app.commandLine.appendSwitch('disable-accelerated-2d-canvas');
app.commandLine.appendSwitch('renderer-process-limit', '1');
app.commandLine.appendSwitch('js-flags', '--expose-gc --max-semi-space-size=1 --max-old-space-size=32 --lite-mode');

const { initDatabase, getSettings, updateSetting, dbPath } = require('./db');
const { registerClaudeHooks } = require('../hooks/claude-code');
const { registerClaudeDesktopHooks } = require('../hooks/claude-desktop');

let isDuplicateInstance = false;

// Single Instance Application Lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  isDuplicateInstance = true;
  const { dialog } = require('electron');
  dialog.showErrorBox(
    'Kuro Desktop Pet',
    '데스크탑 펫이 이미 소환되어 실행 중입니다! 🐾\n\n만약 화면에 펫이 보이지 않는다면, 윈도우 작업 표시줄 우측 하단의 트레이 영역(숨겨진 아이콘)에서 검은 고양이 아이콘을 우클릭하여 설정 창을 열거나 앱을 다시 껏다 켜 보시기 바랍니다.'
  );
  app.quit();
  process.exit(0);
}

// Periodic Garbage Collection in the main process to proactively reclaim RAM
setInterval(() => {
  if (global.gc) {
    try {
      global.gc();
    } catch (e) {}
  }
}, 30000); // every 30 seconds

let mainWindow = null;
let settingsData = {}; // Memory cache of SQLite settings
let loadingGuardTimeout = null; // Guard to close splash window if app stalls

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
    case 'XS': return { width: 260, height: 250, petSize: 96 };
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

    if (loadingGuardTimeout) {
      clearTimeout(loadingGuardTimeout);
      loadingGuardTimeout = null;
    }

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
    return null;
  } catch (err) {
    return null;
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
    if (global.gc) {
      try { global.gc(); } catch (e) {}
    }
  });
});

ipcMain.handle('close-settings-window', () => {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.close();
    settingsWindow = null;
  }
});

ipcMain.handle('quit-app', () => {
  app.isQuitting = true;
  app.quit();
});

// --- Auto Updater Logic ---
let updateAvailable = false;
let updateInfo = null;

autoUpdater.autoDownload = false;

autoUpdater.on('update-available', (info) => {
  updateAvailable = true;
  updateInfo = info;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-available', info);
  }
});

autoUpdater.on('update-not-available', () => {
  updateAvailable = false;
  updateInfo = null;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-not-available');
  }
});

autoUpdater.on('error', (err) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-error', err.message);
  }
});

autoUpdater.on('download-progress', (progressObj) => {
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.webContents.send('update-download-progress', progressObj.percent);
    }
  }
});

autoUpdater.on('update-downloaded', () => {
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.webContents.send('update-downloaded');
    }
  }
});

// IPC Handlers for Auto Updater
ipcMain.handle('check-for-updates', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return { success: true, updateInfo: result ? result.updateInfo : null };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('download-update', async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('quit-and-install', () => {
  autoUpdater.quitAndInstall();
});

ipcMain.handle('get-update-status', () => {
  return {
    available: updateAvailable,
    info: updateInfo,
    version: app.getVersion()
  };
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
    skipTaskbar: true, // Hide from taskbar and Alt-Tab switcher!
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
  if (isDuplicateInstance) return; // Prevent splash loading on duplicate instances
  createLoadingWindow();

  // Fail-safe: Force close loading splash screen after 7 seconds if the main window crashes or stalls
  loadingGuardTimeout = setTimeout(() => {
    if (loadingWindow && !loadingWindow.isDestroyed()) {
      loadingWindow.close();
      loadingWindow = null;
      const { dialog } = require('electron');
      dialog.showErrorBox(
        'Kuro Desktop Pet 실행 오류',
        '데스크탑 펫 메인 화면을 소환하는 도중 지연 또는 예외가 발생했습니다.\n\n프로그램을 완전히 종료한 후 다시 실행해 주시기 바랍니다.'
      );
    }
  }, 7000);

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

    // Proactively check for updates on startup only if packaged
    if (app.isPackaged) {
      autoUpdater.checkForUpdates().catch(err => {
        console.error('Startup auto-update check failed:', err.message);
      });
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
  console.error('Uncaught exception in main process:', err);
});
