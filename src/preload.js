const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Mouse ignore controls (for click-through)
  setIgnoreMouseEvents: (ignore, forward) => {
    ipcRenderer.send('set-ignore-mouse-events', ignore, forward);
  },
  updatePollingRate: (rateType) => {
    ipcRenderer.send('update-polling-rate', rateType);
  },
  
  // Listeners
  onCursorMove: (callback) => {
    const listener = (event, point) => callback(point);
    ipcRenderer.on('cursor-move', listener);
    return () => ipcRenderer.removeListener('cursor-move', listener);
  },

  onGlobalInput: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('global-input', listener);
    return () => ipcRenderer.removeListener('global-input', listener);
  },
  
  onAgentEvent: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('agent-event', listener);
    return () => ipcRenderer.removeListener('agent-event', listener);
  },

  onStateCommand: (callback) => {
    const listener = (event, state) => callback(state);
    ipcRenderer.on('state-command', listener);
    return () => ipcRenderer.removeListener('state-command', listener);
  },

  // Settings IPC
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSettings: (key, value) => ipcRenderer.invoke('update-settings', key, value),
  savePosition: (pos) => ipcRenderer.invoke('save-position', pos),
  loadSVG: (relativePath) => ipcRenderer.invoke('load-svg', relativePath),
  openSettings: () => ipcRenderer.invoke('open-settings-window'),
  closeSettings: () => ipcRenderer.invoke('close-settings-window'),
  hidePet: () => ipcRenderer.invoke('hide-pet'),
  showPet: () => ipcRenderer.invoke('show-pet'),
  isPetVisible: () => ipcRenderer.invoke('is-pet-visible'),
  onPetVisibilityChanged: (callback) => {
    const listener = (event, visible) => callback(visible);
    ipcRenderer.on('pet-visibility-changed', listener);
    return () => ipcRenderer.removeListener('pet-visibility-changed', listener);
  },
  onSettingsUpdated: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('settings-updated', listener);
    return () => ipcRenderer.removeListener('settings-updated', listener);
  },

  // Auto Updater IPC
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
  getUpdateStatus: () => ipcRenderer.invoke('get-update-status'),
  onUpdateAvailable: (callback) => {
    const listener = (event, info) => callback(info);
    ipcRenderer.on('update-available', listener);
    return () => ipcRenderer.removeListener('update-available', listener);
  },
  onUpdateDownloaded: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('update-downloaded', listener);
    return () => ipcRenderer.removeListener('update-downloaded', listener);
  },
  onUpdateProgress: (callback) => {
    const listener = (event, percent) => callback(percent);
    ipcRenderer.on('update-download-progress', listener);
    return () => ipcRenderer.removeListener('update-download-progress', listener);
  },
  onUpdateError: (callback) => {
    const listener = (event, msg) => callback(msg);
    ipcRenderer.on('update-error', listener);
    return () => ipcRenderer.removeListener('update-error', listener);
  },
  
  // Agent Integrations
  registerClaudeCode: () => ipcRenderer.invoke('register-claude-code'),
  registerClaudeDesktop: () => ipcRenderer.invoke('register-claude-desktop'),
  registerAntigravityMcp: () => ipcRenderer.invoke('register-antigravity-mcp'),
  checkIntegrationStatus: () => ipcRenderer.invoke('check-integration-status'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  
  // Log helper
  log: (msg) => ipcRenderer.send('log', msg)
});
