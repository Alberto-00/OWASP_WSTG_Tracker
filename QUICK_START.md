# ⚡ Quick Start - OWASP WSTG Tracker Desktop

## 🎯 Comandi Essenziali

### **1. Testare l'app in modalità Desktop (con DevTools)**
```bash
npm run electron:dev
```
👉 Questo apre l'app come applicazione desktop con splash screen

### **2. Creare .EXE per Windows**
```bash
npm run electron:build:win
```
📦 Trovi il file in: `release/OWASP WSTG Tracker-1.0.0-Setup.exe`

### **3. Creare .AppImage per Linux**
```bash
npm run electron:build:linux
```
📦 Trovi il file in: `release/OWASP WSTG Tracker-1.0.0.AppImage`

---

## 🔄 Dopo Ogni Modifica al Codice

### Se modifichi file React/TypeScript (cartella `src/`):

```bash
npm run electron:dev        # Testa subito
npm run electron:build:win  # Quando sei pronto per distribuire
```

### Se modifichi solo lo splash screen:

Modifica `electron/splash.html` e riavvia:
```bash
npm run electron:dev
```

---

## 📝 File Importanti

- **electron/main.js** - Logica principale Electron
- **electron/splash.html** - Splash screen di caricamento (solo questo popup)
- **electron/preload.js** - Sicurezza
- **build/icon.*** - Icone dell'app
- **package.json** - Configurazione e versione

---

## ✨ Features

✅ Splash screen animato (solo il popup, non tutto lo sfondo)
✅ Finestra principale con dimensioni minime
✅ DevTools in development mode
✅ Build automatica per Windows e Linux
✅ Icone personalizzabili

---

## 🎨 Personalizzare

### Cambiare nome app:
`package.json` → modifica `"productName"`

### Cambiare versione:
`package.json` → modifica `"version"`

### Cambiare dimensioni finestra:
`electron/main.js` → modifica `width`, `height`, `minWidth`, `minHeight`

### Cambiare icona:
Sostituisci `build/icon.png` e `build/icon.ico`

---

## 🐛 Problemi Comuni

**L'app non si apre?**
```bash
# Controlla che le dipendenze siano installate
npm install
```

**Build fallisce?**
```bash
# Pulisci tutto e ricompila
rm -rf dist release node_modules
npm install
npm run electron:build
```

**Splash screen non appare?**
Controlla che `electron/splash.html` esista

---

## 📖 Documentazione Completa

Leggi [ELECTRON_BUILD.md](ELECTRON_BUILD.md) per la guida dettagliata
