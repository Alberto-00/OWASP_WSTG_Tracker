// Preload script per esporre API sicure al renderer process
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  version: process.env.npm_package_version || '1.0.0',

  // File system operations
  showSaveDialog: (defaultFilename) => ipcRenderer.invoke('show-save-dialog', defaultFilename),
  saveFile: (filename, data) => ipcRenderer.invoke('save-file', filename, data),
  loadFile: (filename) => ipcRenderer.invoke('load-file', filename),
  getLastSaveFile: () => ipcRenderer.invoke('get-last-save-file'),
  listSaveFiles: () => ipcRenderer.invoke('list-save-files'),
  fileExists: (filename) => ipcRenderer.invoke('file-exists', filename),

  // Window controls
  setUnsavedChanges: (hasChanges) => ipcRenderer.send('set-unsaved-changes', hasChanges),
  onSaveBeforeClose: (callback) => ipcRenderer.on('save-before-close', callback),
  onShowUnsavedChangesDialog: (callback) => ipcRenderer.on('show-unsaved-changes-dialog', callback),
  forceQuit: () => ipcRenderer.send('force-quit'),
  quitWithoutSaving: () => ipcRenderer.send('quit-without-saving')
});
