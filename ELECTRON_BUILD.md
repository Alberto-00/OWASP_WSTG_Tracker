# 🚀 Guida Electron - Convertire in App Desktop

## 📋 Prerequisiti

- Node.js installato
- Git (opzionale, ma consigliato)

---

## 🎯 Comandi Principali

### **Sviluppo in modalità Desktop**
```bash
npm run electron:dev
```
Questo comando:
1. Avvia Vite dev server sulla porta 8080
2. Aspetta che il server sia pronto
3. Lancia Electron che carica l'app dal dev server
4. Include DevTools aperte automaticamente

### **Build per Windows (.exe installer)**
```bash
npm run electron:build:win
```
Genera: `release/OWASP WSTG Tracker-1.0.0-Setup.exe`

### **Build per Linux (AppImage)**
```bash
npm run electron:build:linux
```
Genera: `release/OWASP WSTG Tracker-1.0.0.AppImage`

### **Build per entrambe le piattaforme**
```bash
npm run electron:build
```

---

## 📁 Struttura File Electron

```
OWASP_WSTG_Tracker/
├── electron/
│   ├── main.js          # Main process Electron
│   ├── preload.js       # Preload script per sicurezza
│   └── splash.html      # Splash screen di caricamento
├── build/
│   ├── icon.svg         # Icona SVG sorgente
│   ├── icon.png         # Icona PNG per Linux (512x512)
│   └── icon.ico         # Icona ICO per Windows
├── dist/                # Build Vite (generato)
└── release/             # Build Electron finali (generato)
```

---

## 🔄 Workflow: Modificare e Ricompilare

### **1. Modifiche al codice React/TypeScript**

Dopo aver modificato file in `src/`:

```bash
# Opzione A: Testa in modalità Desktop
npm run electron:dev

# Opzione B: Compila direttamente
npm run electron:build:win   # o electron:build:linux
```

### **2. Modifiche a Electron (main.js, splash, etc.)**

Dopo aver modificato file in `electron/`:

```bash
# Riavvia semplicemente l'app
npm run electron:dev
```

### **3. Modifiche a icone o configurazione**

Dopo aver modificato `build/icon.*` o `package.json`:

```bash
npm run electron:build:win   # o electron:build:linux
```

---

## 🎨 Personalizzare le Icone

### **Creare icone dalle SVG**

1. **Per Windows (.ico):**
   - Usa un tool online come [icoconverter.com](https://www.icoconverter.com/)
   - Carica `build/icon.svg`
   - Scarica come `icon.ico` in `build/`

2. **Per Linux (.png):**
   - Converti SVG in PNG 512x512
   - Usa [convertio.co](https://convertio.co/it/svg-png/)
   - Salva come `build/icon.png`

---

## ⚙️ Configurazione Avanzata

### **Modificare dimensioni finestra**

Modifica `electron/main.js`:

```javascript
mainWindow = new BrowserWindow({
  width: 1600,        // Larghezza
  height: 1000,       // Altezza
  minWidth: 1200,     // Larghezza minima
  minHeight: 700,     // Altezza minima
  // ...
});
```

### **Modificare splash screen**

Modifica `electron/splash.html` - è puro HTML/CSS

### **Cambiare nome app o versione**

Modifica `package.json`:

```json
{
  "name": "nome-app",
  "productName": "Nome App Visualizzato",
  "version": "1.0.1",
  // ...
}
```

### **Aggiungere menu personalizzato**

In `electron/main.js`, aggiungi:

```javascript
const { Menu } = require('electron');

const menu = Menu.buildFromTemplate([
  {
    label: 'File',
    submenu: [
      { role: 'quit' }
    ]
  }
]);

Menu.setApplicationMenu(menu);
```

---

## 🐛 Troubleshooting

### **Problema: "Electron not found"**
```bash
npm install --save-dev electron
```

### **Problema: Build fallisce**
```bash
# Pulisci e ricompila
rm -rf dist release
npm run build
npm run electron:build
```

### **Problema: Splash screen non si vede**
Controlla che `electron/splash.html` esista e sia valido

### **Problema: L'app è bianca/vuota**
1. Controlla che `dist/` contenga i file buildati
2. Verifica `base: "./"` in `vite.config.ts`
3. Controlla la console con DevTools (F12)

---

## 📦 Distribuire l'App

### **Windows**
1. Compila: `npm run electron:build:win`
2. Vai in `release/`
3. Distribuisci `OWASP WSTG Tracker-1.0.0-Setup.exe`

### **Linux**
1. Compila: `npm run electron:build:linux`
2. Vai in `release/`
3. Distribuisci `OWASP WSTG Tracker-1.0.0.AppImage`
4. Rendi eseguibile: `chmod +x *.AppImage`

---

## 🎬 Quick Start

```bash
# 1. Installa dipendenze (prima volta)
npm install

# 2. Sviluppo Desktop
npm run electron:dev

# 3. Build per distribuzione
npm run electron:build:win    # Windows
npm run electron:build:linux  # Linux
```

---

## 📝 Note Importanti

- **Sempre testa con `electron:dev` prima di fare la build finale**
- **Le build finali sono in `release/`** - non committare questa cartella
- **I file JSON in `public/` sono inclusi automaticamente** nella build
- **DevTools sono aperte solo in development mode**
- **Il splash screen rimane visibile per 1.5 secondi minimo**

---

## 🔐 Sicurezza

L'app usa:
- `contextIsolation: true` - Isola il renderer dal main process
- `nodeIntegration: false` - Disabilita Node.js nel renderer
- `preload.js` - Bridge sicuro per esporre API se necessario

---

## 📞 Supporto

Per problemi o domande, consulta:
- [Electron Docs](https://www.electronjs.org/docs)
- [electron-builder Docs](https://www.electron.build/)
