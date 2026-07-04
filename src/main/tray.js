const { Tray, Menu, BrowserWindow, ipcMain, app } = require('electron');
const path = require('path');
const { updateSetting } = require('./db');

let tray = null;

function createTray(mainWindow, settingsData, openSettings) {
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
          checked: (settingsData.size || 'M') === 'S',
          click: () => changeSize(mainWindow, settingsData, 'S')
        },
        {
          label: 'Medium (192px)',
          type: 'radio',
          checked: (settingsData.size || 'M') === 'M',
          click: () => changeSize(mainWindow, settingsData, 'M')
        },
        {
          label: 'Large (256px)',
          type: 'radio',
          checked: (settingsData.size || 'M') === 'L',
          click: () => changeSize(mainWindow, settingsData, 'L')
        }
      ]
    },
    {
      label: 'Follow Mouse Mode',
      type: 'checkbox',
      checked: !!settingsData.followMode,
      click: (menuItem) => toggleFollow(mainWindow, settingsData, menuItem.checked)
    },
    {
      label: 'Sleep Mode',
      type: 'checkbox',
      checked: !!settingsData.sleepMode,
      click: (menuItem) => toggleSleep(mainWindow, settingsData, menuItem.checked)
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
      label: 'Settings (설정)...',
      click: () => openSettings()
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

  // Sync tray items when window show/hide state is changed externally
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.on('show', () => {
      const showItem = contextMenu.getMenuItemById('show-pet');
      const hideItem = contextMenu.getMenuItemById('hide-pet');
      if (showItem) showItem.visible = false;
      if (hideItem) hideItem.visible = true;
      tray.setContextMenu(contextMenu);
    });

    mainWindow.on('hide', () => {
      const showItem = contextMenu.getMenuItemById('show-pet');
      const hideItem = contextMenu.getMenuItemById('hide-pet');
      if (showItem) showItem.visible = true;
      if (hideItem) hideItem.visible = false;
      tray.setContextMenu(contextMenu);
    });
  }
  
  // Double-clicking the tray icon can wake up the pet
  tray.on('double-click', () => {
    toggleSleep(mainWindow, settingsData, false);
    
    // Update the menu checkbox
    const sleepItem = contextMenu.items.find(item => item.label === 'Sleep Mode');
    if (sleepItem) sleepItem.checked = false;
  });

  return tray;
}

async function changeSize(win, settingsData, size) {
  settingsData.size = size;
  await updateSetting('size', size);
  if (win && !win.isDestroyed()) {
    win.webContents.send('state-command', { action: 'change-size', value: size });
  }
}

async function toggleFollow(win, settingsData, active) {
  settingsData.followMode = active;
  await updateSetting('followMode', active);
  if (win && !win.isDestroyed()) {
    win.webContents.send('state-command', { action: 'toggle-follow', value: active });
  }
}

async function toggleSleep(win, settingsData, active) {
  settingsData.sleepMode = active;
  await updateSetting('sleepMode', active);
  if (win && !win.isDestroyed()) {
    win.webContents.send('state-command', { action: 'toggle-sleep', value: active });
  }
}



module.exports = { createTray };
