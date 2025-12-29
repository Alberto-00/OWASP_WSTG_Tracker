# OWASP WSTG Tracker

Applicazione desktop sviluppata con Electron, React e TypeScript per tracciare e gestire test di sicurezza secondo le linee guida OWASP Web Security Testing Guide (WSTG).

## 🎯 Panoramica

L'applicazione organizza i test in 11 categorie principali del framework OWASP WSTG, permettendo di:

- **Tracciare test di sicurezza** con stati personalizzati (Pending, In Progress, Done)
- **Gestire checklist** per ogni categoria di test con informazioni dettagliate
- **Monitorare progressi** attraverso statistiche e contatori in tempo reale
- **Mappare vulnerabilità** alla OWASP Top 10 per analisi di rischio
- **Salvare e caricare** dati in formato JSON con auto-save
- **Navigare in italiano o inglese** con cambio lingua istantaneo

### Stati Test
- ⏳ **Pending** - Test da eseguire
- 🔄 **In Progress** - Test in corso
- ✅ **Done** - Test completato

---

## 🚀 Installazione e Avvio

### Prerequisiti

- **Node.js** 16+
- **npm** (incluso con Node.js)

### 1. Installazione

```bash
npm install
```

### 2. Avvio Applicazione

#### Modalità Desktop (Electron)
```bash
npm run electron:dev
```
Avvia l'applicazione desktop completa con tutte le funzionalità native.

#### Modalità Web (solo sviluppo)
```bash
npm run dev
```
Apre l'interfaccia web su `http://localhost:8080` (funzionalità limitate senza Electron)

---

## 🔨 Build e Distribuzione

### Build Applicazione Web

```bash
npm run build
```
Genera i file statici ottimizzati nella cartella `dist/` per deployment web.

### Build Applicazione Desktop

#### Windows
```bash
npm run electron:build:win
```
- **Output**: `release/OWASP WSTG Tracker-1.0.0-Portable.exe`
- **Formato**: Eseguibile portabile (non richiede installazione)
- **Architettura**: x64

#### Linux
```bash
npm run electron:build:linux
```
- **Output**: `release/OWASP WSTG Tracker-1.0.0.AppImage`
- **Formato**: AppImage
- **Architettura**: x64
- **Categoria**: Development

#### Build Multipiattaforma
```bash
npm run electron:build
```
Crea automaticamente la build per il sistema operativo corrente.

---

## 📊 Funzionalità

### 1. Gestione Checklist
- **Organizzazione per categorie** - 11 categorie WSTG (Information Gathering, Authentication, Authorization, ecc.)
- **Ricerca rapida** - Filtra test per ID o nome
- **Filtri avanzati** - Per categoria e stato (Pending/In Progress/Done)
- **Contatori in tempo reale** - Progress bar dinamica con percentuale completamento
- **Espandi/Collassa** - Visualizzazione ottimizzata delle categorie

### 2. Dettagli Test
Per ogni test sono disponibili:
- **Summary** - Descrizione completa del test
- **How-To** - Guida step-by-step per l'esecuzione
- **Tools** - Strumenti consigliati (Burp Suite, OWASP ZAP, ecc.)
- **Remediation** - Raccomandazioni di remediation
- **Notes** - Editor rich-text per note personalizzate con formattazione

### 3. Mappatura OWASP Top 10
- **Visualizzazione correlazioni** - Ogni categoria WSTG mappata alle vulnerabilità Top 10
- **Livelli di rischio** - Critico, Alto, Medio, Basso
- **Descrizioni dettagliate** - Per ogni vulnerabilità con link esterni
- **Modal interattivo** - Navigazione visuale tra WSTG e Top 10

### 4. Gestione File
- **Auto-save** - Salvataggio automatico dell'ultimo file utilizzato
- **Prompt salvataggio** - Dialog nativo per scegliere nome e posizione file
- **Tracking modifiche** - Sistema di rilevamento modifiche non salvate
- **Dialog conferma** - Avviso prima di chiudere con modifiche non salvate
- **Formato JSON** - Import/Export compatibile e leggibile
- **Cartella saves** - Tutti i salvataggi in `public/saves/`

### 5. Multilingua
- **Italiano** (default)
- **Inglese**
- **Cambio istantaneo** - Senza reload dell'applicazione
- **Dati localizzati** - Checklist, descrizioni e UI completamente tradotte

### 6. Note Editor
- **Formattazione testo** - Grassetto, corsivo, sottolineato, barrato
- **Headers** - H1, H2, H3, paragrafi
- **Liste** - Puntate e numerate
- **Codice** - Inline code e blocchi di codice
- **Evidenziazione** - 6 colori disponibili
- **Dimensioni testo** - 5 livelli di grandezza
- **Clear formatting** - Rimozione formattazione selettiva

---

## 📁 Struttura Progetto

