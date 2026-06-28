const { Tray, Menu, BrowserWindow, ipcMain, app } = require('electron');
const path = require('path');

let tray = null;
let settingsWindow = null;

function createTray(mainWindow, store) {
  // Load tray icon
  const iconPath = path.join(__dirname, '../../assets/tray-icon.png');
  tray = new Tray(iconPath);
  tray.setToolTip('Kuro Desktop Pet');

  // Build context menu
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Kuro Desktop Pet',
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Size',
      submenu: [
        {
          label: 'Small (128px)',
          type: 'radio',
          checked: (store ? store.get('size') : 'M') === 'S',
          click: () => changeSize(mainWindow, store, 'S')
        },
        {
          label: 'Medium (192px)',
          type: 'radio',
          checked: (store ? store.get('size') : 'M') === 'M',
          click: () => changeSize(mainWindow, store, 'M')
        },
        {
          label: 'Large (256px)',
          type: 'radio',
          checked: (store ? store.get('size') : 'M') === 'L',
          click: () => changeSize(mainWindow, store, 'L')
        }
      ]
    },
    {
      label: 'Follow Mouse Mode',
      type: 'checkbox',
      checked: store ? store.get('followMode') : false,
      click: (menuItem) => toggleFollow(mainWindow, store, menuItem.checked)
    },
    {
      label: 'Sleep Mode',
      type: 'checkbox',
      checked: store ? store.get('sleepMode') : false,
      click: (menuItem) => toggleSleep(mainWindow, store, menuItem.checked)
    },
    { type: 'separator' },
    {
      label: 'Show Pet',
      id: 'show-pet',
      visible: false,
      click: (menuItem) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();
          menuItem.visible = false;
          const hideItem = contextMenu.getMenuItemById('hide-pet');
          if (hideItem) hideItem.visible = true;
          tray.setContextMenu(contextMenu);
        }
      }
    },
    {
      label: 'Hide Pet',
      id: 'hide-pet',
      visible: true,
      click: (menuItem) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.hide();
          menuItem.visible = false;
          const showItem = contextMenu.getMenuItemById('show-pet');
          if (showItem) showItem.visible = true;
          tray.setContextMenu(contextMenu);
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Gemini Settings...',
      click: () => openSettingsWindow(mainWindow, store)
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  
  // Double-clicking the tray icon can wake up the pet
  tray.on('double-click', () => {
    toggleSleep(mainWindow, store, false);
    
    // Update the menu checkbox
    const sleepItem = contextMenu.items.find(item => item.label === 'Sleep Mode');
    if (sleepItem) sleepItem.checked = false;
  });

  return tray;
}

function changeSize(win, store, size) {
  if (store) store.set('size', size);
  if (win && !win.isDestroyed()) {
    win.webContents.send('state-command', { action: 'change-size', value: size });
  }
}

function toggleFollow(win, store, active) {
  if (store) store.set('followMode', active);
  if (win && !win.isDestroyed()) {
    win.webContents.send('state-command', { action: 'toggle-follow', value: active });
  }
}

function toggleSleep(win, store, active) {
  if (store) store.set('sleepMode', active);
  if (win && !win.isDestroyed()) {
    win.webContents.send('state-command', { action: 'toggle-sleep', value: active });
  }
}

function openSettingsWindow(parentWin, store) {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 400,
    height: 250,
    parent: parentWin,
    modal: true,
    resizable: false,
    frame: true,
    title: 'Gemini Settings',
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  settingsWindow.loadFile(path.join(__dirname, '../renderer/settings.html'));
  settingsWindow.setMenu(null); // Hide menu bar

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

module.exports = { createTray };
