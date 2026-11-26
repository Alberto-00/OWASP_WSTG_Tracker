import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { Language } from '@/types/checklist';

const en = {
  search: 'Search tests…',
  searchHint: 'Search by ID, name or objective (Ctrl+F)',
  clearSearch: 'Clear search',
  allCategories: 'All categories',
  allStatuses: 'All statuses',
  pending: 'Pending',
  inProgress: 'In progress',
  done: 'Done',
  expandAll: 'Expand all categories',
  collapseAll: 'Collapse all categories',
  mapping: 'Top 10 mapping',
  mappingHint: 'WSTG → OWASP Top 10:2025 mapping',
  save: 'Save',
  saveHint: 'Save to the open file (Ctrl+S)',
  saveAs: 'Save as…',
  open: 'Open…',
  openHint: 'Open a saved assessment (Ctrl+O)',
  noFile: 'no file',
  unsaved: 'Unsaved changes',
  savedAt: 'Saved at {time}',
  overallProgress: 'Overall progress',
  summary: 'Summary',
  howTo: 'How-to',
  tools: 'Tools',
  remediation: 'Remediation',
  notes: 'Notes',
  hasNotes: 'This test has notes',
  emptySection: 'This section is empty for this test.',
  emptyTools: 'The WSTG lists no specific tools for this test.',
  emptyRemediation: 'The WSTG has no remediation section for this test.',
  selectTest: 'Select a test',
  testInfo: 'Test info',
  tabsHint: 'Summary, steps, tools, remediation and your notes appear here.',
  selectTestDesc: 'Pick a test from the list to see its objectives, steps and notes.',
  keyboardHint: '↑ ↓ move between tests · Space changes the status',
  categoryDescription: 'Category description',
  categoryProgress: '{done} of {total} done',
  testObjectives: 'Test objectives',
  reference: 'WSTG reference',
  reconOnly: 'Reconnaissance test: it maps to no specific Top 10 category.',
  status: 'Status',
  noResults: 'No tests match the filters.',
  clearFilters: 'Clear filters',
  selectedCount: '{n} tests selected',
  clearSelection: 'Clear selection',
  collapse: 'Collapse',
  expand: 'Expand',
  mappingTitle: 'WSTG → OWASP Top 10:2025 mapping',
  mappingDesc: 'Each WSTG test is linked to the Top 10 categories of the weaknesses it can uncover.',
  linkedTests: 'Linked WSTG tests',
  coverage: '{done}/{total} done',
  owaspPage: 'OWASP page',
  riskLevel: 'Risk',
  critico: 'Critical',
  alto: 'High',
  medio: 'Medium',
  basso: 'Low',
  language: 'Language',
  ok: 'OK',
  cancel: 'Cancel',
  close: 'Close',
  confirm: 'Confirm',
  unsavedTitle: 'Unsaved changes',
  unsavedExitMsg: 'You have unsaved changes. Save them before quitting?',
  unsavedOpenMsg: 'You have unsaved changes. Save them before opening another file?',
  saveNow: 'Save',
  dontSave: "Don't save",
  confirmExitTitle: 'Quit without saving?',
  confirmExitMsg: 'Your unsaved changes will be lost.',
  quitWithoutSaving: 'Quit without saving',
  saveErrorTitle: 'Save failed',
  saveErrorMsg: 'The file could not be saved: {error}',
  openErrorTitle: 'Open failed',
  openErrorMsg: 'The selected file is not a valid save or is damaged.',
  contentError: 'The checklist could not be loaded. Restart the application; if the problem persists, reinstall it.',
  // Editor note
  bold: 'Bold (Ctrl+B)',
  italic: 'Italic (Ctrl+I)',
  underline: 'Underline (Ctrl+U)',
  strike: 'Strikethrough',
  inlineCode: 'Inline code',
  blockType: 'Block type',
  paragraph: 'Paragraph',
  heading1: 'Heading 1',
  heading2: 'Heading 2',
  heading3: 'Heading 3',
  bulletList: 'Bulleted list',
  orderedList: 'Numbered list',
  codeBlock: 'Code block',
  highlight: 'Highlight',
  removeHighlight: 'Remove highlight',
  amber: 'Amber',
  orange: 'Orange',
  pink: 'Pink',
  purple: 'Purple',
  blue: 'Blue',
  green: 'Green',
  quote: 'Quote',
  divider: 'Divider',
  clearFormatting: 'Clear formatting',
  notesPlaceholder: 'Write your notes for this test…',
  codeBlockHint: 'Code block: Esc or Ctrl+Enter to exit',
};

type TranslationKey = keyof typeof en;

