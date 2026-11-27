export type TestStatus = 'pending' | 'in-progress' | 'done';
export type Language = 'en' | 'it';

export interface WSTGTest {
  id: string;
  name: string;
  reference: string;
  objectives: string[];
}

export interface WSTGCategory {
  id: string;
  name: string;
  tests: WSTGTest[];
}

export interface ChecklistData {
  categories: Record<string, { id: string; tests: WSTGTest[] }>;
}

export interface TestInfoData {
  summary?: string;
  'how-to'?: string;
  tools?: string;
  remediation?: string;
  test_objectives?: string;
}

// Categoria OWASP Top 10:2025 come pubblicata su top10.owasp.org (scripts/import-top10.mjs)
export interface OwaspTop10Item {
  link: string;
  // Tabella dei punteggi ufficiale: [etichetta, valore] come scritti nella pagina di quella lingua
  stats: [string, string][];
  background: string;
  description: string;
  prevention: string;
  scenarios: string;
  references: string;
  cwes: { id: string; name: string; url: string }[];
}

export interface ProgressData {
  status: Record<string, TestStatus>;
  notes: Record<string, string>;
}
