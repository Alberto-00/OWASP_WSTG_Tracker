const { app, BrowserWindow, Menu, ipcMain, dialog, shell, net } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

let mainWindow = null;
let hasUnsavedChanges = false;

// Cartella saves: dentro il progetto in sviluppo, accanto all'eseguibile in produzione.
// NB: in produzione __dirname è dentro app.asar (read-only): mai scriverci. Si usa la
// directory dell'eseguibile portatile (Windows) o dell'AppImage (Linux), che è scrivibile.
function resolveSavesDir() {
  if (process.env.NODE_ENV === 'development') {
    // Fuori da public/: Vite copia public/ in dist/ e i salvataggi finirebbero nella build distribuita
    return path.join(__dirname, '../saves');
  }
  // App portatile: accanto all'eseguibile/AppImage (posizione scelta dall'utente)
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    return path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'saves');
  }
  if (process.env.APPIMAGE) {
    return path.join(path.dirname(process.env.APPIMAGE), 'saves');
  }
  // App installata (NSIS): accanto all'exe se la cartella è scrivibile
  // (installazione per-utente in %LOCALAPPDATA%), altrimenti ripiega su
  // userData (es. installazione in Program Files, non scrivibile).
  const exeDir = path.dirname(process.execPath);
  try {
    fsSync.accessSync(exeDir, fsSync.constants.W_OK);
    return path.join(exeDir, 'saves');
  } catch {
    return path.join(app.getPath('userData'), 'saves');
  }
}

const savesDir = resolveSavesDir();
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
      // Nome semplice -> cartella saves; percorso completo (file già aperto) -> usato così com'è
      defaultPath: path.resolve(savesDir, defaultFilename),
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

