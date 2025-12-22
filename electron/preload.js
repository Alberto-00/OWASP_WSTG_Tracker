// Preload script per esporre API sicure al renderer process
// In questo caso non abbiamo bisogno di esporre nulla,
// ma è buona pratica avere il preload per future integrazioni

const { contextBridge } = require('electron');

// Esempio: esporre versione dell'app
contextBridge.exposeInMainWorld('electron', {
  // Puoi aggiungere qui API personalizzate se necessario
  platform: process.platform,
  version: process.env.npm_package_version || '1.0.0'
});
