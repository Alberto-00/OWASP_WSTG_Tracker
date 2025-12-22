# 🚀 Guida Deploy - OWASP WSTG Tracker

## ✅ **Problema Risolto: 404 in Electron**

**Causa**: `BrowserRouter` non funziona con `file://` protocol in Electron
**Soluzione**: Cambiato in `HashRouter` in [src/App.tsx](src/App.tsx#L5)

---

## 📦 **Versioni Disponibili**

### **1. Web App (Browser)**
```bash
npm run dev          # Development con hot reload
npm run build        # Build per produzione web
npm run preview      # Preview build web
```

### **2. Desktop App (Electron)**
```bash
npm run electron:dev           # Development desktop con DevTools
npm run electron:build:win     # Build .exe per Windows
npm run electron:build:linux   # Build .AppImage per Linux
```

---

## 🎨 **Loading Screens**

### **Development Web (Vite)**
- Loading predefinito di Vite
- Visibile solo in `npm run dev`

### **Production Desktop (Electron)**
- **Splash Screen Personalizzato**: [electron/splash.html](electron/splash.html)
- Popup animato con logo, gradiente, loading bar
- Sfondo trasparente (solo il popup)
- Durata: 1.5 secondi minimo

---

## 🔄 **Workflow Completo**

```
┌─────────────────────────────────┐
│ 1. Sviluppo                     │
├─────────────────────────────────┤
│ • Modifica src/                 │
│ • npm run electron:dev          │ ← Testa desktop
│ • (oppure npm run dev per web) │
├─────────────────────────────────┤
│ 2. Build                        │
├─────────────────────────────────┤
│ • npm run electron:build:win    │ ← Crea .exe
├─────────────────────────────────┤
│ 3. Output                       │
├─────────────────────────────────┤
│ • release/*.exe                 │ ← Distribuisci
└─────────────────────────────────┘
```

---

## 🐛 **Troubleshooting**

### **Problema: Pagina 404 in Electron**
✅ **Risolto**: Usa `HashRouter` invece di `BrowserRouter`

### **Problema: Non vedo il loading**
- **In development web**: Vite mostra il suo loading
- **In Electron**: Vedi lo splash screen personalizzato
- **Sono due cose diverse e normali**

### **Problema: L'exe non si apre**
- Controlla antivirus (potrebbe bloccare exe non firmato)
- Prova a eseguire come amministratore
- Controlla i log nella console (F12 in development)

---

## 📝 **Note Importanti**

1. **HashRouter vs BrowserRouter**:
   - Web: Puoi usare entrambi
   - Electron: DEVI usare HashRouter
   - Attualmente configurato per HashRouter (funziona ovunque)

2. **Splash Screen**:
   - Solo in Electron
   - Non appare in web mode
   - Personalizzabile in [electron/splash.html](electron/splash.html)

3. **Loading**:
   - Vite loading: solo in `npm run dev`
   - Splash screen: solo in Electron
   - Production web: nessun loading (instant)

---

## ✨ **Prossimi Passi**

- [ ] Personalizza splash screen
- [ ] Crea icona custom (build/icon.ico)
- [ ] Testa l'exe su altri PC
- [ ] Considera firma del codice (opzionale)
