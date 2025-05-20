# OWASP WSTG Checklist Tracker

Applicazione desktop in PyQt6 per visualizzare, filtrare e annotare la checklist dell'OWASP Web Security Testing Guide (WSTG), con riferimento incrociato all'OWASP Top 10.

## Caratteristiche

* ✔️ Visualizzazione interattiva della checklist WSTG.
* 🔎 Ricerca dinamica e filtro per categoria.
* ✅ Stato dei test: "Non fatto", "In corso", "Completato".
* 📚 Dettagli offline per ogni test (How-To, Tools, Remediation).
* 🧩 Mappa visiva WSTG ↔ OWASP Top 10 (2021).
* 💾 Salvataggio/caricamento stato checklist in JSON.
* 🎨 UI dark mode moderna + splash screen animato.
* 🖱️ Effetto hover coerente su ogni riga della lista e sulla tabella mapping.

## Requisiti

* Python 3.8+
* PyQt6

Installa le dipendenze con:

```bash
pip install -r requirements.txt
```

## Esecuzione

```bash
python main.py
```

Assicurati che la seguente struttura sia mantenuta:

```
.
├── asset/
│   └── logo.png
├── json/
│   ├── checklist.json
│   ├── category_descriptions.json
│   ├── owasp_top_10.json
│   └── wstg_offline_data.json
├── saves/
│   └── progress_temp.json (generato al salvataggio)
├── ui/
│   ├── main_window.py
│   └── splash_screen.py
├── main.py
├── requirements.txt
└── README.md
```

## Salvataggio Stato Checklist

Il file viene salvato in `saves/progress_temp.json` o in un file selezionato manualmente via GUI.

## Produzione Eseguibili

### Windows (usando PyInstaller)

```bash
pip install pyinstaller
pyinstaller --onefile --windowed --add-data "json;json" --add-data "asset;asset" main.py
```

Output: `dist/main.exe`

### Linux

Stesso comando PyInstaller. Assicurati che i percorsi per `--add-data` siano compatibili:

```bash
pyinstaller --onefile --windowed \
  --add-data "json:json" \
  --add-data "asset:asset" \
  main.py
```

Esegui con:

```bash
./dist/main
```

## Esempio Screenshot

![screenshot](asset/screen_sample.png)

## TODO Futuri

* Esportazione in PDF.
* Modifica dei test custom.
* Sincronizzazione con repository remoti OWASP.
