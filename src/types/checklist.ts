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

export interface OwaspTop10Item {
  description: string;
  link: string;
  level: 'basso' | 'medio' | 'alto' | 'critico';
}

export interface ProgressData {
  status: Record<string, TestStatus>;
  notes: Record<string, string>;
}
