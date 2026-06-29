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
  onSettingsUpdated: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('settings-updated', listener);
    return () => ipcRenderer.removeListener('settings-updated', listener);
  },
  
  // Agent Integrations
  registerClaudeCode: () => ipcRenderer.invoke('register-claude-code'),
  registerClaudeDesktop: () => ipcRenderer.invoke('register-claude-desktop'),
  checkIntegrationStatus: () => ipcRenderer.invoke('check-integration-status'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  
  // Log helper
  log: (msg) => ipcRenderer.send('log', msg)
});
