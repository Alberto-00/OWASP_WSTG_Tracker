import { createContext, useContext, useState, ReactNode } from 'react';
import { Language } from '@/types/checklist';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    search: 'Search tests...',
    allCategories: 'All Categories',
    mapping: 'Mapping WSTG → OWASP Top 10',
    saveState: 'Save State',
    loadState: 'Load State',
    pending: 'Pending',
    inProgress: 'In Progress',
    done: 'Done',
    summary: 'Summary',
    howTo: 'How-To',
    tools: 'Tools',
    remediation: 'Remediation',
    notes: 'Notes',
    selectTest: 'Select a test',
    selectTestDesc: 'Click on a test from the list to see details',
    categoryDescription: 'Category Description',
    testDetails: 'Test Details',
    testObjectives: 'Test Objectives',
    reference: 'Reference',
    overallProgress: 'Overall Progress',
    completed: 'completed',
  },
  it: {
    search: 'Cerca test...',
    allCategories: 'Tutte le Categorie',
    mapping: 'Mapping WSTG → OWASP Top 10',
    saveState: 'Salva Stato',
    loadState: 'Carica Stato',
    pending: 'Da Fare',
    inProgress: 'In Corso',
    done: 'Completato',
    summary: 'Sommario',
    howTo: 'How-To',
    tools: 'Strumenti',
    remediation: 'Rimediazione',
    notes: 'Note',
    selectTest: 'Seleziona un test',
    selectTestDesc: 'Clicca su un test dalla lista per vedere i dettagli',
    categoryDescription: 'Descrizione Categoria',
    testDetails: 'Dettagli Test',
    testObjectives: 'Obiettivi del Test',
    reference: 'Riferimento',
    overallProgress: 'Progresso Complessivo',
    completed: 'completati',
  },
};

const LanguageContext = createContext<LanguageContextType | null>(null);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('it');
  const t = (key: string) => translations[language][key] || key;
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
};