ipcMain.handle('show-open-dialog', async () => {
  try {
    await ensureSavesDir();
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Apri stato WSTG',
      defaultPath: savesDir,
      properties: ['openFile'],
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true };
    }

    return { success: true, filePath: result.filePaths[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-file', async (event, filePathOrName, data) => {
  try {
    let filePath;
    let filename;

    // Controlla se è un percorso completo o solo un nome file
    if (path.isAbsolute(filePathOrName)) {
      filePath = filePathOrName;
      filename = path.basename(filePathOrName);
    } else {
      await ensureSavesDir();
      filePath = path.join(savesDir, filePathOrName);
      filename = filePathOrName;
    }

    // Assicurati che la directory esista
    const dir = path.dirname(filePath);
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }

    // Scrittura atomica: un crash a metà scrittura non deve corrompere l'assessment esistente
    const tmpPath = `${filePath}.tmp`;
    await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    await fs.rename(tmpPath, filePath);

    // Salva il percorso completo in last-save.txt
    await ensureSavesDir();
    await fs.writeFile(lastSaveFilePath, filePath, 'utf-8');
    hasUnsavedChanges = false;
    return { success: true, path: filePath, filename };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-file', async (event, filePathOrName) => {
  try {
    let filePath;

    // Controlla se è un percorso completo o solo un nome file
    if (path.isAbsolute(filePathOrName)) {
      filePath = filePathOrName;
    } else {
      filePath = path.join(savesDir, filePathOrName);
    }

    const data = JSON.parse(await fs.readFile(filePath, 'utf-8'));

    // Aggiorna last-save.txt con il percorso completo (solo se il file è JSON valido)
    await ensureSavesDir();
    await fs.writeFile(lastSaveFilePath, filePath, 'utf-8');
    return { success: true, data, filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-last-save-file', async () => {
  try {
    const savedPath = await fs.readFile(lastSaveFilePath, 'utf-8');
    const filePath = savedPath.trim();

    // Verifica se il file esiste
    await fs.access(filePath);

    const filename = path.basename(filePath);
    return { success: true, filename, filePath };
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

// Aggiornamenti WSTG: contano solo le release ufficiali (tag vX.Y), non i lavori in corso su master.
// net.fetch usa la rete di Chromium, quindi anche il proxy di sistema.
const WSTG_REPO = 'OWASP/wstg';
const get = async (url) => {
  const res = await net.fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res;
};

ipcMain.handle('wstg-latest-release', async () => {
  try {
    // releases/latest esclude bozze e prerelease
    const release = await (await get(`https://api.github.com/repos/${WSTG_REPO}/releases/latest`)).json();
    return { success: true, tag: release.tag_name, date: release.published_at };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Scarica la release in saves/wstg-<tag>: checklist e testi markdown della guida (inglese), con i percorsi del repository
ipcMain.handle('wstg-download-release', async (event, tag) => {
  try {
    if (!/^v\d+(\.\d+)*$/.test(tag)) throw new Error(`versione non valida: ${tag}`);
    const { tree, truncated } = await (await get(`https://api.github.com/repos/${WSTG_REPO}/git/trees/${tag}?recursive=1`)).json();
    if (truncated) throw new Error('elenco dei file incompleto');
    const files = tree.filter((f) => f.type === 'blob' && (/^document\/.+\.md$/.test(f.path) || /^checklists?\/checklist\.json$/.test(f.path)));
    const dir = path.join(savesDir, `wstg-${tag}`);
    // Pochi download alla volta, per non farsi limitare da GitHub
    for (let i = 0; i < files.length; i += 8) {
      await Promise.all(
        files.slice(i, i + 8).map(async ({ path: file }) => {
          const target = path.resolve(dir, file);
          if (!target.startsWith(dir + path.sep)) throw new Error(`percorso non valido: ${file}`);
          const res = await get(`https://raw.githubusercontent.com/${WSTG_REPO}/${tag}/${file.split('/').map(encodeURIComponent).join('/')}`);
          await fs.mkdir(path.dirname(target), { recursive: true });
          await fs.writeFile(target, Buffer.from(await res.arrayBuffer()));
        }),
      );
    }
    return { success: true, dir, count: files.length };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Apre nel file manager una cartella dentro saves (es. la release appena scaricata)
ipcMain.handle('open-folder', async (event, dir) => {
  const target = path.resolve(dir);
  if (target.startsWith(savesDir + path.sep)) await shell.openPath(target);
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
  const isDev = process.env.NODE_ENV === 'development';
  // public/ sta accanto al codice in dev, in resources/public (extraResources) in produzione
  const iconPath = isDev
    ? path.join(__dirname, '../public/icon/logo_app.png')
    : path.join(process.resourcesPath, 'public/icon/logo_app.png');

  mainWindow = new BrowserWindow({
    // Misure dell'area dell'app (esclusi bordi e barra del titolo): da 1477 px di larghezza
    // il nome di test più lungo (WSTG-INFO-01) sta su una riga con la lista al 45%
    useContentSize: true,
    width: 1500,
    height: 760,
    minWidth: 1024,
    // 600 e non 700: su un portatile 1080p con scala al 150% l'area utile è alta circa 670px
    minHeight: 600,
    show: false,
    backgroundColor: '#292b33', // = --background dell'app: niente lampo di colore diverso all'avvio
    icon: iconPath,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Rimuove completamente la barra dei menu
  Menu.setApplicationMenu(null);

  // I link esterni (riferimenti WSTG/OWASP) si aprono nel browser di sistema,
  // mai in una finestra Electron; nessuna navigazione fuori dall'app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (/^https?:\/\//i.test(url) && !(isDev && url.startsWith('http://localhost:9999'))) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // In development, carica da Vite dev server
  // In production, carica i file buildati
  if (isDev) {
    mainWindow.loadURL('http://localhost:9999');
    mainWindow.webContents.openDevTools({ mode: 'detach' }); // finestra separata: l'app resta larga come in produzione
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
  // Identità app per la taskbar di Windows (icona/pin/raggruppamento corretti)
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.owasp.wstg.tracker');
  }

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
