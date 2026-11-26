import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from './useLanguage';
import { WSTGCategory, WSTGTest, TestStatus, TestInfoData, OwaspTop10Item, ProgressData } from '@/types/checklist';
import { canonicalProgress, isEmptyNote, normalizeProgress } from '@/lib/progress';

export interface OpenFile {
  name: string;
  // Percorso completo se il file è dell'utente (sovrascrivibile con Salva), null per il progress.json incluso nell'app
  path: string | null;
}

const fileName = (filePath: string) => filePath.split(/[\\/]/).pop() || filePath;

export const useChecklist = () => {
  const { language } = useLanguage();
  const [categories, setCategories] = useState<WSTGCategory[]>([]);
  const [categoryDescriptions, setCategoryDescriptions] = useState<Record<string, string>>({});
  const [testInfoData, setTestInfoData] = useState<Record<string, TestInfoData>>({});
  const [owaspTop10, setOwaspTop10] = useState<Record<string, OwaspTop10Item>>({});
  const [contentError, setContentError] = useState(false);
  const [status, setStatus] = useState<Record<string, TestStatus>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [file, setFile] = useState<OpenFile>({ name: '', path: null });
  // Forma canonica dell'ultimo stato salvato/caricato; null finché il caricamento iniziale non è finito
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);

  // Contenuti della checklist (dipendono dalla lingua). Non tocca stati e note.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [checklist, catDesc, info, owasp] = await Promise.all(
          ['checklist', 'category_descriptions', 'checklist_info_data', 'owasp_top_10'].map(async (name) => {
            const res = await fetch(`./json/${language}/${name}.json`);
            if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
            return res.json();
          }),
        );
        // Un cambio lingua rapido non deve farsi sovrascrivere da una risposta arrivata in ritardo
        if (cancelled) return;
        const entries = Object.entries(checklist.categories as Record<string, { id: string; tests: WSTGTest[] }>);
        setCategories(entries.map(([name, data]) => ({ id: data.id, name, tests: data.tests })));
        setCategoryDescriptions(catDesc);
        setTestInfoData(info);
        setOwaspTop10(owasp);
        setContentError(false);
      } catch {
        if (!cancelled) setContentError(true);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [language]);

  const applyProgress = useCallback((data: ProgressData, name: string, path: string | null) => {
    setStatus(data.status);
    setNotes(data.notes);
    setFile({ name, path });
    setSavedSnapshot(canonicalProgress(data));
  }, []);

  // Stati e note: all'avvio riapre l'ultimo file usato, altrimenti il progress.json incluso nell'app
  useEffect(() => {
    const loadInitial = async () => {
      if (window.electron) {
        try {
          const last = await window.electron.getLastSaveFile();
          if (last.success && last.filePath) {
            const res = await window.electron.loadFile(last.filePath);
            if (res.success) {
              applyProgress(normalizeProgress(res.data), last.filename || fileName(last.filePath), last.filePath);
              return;
            }
          }
        } catch {
          // ultimo file non leggibile: si riparte dal progress.json incluso
        }
      }
      try {
        const res = await fetch('./json/progress.json');
        if (res.ok) {
          applyProgress(normalizeProgress(await res.json()), 'progress.json', null);
          return;
        }
      } catch {
        // nessun avanzamento iniziale
      }
      applyProgress({ status: {}, notes: {} }, '', null);
    };
    loadInitial();
  }, [applyProgress]);

  const snapshot = useMemo(() => canonicalProgress({ status, notes }), [status, notes]);
  const isDirty = savedSnapshot !== null && snapshot !== savedSnapshot;

  const markSaved = useCallback((data: ProgressData, filePath: string | null, name?: string) => {
    setFile({ name: name || (filePath ? fileName(filePath) : ''), path: filePath });
    setSavedSnapshot(canonicalProgress(data));
  }, []);

  const getStatus = useCallback((testId: string): TestStatus => status[testId] || 'pending', [status]);

  const setTestStatus = useCallback((testId: string, newStatus: TestStatus) => {
    setStatus((prev) => ({ ...prev, [testId]: newStatus }));
  }, []);

  const cycleStatus = useCallback((testId: string) => {
    setStatus((prev) => {
      const current = prev[testId] || 'pending';
      const next: TestStatus = current === 'pending' ? 'in-progress' : current === 'in-progress' ? 'done' : 'pending';
      return { ...prev, [testId]: next };
    });
  }, []);

  const setMultipleStatus = useCallback((testIds: string[], newStatus: TestStatus) => {
    setStatus((prev) => {
      const updated = { ...prev };
      testIds.forEach((id) => {
        updated[id] = newStatus;
      });
      return updated;
    });
  }, []);

  const toggleCategory = useCallback((catId: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }, []);

  const expandCategory = useCallback((catId: string) => {
    setCollapsedCategories((prev) => {
      if (!prev.has(catId)) return prev;
      const next = new Set(prev);
      next.delete(catId);
      return next;
    });
  }, []);

  const isCategoryCollapsed = useCallback((catId: string) => collapsedCategories.has(catId), [collapsedCategories]);

  const collapseAll = useCallback(() => {
    setCollapsedCategories(new Set(categories.map((c) => c.id)));
  }, [categories]);

  const expandAll = useCallback(() => {
    setCollapsedCategories(new Set());
  }, []);

  const setNote = useCallback((testId: string, html: string) => {
    setNotes((prev) => {
      if (isEmptyNote(html)) {
        if (!(testId in prev)) return prev;
        const rest = { ...prev };
        delete rest[testId];
        return rest;
      }
      return prev[testId] === html ? prev : { ...prev, [testId]: html };
    });
  }, []);

  const getNote = useCallback((testId: string) => notes[testId] || '', [notes]);
  const hasNote = useCallback((testId: string) => !isEmptyNote(notes[testId]), [notes]);

  const exportState = useCallback((): ProgressData => ({ status, notes }), [status, notes]);

  return {
    categories, categoryDescriptions, testInfoData, owaspTop10, contentError,
    getStatus, setTestStatus, cycleStatus, setMultipleStatus,
    toggleCategory, expandCategory, isCategoryCollapsed, collapseAll, expandAll,
    getNote, setNote, hasNote, exportState, applyProgress, markSaved,
    file, isDirty,
  };
};
