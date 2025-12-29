const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;

let mainWindow = null;
let hasUnsavedChanges = false;

// Percorso cartella saves
const savesDir = path.join(__dirname, '../public/saves');
const lastSaveFilePath = path.join(savesDir, 'last-save.txt');

// Assicura che la cartella saves esista
async function ensureSavesDir() {
  try {
    await fs.access(savesDir);
  } catch {
    await fs.mkdir(savesDir, { recursive: true });
  }
}

// IPC Handlers per gestione file
ipcMain.handle('show-save-dialog', async (event, defaultFilename) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Salva stato WSTG',
      defaultPath: path.join(savesDir, defaultFilename),
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled) {
      return { success: false, canceled: true };
    }

    return { success: true, filePath: result.filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-file', async (event, filename, data) => {
  try {
    await ensureSavesDir();
    const filePath = path.join(savesDir, filename);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    await fs.writeFile(lastSaveFilePath, filename, 'utf-8');
    hasUnsavedChanges = false;
    return { success: true, path: filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-file', async (event, filename) => {
  try {
    const filePath = path.join(savesDir, filename);
    const data = await fs.readFile(filePath, 'utf-8');
    // Aggiorna last-save.txt anche quando si carica un file
    await fs.writeFile(lastSaveFilePath, filename, 'utf-8');
    return { success: true, data: JSON.parse(data) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-last-save-file', async () => {
  try {
    const filename = await fs.readFile(lastSaveFilePath, 'utf-8');
    const filePath = path.join(savesDir, filename.trim());
    await fs.access(filePath);
    return { success: true, filename: filename.trim() };
  } catch {
    return { success: false };
  }
});

ipcMain.handle('file-exists', async (event, filename) => {
  try {
    await fs.access(path.join(savesDir, filename));
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('list-save-files', async () => {
  try {
    await ensureSavesDir();
    const files = await fs.readdir(savesDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    // Ottieni info su ogni file
    const filesWithStats = await Promise.all(
      jsonFiles.map(async (filename) => {
        const filePath = path.join(savesDir, filename);
        const stats = await fs.stat(filePath);
        return {
          filename,
          path: filePath,
          size: stats.size,
          modified: stats.mtime
        };
      })
    );

    // Ordina per data di modifica (più recente prima)
    filesWithStats.sort((a, b) => b.modified - a.modified);

    return { success: true, files: filesWithStats };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.on('set-unsaved-changes', (event, hasChanges) => {
  hasUnsavedChanges = hasChanges;
});

ipcMain.on('force-quit', () => {
  hasUnsavedChanges = false;
  if (mainWindow) {
    mainWindow.destroy();
  }
  app.quit();
});

ipcMain.on('quit-without-saving', () => {
  hasUnsavedChanges = false;
  if (mainWindow) {
    mainWindow.destroy();
  }
  app.quit();
});

// Funzione per creare la finestra principale
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 800,
    minWidth: 1400,
    minHeight: 800,
    show: false,
    backgroundColor: '#0f172a',
    icon: path.join(__dirname, '../public/icon/icon_256x256.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Rimuove completamente la barra dei menu
  Menu.setApplicationMenu(null);

  // In development, carica da Vite dev server
  // In production, carica i file buildati
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    mainWindow.loadURL('http://localhost:8080');
    mainWindow.webContents.openDevTools(); // Apri DevTools in dev
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Quando la pagina è pronta, mostra la finestra
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Gestione chiusura finestra con dati non salvati
  mainWindow.on('close', (e) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      // Invia evento al renderer per mostrare il MessageModal personalizzato
      mainWindow.webContents.send('show-unsaved-changes-dialog');
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Quando Electron è pronto
app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

// Chiudi l'app quando tutte le finestre sono chiuse (tranne su macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
