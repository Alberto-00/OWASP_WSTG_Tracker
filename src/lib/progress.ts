import type { ProgressData, TestStatus } from '../types/checklist';

const STATUSES: readonly string[] = ['pending', 'in-progress', 'done'];

// Nota vuota dell'editor (documento senza testo): non va salvata né conta come modifica.
export const isEmptyNote = (html: string | undefined) => !html || html === '<p></p>';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// Valida un file di avanzamento (input non fidato: lo sceglie l'utente).
// Tiene solo stati e note ben formati; lancia un errore se il file non è un salvataggio.
export const normalizeProgress = (data: unknown): ProgressData => {
  if (!isRecord(data) || (!isRecord(data.status) && !isRecord(data.notes))) {
    throw new Error('Not a WSTG Tracker progress file');
  }
  const status: Record<string, TestStatus> = {};
  if (isRecord(data.status)) {
    for (const [id, value] of Object.entries(data.status)) {
      if (typeof value === 'string' && STATUSES.includes(value)) status[id] = value as TestStatus;
    }
  }
  const notes: Record<string, string> = {};
  if (isRecord(data.notes)) {
    for (const [id, value] of Object.entries(data.notes)) {
      if (typeof value === 'string' && !isEmptyNote(value)) notes[id] = value;
    }
  }
  return { status, notes };
};

// Forma canonica per capire se ci sono modifiche: ignora l'ordine delle chiavi,
// gli stati "pending" (equivalenti all'assenza) e le note vuote.
export const canonicalProgress = ({ status, notes }: ProgressData) => {
  const byKey = (a: [string, unknown], b: [string, unknown]) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
  return JSON.stringify([
    Object.entries(status).filter(([, s]) => s !== 'pending').sort(byKey),
    Object.entries(notes).filter(([, n]) => !isEmptyNote(n)).sort(byKey),
  ]);
};
