const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

let mainWindow = null;

// Funzione per creare la finestra principale
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 800,
    minWidth: 1400,
    minHeight: 800,
    show: false,
    show: false, // Non mostrare subito
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
  // Il loading screen nell'HTML gestirà l'animazione
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.show();
    mainWindow.focus();
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
