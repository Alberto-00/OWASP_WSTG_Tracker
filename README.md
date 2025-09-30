# OWASP WSTG Checklist Tracker

Applicazione desktop per facilitare i Web Application Penetration Test (WAPT): visualizza e gestisce in modo interattivo la checklist della **OWASP Web Security Testing Guide (WSTG)**, con stato dei test, ricerca, dettagli offline e una mappatura rapida con l’**OWASP Top 10 (2021)**.
Pensata per lavorare **offline**, con **salvataggi persistenti** e build **portabili** per Windows e Linux.

> Gli eseguibili sono disponibili nella sezione **Releases** del repository. In alternativa, puoi costruirli in locale seguendo le istruzioni sotto.

---

## Caratteristiche principali

* ✔️ Visualizzazione interattiva della checklist WSTG.
* 🔎 Ricerca dinamica e filtro per categoria.
* ✅ Stato dei test: "Non fatto", "In corso", "Completato".
* 📚 Dettagli offline per ogni test (How-To, Tools, Remediation).
* 🧩 Mappa visiva WSTG ↔ OWASP Top 10 (2021).
* 💾 Salvataggio/caricamento stato checklist in JSON.

---

## Struttura del progetto

```
.
├── main.py
├── public
│   ├── icon
│   │   ├── icon_256x256.ico
│   │   ├── logo_app_2.png
│   │   └── logo_app.png
│   ├── json
│   │   ├── en
│   │   │   ├── category_descriptions.json
│   │   │   ├── checklist_info_data.json
│   │   │   ├── checklist.json
│   │   │   └── owasp_top_10.json
│   │   ├── it
│   │   │   ├── category_descriptions.json
│   │   │   ├── checklist_info_data.json
│   │   │   ├── checklist.json
│   │   │   └── owasp_top_10.json
│   │   └── progress.json
│   └── saves
└── ui
    ├── loading_screen.py
    └──  owasp_screen.py
```

---

## Requisiti

* **Python 3.8+** (consigliato 3.10+)
* **PyQt6**

Installa le dipendenze:

```bash
pip install -r requirements.txt
# oppure:
pip install PyQt6
```

Esegui:

```bash
python main.py
```

---

## Build degli eseguibili (Windows & Linux)

La build usa **PyInstaller** e **non fa cross-compile**:

* costruisci l’`.exe` **su Windows**
* costruisci il binario **su Linux**

### Comandi rapidi

**Windows**

```powershell
pyinstaller --noconfirm --clean --name OWASP --noconsole --onefile `
  --icon public\icon\icon_256x256.ico `
  --hidden-import PyQt6 --hidden-import PyQt6.QtCore --hidden-import PyQt6.QtGui --hidden-import PyQt6.QtWidgets `
  --add-data "public;public" --add-data "ui;ui" `
  main.py
```

**Linux**

Da linux o WSL lancia:

```bash
pyinstaller --noconfirm --clean --name OWASP --noconsole --onefile \
  --icon public/icon/logo_app.png \
  --hidden-import PyQt6 --hidden-import PyQt6.QtCore --hidden-import PyQt6.QtGui --hidden-import PyQt6.QtWidgets \
  --add-data "public:public" --add-data "ui:ui" \
  main.py
```

> Nota separatore `--add-data`: Windows usa `;`, Linux usa `:`.<br>
> In `--onefile` puoi spostare liberamente l’eseguibile.<br>
> In `--onedir` **devi spostare l’intera cartella** `dist/OWASP/` (exe + risorse).

---


## Screenshot

### Lista dei test WSTG

![screenshot](screen/page_1.png)

Questa schermata mostra l'elenco completo dei test WSTG, organizzati per categoria. È possibile espandere o comprimere le sezioni, cambiare lo stato dei test con il tasto destro e visualizzare i dettagli nella parte destra della finestra. Ogni test include obiettivi, link ufficiali e un sommario tecnico.

---

### Mappatura OWASP Top 10

![screenshot](screen/page_2.png)

La seconda schermata evidenzia la corrispondenza tra le categorie WSTG e i rischi identificati dall'OWASP Top 10 (2021). Questo aiuta a comprendere quali vulnerabilità vengono coperte da ogni sezione della checklist e ad allineare i test alle priorità di rischio.

---

## Autore & Contatti

| Nome | Descrizione |
| --- | --- |
| <p dir="auto"><strong>Alberto Montefusco</strong> |<br>Developer - <a href="https://github.com/Alberto-00">Alberto-00</a></p><p dir="auto">LinkedIn - <a href="https://www.linkedin.com/in/alberto-montefusco">Alberto Montefusco</a></p><p dir="auto">My WebSite - <a href="https://alberto-00.github.io/">alberto-00.github.io</a></p><br>|