const it: Record<TranslationKey, string> = {
  search: 'Cerca test…',
  searchHint: 'Cerca per ID, nome o obiettivo (Ctrl+F)',
  clearSearch: 'Cancella ricerca',
  allCategories: 'Tutte le categorie',
  allStatuses: 'Tutti gli stati',
  pending: 'Da fare',
  inProgress: 'In corso',
  done: 'Completato',
  expandAll: 'Espandi tutte le categorie',
  collapseAll: 'Comprimi tutte le categorie',
  mapping: 'Mappatura Top 10',
  mappingHint: 'Mappatura WSTG → OWASP Top 10:2025',
  save: 'Salva',
  saveHint: 'Salva nel file aperto (Ctrl+S)',
  saveAs: 'Salva con nome…',
  open: 'Apri…',
  openHint: 'Apri un assessment salvato (Ctrl+O)',
  noFile: 'nessun file',
  unsaved: 'Modifiche non salvate',
  savedAt: 'Salvato alle {time}',
  overallProgress: 'Avanzamento complessivo',
  summary: 'Sommario',
  howTo: 'How-To',
  tools: 'Strumenti',
  remediation: 'Mitigazione',
  notes: 'Note',
  hasNotes: 'Questo test ha delle note',
  emptySection: 'Questa sezione è vuota per questo test.',
  emptyTools: 'La guida WSTG non indica strumenti specifici per questo test.',
  emptyRemediation: 'La guida WSTG non riporta una sezione di mitigazione per questo test.',
  selectTest: 'Seleziona un test',
  testInfo: 'Info test',
  tabsHint: 'Qui compaiono sommario, procedura, strumenti, mitigazione e le tue note.',
  selectTestDesc: 'Scegli un test dalla lista per vederne obiettivi, procedura e note.',
  keyboardHint: '↑ ↓ scorre i test · Spazio cambia lo stato',
  categoryDescription: 'Descrizione categoria',
  categoryProgress: '{done} di {total} completati',
  testObjectives: 'Obiettivi del test',
  reference: 'Riferimento WSTG',
  reconOnly: 'Test di ricognizione: non corrisponde a una categoria specifica della Top 10.',
  status: 'Stato',
  noResults: 'Nessun test corrisponde ai filtri.',
  clearFilters: 'Azzera filtri',
  selectedCount: '{n} test selezionati',
  clearSelection: 'Annulla selezione',
  collapse: 'Comprimi',
  expand: 'Espandi',
  mappingTitle: 'Mappatura WSTG → OWASP Top 10:2025',
  mappingDesc: 'Ogni test WSTG è collegato alle categorie della Top 10 delle debolezze che può far emergere.',
  linkedTests: 'Test WSTG collegati',
  coverage: '{done}/{total} completati',
  owaspPage: 'Pagina OWASP',
  riskLevel: 'Rischio',
  critico: 'Critico',
  alto: 'Alto',
  medio: 'Medio',
  basso: 'Basso',
  language: 'Lingua',
  ok: 'OK',
  cancel: 'Annulla',
  close: 'Chiudi',
  confirm: 'Conferma',
  unsavedTitle: 'Modifiche non salvate',
  unsavedExitMsg: 'Ci sono modifiche non salvate. Vuoi salvarle prima di uscire?',
  unsavedOpenMsg: 'Ci sono modifiche non salvate. Vuoi salvarle prima di aprire un altro file?',
  saveNow: 'Salva',
  dontSave: 'Non salvare',
  confirmExitTitle: 'Uscire senza salvare?',
  confirmExitMsg: 'Le modifiche non salvate andranno perse.',
  quitWithoutSaving: 'Esci senza salvare',
  saveErrorTitle: 'Salvataggio non riuscito',
  saveErrorMsg: 'Impossibile salvare il file: {error}',
  openErrorTitle: 'Apertura non riuscita',
  openErrorMsg: 'Il file selezionato non è un salvataggio valido o è danneggiato.',
  contentError: "Impossibile caricare la checklist. Riavvia l'applicazione; se il problema persiste, reinstallala.",
  bold: 'Grassetto (Ctrl+B)',
  italic: 'Corsivo (Ctrl+I)',
  underline: 'Sottolineato (Ctrl+U)',
  strike: 'Barrato',
  inlineCode: 'Codice inline',
  blockType: 'Tipo di blocco',
  paragraph: 'Paragrafo',
  heading1: 'Titolo 1',
  heading2: 'Titolo 2',
  heading3: 'Titolo 3',
  bulletList: 'Elenco puntato',
  orderedList: 'Elenco numerato',
  codeBlock: 'Blocco di codice',
  highlight: 'Evidenzia',
  removeHighlight: 'Rimuovi evidenziazione',
  amber: 'Ambra',
  orange: 'Arancione',
  pink: 'Rosa',
  purple: 'Viola',
  blue: 'Blu',
  green: 'Verde',
  quote: 'Citazione',
  divider: 'Linea di separazione',
  clearFormatting: 'Rimuovi formattazione',
  notesPlaceholder: 'Scrivi qui le note del test…',
  codeBlockHint: 'Blocco di codice: Esc o Ctrl+Invio per uscire',
};

const translations: Record<Language, Record<TranslationKey, string>> = { en, it };

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const STORAGE_KEY = 'wstg-tracker-language';

const readStoredLanguage = (): Language => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'it') return stored;
  } catch {
    // storage non disponibile: si usa il default
  }
  return 'it';
};

const LanguageContext = createContext<LanguageContextType | null>(null);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(readStoredLanguage);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // preferenza non persistita, nessun impatto funzionale
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => {
      const text = translations[language][key];
      return vars ? text.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m)) : text;
    },
    [language],
  );

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
};
