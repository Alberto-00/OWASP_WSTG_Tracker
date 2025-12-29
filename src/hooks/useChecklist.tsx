import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from './useLanguage';
import { WSTGCategory, WSTGTest, TestStatus, TestInfoData, OwaspTop10Item, ProgressData } from '@/types/checklist';

export const useChecklist = () => {
  const { language } = useLanguage();
  const [categories, setCategories] = useState<WSTGCategory[]>([]);
  const [categoryDescriptions, setCategoryDescriptions] = useState<Record<string, string>>({});
  const [testInfoData, setTestInfoData] = useState<Record<string, TestInfoData>>({});
  const [owaspTop10, setOwaspTop10] = useState<Record<string, OwaspTop10Item>>({});
  const [status, setStatus] = useState<Record<string, TestStatus>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [loadedFileName, setLoadedFileName] = useState<string>('progress.json');
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);

  // Caricamento automatico all'avvio
  useEffect(() => {
    const loadData = async () => {
      try {
        const [checklistRes, catDescRes, infoRes, owaspRes] = await Promise.all([
          fetch(`./json/${language}/checklist.json`),
          fetch(`./json/${language}/category_descriptions.json`),
          fetch(`./json/${language}/checklist_info_data.json`),
          fetch(`./json/${language}/owasp_top_10.json`),
        ]);
        const checklist = await checklistRes.json();
        const catDesc = await catDescRes.json();
        const info = await infoRes.json();
        const owasp = await owaspRes.json();

        const cats: WSTGCategory[] = Object.entries(checklist.categories).map(([name, data]: [string, { id: string; tests: WSTGTest[] }]) => ({
          id: data.id,
          name,
          tests: data.tests,
        }));
        setCategories(cats);
        setCategoryDescriptions(catDesc);
        setTestInfoData(info);
        setOwaspTop10(owasp);

        // Carica automaticamente l'ultimo salvataggio o progress.json
        if (window.electron) {
          try {
            // Prima prova a caricare l'ultimo file salvato dalla cartella saves
            const lastSave = await window.electron.getLastSaveFile();
            if (lastSave.success && lastSave.filename) {
              const result = await window.electron.loadFile(lastSave.filename);
              if (result.success && result.data) {
                const progressData = result.data as ProgressData;
                if (progressData.status) setStatus(progressData.status);
                if (progressData.notes) setNotes(progressData.notes);
                setLoadedFileName(lastSave.filename);
                return;
              }
            }
          } catch (e) {
            // Nessun ultimo salvataggio trovato, carico progress.json
          }
        }

        // Se non c'è ultimo salvataggio, carica progress.json dalla cartella json
        try {
          const progressRes = await fetch('./json/progress.json');
          if (progressRes.ok) {
            const progressData = await progressRes.json() as ProgressData;
            if (progressData.status) setStatus(progressData.status);
            if (progressData.notes) setNotes(progressData.notes);
            setLoadedFileName('json/progress.json');
          }
        } catch (e) {
          // progress.json non trovato, inizio con stato vuoto
          setLoadedFileName('(nessun file)');
        }

        // Segnala che il caricamento iniziale è completo
        setIsInitialLoadComplete(true);
      } catch (e) {
        // Failed to load data
        setIsInitialLoadComplete(true); // Anche in caso di errore
      }
    };
    loadData();
  }, [language]);

  const getStatus = useCallback((testId: string): TestStatus => status[testId] || 'pending', [status]);
  
  const setTestStatus = useCallback((testId: string, newStatus: TestStatus) => {
    setStatus(prev => ({ ...prev, [testId]: newStatus }));
  }, []);

  const cycleStatus = useCallback((testId: string) => {
    const current = getStatus(testId);
    const next: TestStatus = current === 'pending' ? 'in-progress' : current === 'in-progress' ? 'done' : 'pending';
    setTestStatus(testId, next);
  }, [getStatus, setTestStatus]);

  const setMultipleStatus = useCallback((testIds: string[], newStatus: TestStatus) => {
    setStatus(prev => {
      const updated = { ...prev };
      testIds.forEach(id => { updated[id] = newStatus; });
      return updated;
    });
  }, []);

  const toggleCategory = useCallback((catId: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }, []);

  const isCategoryCollapsed = useCallback((catId: string) => collapsedCategories.has(catId), [collapsedCategories]);

  const collapseAll = useCallback(() => {
    setCollapsedCategories(new Set(categories.map(c => c.id)));
  }, [categories]);

  const expandAll = useCallback(() => {
    setCollapsedCategories(new Set());
  }, []);

  const getCategoryStatus = useCallback((catId: string): 'done' | 'progress' | 'pending' => {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return 'pending';
    const statuses = cat.tests.map(t => getStatus(t.id));
    if (statuses.every(s => s === 'done')) return 'done';
    if (statuses.some(s => s === 'in-progress' || s === 'done')) return 'progress';
    return 'pending';
  }, [categories, getStatus]);

  const getCompletedCount = useCallback((testIds: string[]) => testIds.filter(id => getStatus(id) === 'done').length, [getStatus]);
  const getInProgressCount = useCallback((testIds: string[]) => testIds.filter(id => getStatus(id) === 'in-progress').length, [getStatus]);

  const setNote = useCallback((testId: string, note: string) => {
    setNotes(prev => ({ ...prev, [testId]: note }));
  }, []);

  const getNote = useCallback((testId: string) => notes[testId] || '', [notes]);

  const exportState = useCallback(() => ({ status, notes }), [status, notes]);

  const importState = useCallback((data: ProgressData, filename?: string) => {
    if (data.status) setStatus(data.status);
    if (data.notes) setNotes(data.notes);
    if (filename) setLoadedFileName(filename);
  }, []);

  return {
    categories, categoryDescriptions, testInfoData, owaspTop10,
    getStatus, setTestStatus, cycleStatus, setMultipleStatus,
    toggleCategory, isCategoryCollapsed, collapseAll, expandAll, getCategoryStatus,
    getCompletedCount, getInProgressCount,
    getNote, setNote, exportState, importState,
    loadedFileName, setLoadedFileName,
    isInitialLoadComplete,
  };
};