```
OWASP_WSTG_Tracker/
├── src/                          # Codice sorgente React/TypeScript
│   ├── components/               # Componenti React
│   │   ├── ChecklistApp.tsx     # Componente principale dell'applicazione
│   │   ├── MessageModal.tsx     # Sistema modale per conferme/errori
│   │   └── ui/                  # Componenti UI shadcn/ui
│   ├── hooks/                   # React Hooks personalizzati
│   │   ├── useChecklist.tsx     # Gestione stato checklist e auto-load
│   │   ├── useLanguage.tsx      # Internazionalizzazione
│   │   └── useMessageModal.tsx  # Gestione state modali
│   ├── types/                   # Definizioni TypeScript
│   │   ├── checklist.d.ts       # Tipi per checklist, test, stati
│   │   └── electron.d.ts        # Tipi per API Electron
│   ├── pages/                   # Pagine applicazione
│   ├── App.tsx                  # Router principale
│   └── main.tsx                 # Entry point React
├── electron/                    # Configurazione Electron
│   ├── main.js                  # Processo principale (IPC, finestre, file system)
│   └── preload.js               # Context bridge per API sicure
├── public/                      # Asset statici
│   ├── json/                    # Dati checklist JSON
│   │   ├── en/                  # Dati localizzati inglese
│   │   │   ├── checklist.json
│   │   │   ├── category_descriptions.json
│   │   │   ├── checklist_info_data.json
│   │   │   └── owasp_top_10.json
│   │   ├── it/                  # Dati localizzati italiano
│   │   │   └── (stessi file)
│   │   └── progress.json        # File progress default
│   ├── icon/                    # Icone applicazione
│   │   └── icon_256x256.ico
│   └── saves/                   # Cartella salvataggi utente
│       └── last-save.txt        # Riferimento ultimo file salvato
├── dist/                        # Build output web (generato)
├── release/                     # Eseguibili Electron (generato)
├── vite.config.ts               # Configurazione Vite
├── tsconfig.json                # Configurazione TypeScript
├── tailwind.config.js           # Configurazione Tailwind CSS
└── package.json                 # Configurazione npm e build
```

---

## ⚙️ Configurazione

### package.json - Informazioni Progetto

```json
{
  "name": "owasp-wstg-tracker",
  "version": "1.0.0",
  "productName": "OWASP WSTG Tracker",
  "description": "Desktop application for tracking OWASP Web Security Testing Guide checklist",
  "main": "electron/main.js"
}
```

### package.json - Build Electron

```json
{
  "build": {
    "appId": "com.owasp.wstg.tracker",
    "productName": "OWASP WSTG Tracker",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "electron/**/*",
      "public/**/*"
    ],
    "win": {
      "target": "portable",
      "arch": ["x64"],
      "sign": false
    },
    "linux": {
      "target": "AppImage",
      "arch": ["x64"],
      "category": "Development"
    }
  }
}
```

### vite.config.ts

```typescript
export default defineConfig({
  base: './',              // Path relativo per Electron
  server: {
    port: 8080            // Porta server sviluppo
  },
  build: {
    outDir: 'dist',       // Cartella output
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
```

---

## 📄 Formato Dati

### Struttura File JSON

I dati delle checklist sono organizzati in 4 file per lingua:

#### 1. checklist.json
Contiene le categorie WSTG e i relativi test:

```json
{
  "categories": {
    "Information Gathering": {
      "id": "WSTG-INFO",
      "tests": [
        {
          "id": "WSTG-INFO-01",
          "name": "Conduct Search Engine Discovery Reconnaissance",
          "objectives": [
            "Identify what sensitive information is exposed",
            "Determine the attack surface"
          ],
          "reference": "https://owasp.org/..."
        }
      ]
    }
  }
}
```

#### 2. category_descriptions.json
Descrizioni dettagliate per ogni categoria:

```json
{
  "Information Gathering": "Questa fase iniziale consiste nel raccogliere..."
}
```

#### 3. checklist_info_data.json
Informazioni dettagliate per ogni test (summary, how-to, tools, remediation):

```json
{
  "WSTG-INFO-01": {
    "summary": "<p>Descrizione HTML...</p>",
    "how-to": "<p>Guida HTML...</p>",
    "tools": "<ul><li>Tool 1</li></ul>",
    "remediation": "<p>Raccomandazioni...</p>"
  }
}
```

#### 4. owasp_top_10.json
Mappatura alle vulnerabilità OWASP Top 10:

```json
{
  "A01:2021 - Broken Access Control": {
    "level": "critico",
    "description": "<p>Descrizione vulnerabilità...</p>",
    "link": "https://owasp.org/..."
  }
}
```

### File di Progresso (progress.json)

Salvato automaticamente in `public/saves/`:

```json
{
  "status": {
    "WSTG-INFO-01": "done",
    "WSTG-INFO-02": "in-progress",
    "WSTG-INFO-03": "pending"
  },
  "notes": {
    "WSTG-INFO-01": "<p>Note HTML formattate...</p>"
  }
}
```

---

## 🔧 Script NPM Disponibili

| Comando | Descrizione |
|---------|-------------|
| `npm run dev` | Avvia dev server Vite (web only) |
| `npm run build` | Build produzione web |
| `npm run electron:dev` | Avvia Electron in modalità sviluppo |
| `npm run electron:build` | Build Electron per OS corrente |
| `npm run electron:build:win` | Build Electron per Windows |
| `npm run electron:build:linux` | Build Electron per Linux |

---

## 📝  di Sviluppo

### Gestione Stati
- Gli stati dei test sono gestiti tramite `useChecklist` hook
- `isInitialLoadComNoteplete` assicura che non vengano rilevate false modifiche all'avvio
- `initialStateRef` traccia lo stato iniziale per rilevare modifiche non salvate

### IPC Electron
Comunicazione tra main e renderer process tramite:
- `ipcMain.handle()` - Gestori nel main process
- `ipcRenderer.invoke()` - Chiamate dal renderer
- `contextBridge` - Esposizione API sicure via preload

### Auto-save System
1. Al caricamento, cerca `last-save.txt` in `public/saves/`
2. Se trovato, carica il file referenziato
3. Altrimenti carica `json/progress.json` come default
4. Ogni salvataggio aggiorna `last-save.txt`

### Warning Modifiche
- `hasUnsavedChanges` state in React
- Sincronizzato con Electron main process
- Dialog personalizzato (MessageModal) invece di dialog nativi
- Opzioni: Salva ed Esci / Esci senza Salvare / Annulla
