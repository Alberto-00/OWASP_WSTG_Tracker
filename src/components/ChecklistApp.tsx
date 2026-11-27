import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle, ChevronDown, ChevronsDownUp, ChevronsUpDown, FileText, FolderOpen, Globe, RefreshCw, Save, Search, Shield, Sparkles, X } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useChecklist } from '@/hooks/useChecklist';
import { useMessageModal } from '@/hooks/useMessageModal';
import { MessageModal } from '@/components/MessageModal';
import { TestList } from '@/components/TestList';
import { CollapsedPart, DetailTab, TestDetail, Top10Ref } from '@/components/TestDetail';
import { Top10Dialog } from '@/components/Top10Dialog';
import { STATUSES, StatusIcon, statusLabelKey } from '@/components/status';
import { ProgressData, TestStatus, WSTGCategory, WSTGTest } from '@/types/checklist';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuShortcut, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { TOP10_BY_TEST, top10Code } from '@/lib/top10Mapping';
import { normalizeProgress } from '@/lib/progress';
import { cn } from '@/lib/utils';

// Gradiente della barra di avanzamento: dal rosso al verde
const progressGradient = (percent: number) =>
  percent < 33
    ? 'bg-gradient-to-r from-red-600 via-red-500 to-orange-500'
    : percent < 66
      ? 'bg-gradient-to-r from-orange-500 via-yellow-500 to-yellow-400'
      : 'bg-gradient-to-r from-yellow-400 via-green-500 to-green-600';

const legendColor: Record<TestStatus, string> = {
  pending: 'bg-[hsl(var(--status-pending))]',
  'in-progress': 'bg-[hsl(var(--status-progress))]',
  done: 'bg-[hsl(var(--status-done))]',
};

const today = () => new Date().toISOString().slice(0, 10);
// Testi WSTG dell'app: commit d69a4842 del 5 gennaio 2026, successivo all'ultima release ufficiale (v4.2).
// Il tasto "Aggiornamenti WSTG" segnala solo una release ufficiale diversa (es. v5.0).
const WSTG_RELEASE = 'v4.2';
const WSTG_TEXTS_DATE = '2026-01-05';
const baseName = (filePath: string) => filePath.split(/[\\/]/).pop() || filePath;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const ChecklistApp = () => {
  const { language, setLanguage, t } = useLanguage();
  const {
    categories, categoryDescriptions, testInfoData, owaspTop10, contentError,
    getStatus, setTestStatus, cycleStatus, setMultipleStatus,
    toggleCategory, expandCategory, isCategoryCollapsed, collapseAll, expandAll,
    getNote, setNote, hasNote, exportState, applyProgress, markSaved, file, isDirty,
  } = useChecklist();
  const modal = useMessageModal();
  const { show: showModal, danger: showError } = modal;

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | TestStatus>('all');
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showCategory, setShowCategory] = useState(false);
  const [selection, setSelection] = useState<Set<string>>(() => new Set());
  const [activeTab, setActiveTab] = useState<DetailTab>('summary');
  const [collapsedPart, setCollapsedPart] = useState<CollapsedPart | null>(null);
  const [top10Open, setTop10Open] = useState(false);
  const [wstgBusy, setWstgBusy] = useState<'check' | 'download' | null>(null);
  const [top10Key, setTop10Key] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [scrollTarget, setScrollTarget] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const rangeAnchor = useRef<string | null>(null);

  // Indice id → test e categoria nella lingua corrente: la selezione è per id e sopravvive al cambio lingua
  const testIndex = useMemo(() => {
    const index = new Map<string, { test: WSTGTest; category: WSTGCategory }>();
    categories.forEach((category) => category.tests.forEach((test) => index.set(test.id, { test, category })));
    return index;
  }, [categories]);
  const allTestIds = useMemo(() => [...testIndex.keys()], [testIndex]);

  // Filtri
  const query = searchQuery.trim().toLowerCase();
  const hasFilters = query !== '' || categoryFilter !== 'all' || statusFilter !== 'all';
  const filteredCategories = useMemo(() => {
    const byCategory = categoryFilter === 'all' ? categories : categories.filter((c) => c.id === categoryFilter);
    if (!query && statusFilter === 'all') return byCategory;
    return byCategory
      .map((c) => ({
        ...c,
        tests: c.tests.filter(
          (test) =>
            (statusFilter === 'all' || getStatus(test.id) === statusFilter) &&
            (!query ||
              test.id.toLowerCase().includes(query) ||
              test.name.toLowerCase().includes(query) ||
              test.objectives.some((o) => o.toLowerCase().includes(query))),
        ),
      }))
      .filter((c) => c.tests.length > 0);
  }, [categories, categoryFilter, statusFilter, query, getStatus]);

  // Con ricerca o filtro di stato attivi le categorie si aprono da sole: i risultati non restano nascosti
  const forceExpand = query !== '' || statusFilter !== 'all';
  const isCollapsed = useCallback((catId: string) => !forceExpand && isCategoryCollapsed(catId), [forceExpand, isCategoryCollapsed]);
  const visibleIds = useMemo(
    () => filteredCategories.flatMap((c) => (isCollapsed(c.id) ? [] : c.tests.map((test) => test.id))),
    [filteredCategories, isCollapsed],
  );

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setCategoryFilter('all');
    setStatusFilter('all');
  }, []);

  const counts = useMemo(() => {
    const result: Record<TestStatus, number> = { pending: 0, 'in-progress': 0, done: 0 };
    allTestIds.forEach((id) => {
      result[getStatus(id)]++;
    });
    return result;
  }, [allTestIds, getStatus]);
  const totalTests = allTestIds.length;
  const percentage = totalTests > 0 ? (counts.done / totalTests) * 100 : 0;

  // Selezione: clic = singolo, Ctrl+clic = aggiunge/toglie, Maiusc+clic = intervallo visibile
  const selectTest = useCallback(
    (id: string, mode?: 'toggle' | 'range') => {
      if (mode === 'toggle') {
        setSelection((prev) => {
          const next = new Set(prev);
          if (next.size === 0 && selectedTestId && selectedTestId !== id) next.add(selectedTestId);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
        rangeAnchor.current = id;
      } else if (mode === 'range') {
        const from = visibleIds.indexOf(rangeAnchor.current ?? selectedTestId ?? id);
        const to = visibleIds.indexOf(id);
        setSelection(from < 0 || to < 0 ? new Set() : new Set(visibleIds.slice(Math.min(from, to), Math.max(from, to) + 1)));
      } else {
        setSelection(new Set());
        rangeAnchor.current = id;
      }
      setSelectedTestId(id);
      setShowCategory(false);
    },
    [selectedTestId, visibleIds],
  );

  const onCategoryClick = useCallback(
    (cat: WSTGCategory, toggle = true) => {
      // Dal pulsante "i" solo la descrizione: la fase resta com'è e il riquadro sopra si riapre se compresso
      if (toggle) toggleCategory(cat.id);
      else setCollapsedPart((c) => (c === 'info' ? null : c));
      setSelectedCategoryId(cat.id);
      setShowCategory(true);
      setSelectedTestId(null);
      setSelection(new Set());
    },
    [toggleCategory],
  );

  const setStatusFor = useCallback(
    (ids: string[], status: TestStatus) => {
      setMultipleStatus(ids, status);
      setSelection(new Set());
    },
    [setMultipleStatus],
  );

  // Porta a un test (link interni, mappatura Top 10): toglie i filtri che lo nascondono e apre la categoria
  const goToTest = useCallback(
    (id: string) => {
      const entry = testIndex.get(id);
      if (!entry) return;
      setTop10Open(false);
      if (!filteredCategories.some((c) => c.tests.some((test) => test.id === id))) clearFilters();
      expandCategory(entry.category.id);
      setSelection(new Set());
      setSelectedTestId(id);
      setShowCategory(false);
      rangeAnchor.current = id;
      setScrollTarget(id);
    },
    [testIndex, filteredCategories, clearFilters, expandCategory],
  );

  useEffect(() => {
    if (!scrollTarget) return;
    const row = document.querySelector<HTMLElement>(`[data-test-id="${scrollTarget}"]`);
    row?.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
    row?.querySelector<HTMLElement>('[data-row]')?.focus({ preventScroll: true });
    setScrollTarget(null);
  }, [scrollTarget]);

  // Dettaglio
  const selected = selectedTestId ? testIndex.get(selectedTestId) ?? null : null;
  const shownCategory = showCategory ? categories.find((c) => c.id === selectedCategoryId) ?? null : selected?.category ?? null;

  const top10Refs = useMemo(() => {
    const refs: Record<string, Top10Ref> = {};
    Object.keys(owaspTop10).forEach((key) => {
      const code = top10Code(key);
      refs[code] = { key, code, title: key.split(' - ')[1] ?? key };
    });
    return refs;
  }, [owaspTop10]);

  const detailTop10 = useMemo(() => {
    if (showCategory && shownCategory) {
      // Categoria: unione delle categorie Top 10 dei suoi test, dalla più frequente
      const frequency = new Map<string, number>();
      shownCategory.tests.forEach((test) => (TOP10_BY_TEST[test.id] ?? []).forEach((code) => frequency.set(code, (frequency.get(code) ?? 0) + 1)));
      return [...frequency.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([code]) => top10Refs[code])
        .filter(Boolean);
    }
    return selected ? (TOP10_BY_TEST[selected.test.id] ?? []).map((code) => top10Refs[code]).filter(Boolean) : [];
  }, [showCategory, shownCategory, selected, top10Refs]);

  const categoryStats =
    showCategory && shownCategory
      ? {
          done: shownCategory.tests.filter((test) => getStatus(test.id) === 'done').length,
          busy: shownCategory.tests.filter((test) => getStatus(test.id) === 'in-progress').length,
          total: shownCategory.tests.length,
        }
      : null;

  const openTop10 = useCallback((key?: string) => {
    if (key) setTop10Key(key);
    setTop10Open(true);
  }, []);

  // Aggiornamenti WSTG: solo release ufficiali, scaricate in saves/wstg-<versione> per integrarle in seguito
  const longDate = useCallback((iso: string) => new Date(iso).toLocaleDateString(language, { day: 'numeric', month: 'long', year: 'numeric' }), [language]);

  const downloadWstg = useCallback(
    async (tag: string) => {
      setWstgBusy('download');
      const res = await window.electron!.wstgDownloadRelease(tag);
      setWstgBusy(null);
      if (!res.success || !res.dir) {
        showError(t('wstgDownloadErrorTitle'), t('wstgErrorMsg', { error: res.error ?? '' }));
        return;
      }
      const dir = res.dir;
      showModal({
        type: 'success',
        title: t('wstgDownloadedTitle', { tag }),
        message: t('wstgDownloadedMsg', { count: res.count ?? 0, dir }),
        confirmText: t('openFolder'),
        cancelText: t('close'),
        showCancel: true,
        onConfirm: () => window.electron?.openFolder(dir),
      });
    },
    [showError, showModal, t],
  );

  const checkWstg = useCallback(async () => {
    setWstgBusy('check');
    const res = await window.electron!.wstgLatestRelease();
    setWstgBusy(null);
    const tag = res.tag;
    if (!res.success || !tag) {
      showError(t('wstgErrorTitle'), t('wstgErrorMsg', { error: res.error ?? '' }));
      return;
    }
    const date = res.date ? longDate(res.date) : '';
    if (tag === WSTG_RELEASE) {
      showModal({ type: 'success', title: t('wstgUpToDateTitle'), message: t('wstgUpToDateMsg', { tag, date, base: longDate(WSTG_TEXTS_DATE) }) });
      return;
    }
    showModal({
      type: 'info',
      title: t('wstgNewTitle', { tag }),
      message: t('wstgNewMsg', { tag, date }),
      confirmText: t('download'),
      showCancel: true,
      onConfirm: () => downloadWstg(tag),
    });
  }, [downloadWstg, longDate, showError, showModal, t]);

  // Salvataggio: Salva sovrascrive il file aperto; senza file dell'utente si comporta come Salva con nome
  const finishSave = useCallback(
    (data: ProgressData, path: string | null, name?: string) => {
      markSaved(data, path, name);
      setSavedAt(new Date());
    },
    [markSaved],
  );

  const writeFile = useCallback(
    async (filePath: string) => {
      const data = exportState();
      const result = await window.electron!.saveFile(filePath, data);
      if (!result.success) {
        showError(t('saveErrorTitle'), t('saveErrorMsg', { error: result.error ?? '' }));
        return false;
      }
      finishSave(data, result.path ?? filePath, result.filename);
      return true;
    },
    [exportState, finishSave, showError, t],
  );

  // Browser (sviluppo web): download del file
  const download = useCallback(() => {
    const data = exportState();
    const name = file.name && file.name !== 'progress.json' ? file.name : `wstg-progress-${today()}.json`;
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
    finishSave(data, null, name);
    return true;
  }, [exportState, file.name, finishSave]);

  const saveAs = useCallback(async () => {
    if (!window.electron) return download();
    const dialog = await window.electron.showSaveDialog(file.path ?? `wstg-progress-${today()}.json`);
    if (!dialog.success || !dialog.filePath) return false;
    return writeFile(dialog.filePath);
  }, [download, file.path, writeFile]);

  const save = useCallback(
    async () => (window.electron && file.path ? writeFile(file.path) : saveAs()),
    [file.path, saveAs, writeFile],
  );

  const loadInto = useCallback(
    (raw: unknown, name: string, path: string | null) => {
      try {
        applyProgress(normalizeProgress(raw), name, path);
        setSavedAt(null);
        setSelection(new Set());
      } catch {
        showError(t('openErrorTitle'), t('openErrorMsg'));
      }
    },
    [applyProgress, showError, t],
  );

  const openFile = useCallback(async () => {
    if (window.electron) {
      const dialog = await window.electron.showOpenDialog();
      if (!dialog.success || !dialog.filePath) return;
      const result = await window.electron.loadFile(dialog.filePath);
      if (!result.success) {
        showError(t('openErrorTitle'), t('openErrorMsg'));
        return;
      }
      loadInto(result.data, baseName(dialog.filePath), result.filePath ?? dialog.filePath);
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = () => {
      const picked = input.files?.[0];
      if (!picked) return;
      picked.text().then((text) => {
        try {
          loadInto(JSON.parse(text), picked.name, null);
        } catch {
          showError(t('openErrorTitle'), t('openErrorMsg'));
        }
      });
    };
    input.click();
  }, [loadInto, showError, t]);

  // Aprire un altro file con modifiche in sospeso: prima chiede se salvarle
  const requestOpen = useCallback(() => {
    if (!isDirty) {
      openFile();
      return;
    }
    showModal({
      type: 'warning',
      title: t('unsavedTitle'),
      message: t('unsavedOpenMsg'),
      confirmText: t('saveNow'),
      cancelText: t('dontSave'),
      showCancel: true,
      onConfirm: async () => {
        if (await save()) openFile();
      },
      onCancel: openFile,
    });
  }, [isDirty, openFile, save, showModal, t]);

  // Chiusura della finestra con modifiche non salvate (richiesta dal processo Electron)
  const onCloseRequest = useCallback(() => {
    showModal({
      type: 'warning',
      title: t('unsavedTitle'),
      message: t('unsavedExitMsg'),
      confirmText: t('saveNow'),
      cancelText: t('dontSave'),
      showCancel: true,
      onConfirm: async () => {
        if (await save()) window.electron?.forceQuit();
      },
      onCancel: () =>
        showModal({
          type: 'danger',
          title: t('confirmExitTitle'),
          message: t('confirmExitMsg'),
          confirmText: t('quitWithoutSaving'),
          cancelText: t('cancel'),
          showCancel: true,
          onConfirm: () => window.electron?.quitWithoutSaving(),
        }),
    });
  }, [save, showModal, t]);

  useEffect(() => window.electron?.onShowUnsavedChangesDialog(onCloseRequest), [onCloseRequest]);

  useEffect(() => {
    window.electron?.setUnsavedChanges(isDirty);
  }, [isDirty]);

  useEffect(() => {
    document.title = `${isDirty ? '● ' : ''}${file.name || t('noFile')} — OWASP WSTG Tracker`;
  }, [isDirty, file.name, t]);

  // Scorciatoie: Ctrl+S salva, Ctrl+Maiusc+S salva con nome, Ctrl+O apre, Ctrl+F cerca
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === 's') {
        e.preventDefault();
        if (e.repeat) return;
        if (e.shiftKey) saveAs();
        else save();
      } else if (key === 'o' && !e.shiftKey) {
        e.preventDefault();
        if (!e.repeat) requestOpen();
      } else if (key === 'f' && !e.shiftKey) {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [save, saveAs, requestOpen]);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <header className="flex-shrink-0 bg-gradient-to-b from-card/95 to-card/80 backdrop-blur-xl border-b border-border/60 shadow-lg">
        {/* Avanzamento e file aperto */}
        <div className="px-4 py-1.5 flex items-center gap-4">
          <div className="h-7 w-7 flex items-center justify-center rounded-lg bg-primary/10 border border-primary/20 flex-shrink-0" title="OWASP WSTG Tracker">
            <Shield className="w-4 h-4 text-primary" />
          </div>

          <div className="flex-1 flex items-center gap-3 min-w-0">
            <div
              role="progressbar"
              aria-label={t('overallProgress')}
              aria-valuemin={0}
              aria-valuemax={totalTests}
              aria-valuenow={counts.done}
              className="flex-1 h-3 bg-secondary/50 rounded-full overflow-hidden shadow-inner border border-border/30"
            >
              <div className={cn('h-full rounded-full transition-all duration-500 shadow-sm', progressGradient(percentage))} style={{ width: `${percentage}%` }} />
            </div>
            <div className="h-7 flex items-center gap-2 bg-secondary/30 px-2.5 rounded-lg border border-border/40 tabular-nums flex-shrink-0">
              <span className="text-sm font-semibold text-foreground">
                {counts.done}/{totalTests}
              </span>
              <span className="text-xs text-muted-foreground">({percentage.toFixed(1)}%)</span>
            </div>
          </div>

          <div className="h-7 flex items-center gap-2 bg-primary/10 px-2.5 rounded-lg border border-primary/20 min-w-0 max-w-[40%]" title={file.path ?? file.name}>
            <FileText className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <span className="text-xs font-medium text-cyan-400 truncate">{file.name || t('noFile')}</span>
            {isDirty ? (
              <span role="status" aria-label={t('unsaved')} title={t('unsaved')} className="flex items-center gap-1.5 text-xs text-amber-400 flex-shrink-0">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-fade-in" />
                <span className="hidden xl:inline">{t('unsaved')}</span>
              </span>
            ) : savedAt ? (
              <span role="status" className="hidden lg:inline text-xs text-muted-foreground flex-shrink-0 animate-fade-in">
                {t('savedAt', { time: savedAt.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' }) })}
              </span>
            ) : null}
          </div>
        </div>

        {/* Filtri e azioni */}
        <div className="px-4 py-2 flex items-center gap-3 border-t border-border/30 bg-card/40">
          <div className="relative flex-1 min-w-[170px] max-w-[320px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary pointer-events-none" />
            <Input
              ref={searchRef}
              placeholder={t('search')}
              title={t('searchHint')}
              aria-label={t('searchHint')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && searchQuery) {
                  e.preventDefault();
                  setSearchQuery('');
                }
              }}
              className="pl-9 pr-8 h-8 text-sm bg-card border-2 border-primary/50 shadow-sm focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-0"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  searchRef.current?.focus();
                }}
                aria-label={t('clearSearch')}
                title={t('clearSearch')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger
              aria-label={t('allCategories')}
              className="w-40 lg:w-52 h-8 text-sm bg-card border-2 border-primary/50 shadow-sm hover:border-primary focus:ring-2 focus:ring-primary/30 focus:ring-offset-0"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allCategories')}</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | TestStatus)}>
            <SelectTrigger
              aria-label={t('allStatuses')}
              className="w-36 lg:w-40 h-8 text-sm bg-card border-2 border-primary/50 shadow-sm hover:border-primary focus:ring-2 focus:ring-primary/30 focus:ring-offset-0"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allStatuses')}</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  <span className="flex items-center gap-2">
                    <StatusIcon status={s} className="w-3.5 h-3.5" />
                    {t(statusLabelKey[s])}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="h-6 w-px bg-border/50 flex-shrink-0" />

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={expandAll} className="h-8 w-8 p-0" title={t('expandAll')} aria-label={t('expandAll')}>
              <ChevronsUpDown className="w-3.5 h-3.5" />
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll} className="h-8 w-8 p-0" title={t('collapseAll')} aria-label={t('collapseAll')}>
              <ChevronsDownUp className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="flex-1" />

          <Button
            variant="outline"
            size="sm"
            onClick={() => openTop10()}
            title={t('mappingHint')}
            className="h-8 gap-1.5 text-sm border-amber-500/50 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500 hover:text-amber-300"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">{t('mapping')}</span>
          </Button>

          <div className="h-6 w-px bg-border/50 flex-shrink-0" />

          <div className="flex">
            <Button
              variant="outline"
              size="sm"
              onClick={() => save()}
              title={t('saveHint')}
              className="h-8 gap-1.5 rounded-r-none text-sm border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500 hover:text-cyan-300"
            >
              <Save className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">{t('save')}</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  title={t('saveAs')}
                  aria-label={t('saveAs')}
                  className="h-8 w-7 p-0 -ml-px rounded-l-none border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500 hover:text-cyan-300"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => saveAs()}>
                  {t('saveAs')}
                  <DropdownMenuShortcut>Ctrl+Shift+S</DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={requestOpen}
            title={t('openHint')}
            className="h-8 gap-1.5 text-sm border-orange-500/50 text-orange-400 hover:bg-orange-500/10 hover:border-orange-500 hover:text-orange-300"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">{t('open')}</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 min-h-0 p-3">
        {contentError ? (
          <div className="h-full flex items-center justify-center p-6">
            <div className="max-w-md text-center space-y-3">
              <AlertTriangle className="w-10 h-10 mx-auto text-amber-400" />
              <p className="text-sm text-muted-foreground">{t('contentError')}</p>
            </div>
          </div>
        ) : (
          <ResizablePanelGroup direction="horizontal" autoSaveId="wstg-tracker-layout" className="h-full">
            <ResizablePanel defaultSize={45} minSize={28} maxSize={62}>
              {categories.length > 0 ? (
                <TestList
                  categories={filteredCategories}
                  visibleIds={visibleIds}
                  getStatus={getStatus}
                  hasNote={hasNote}
                  isCollapsed={isCollapsed}
                  selectedTestId={selectedTestId}
                  selection={selection}
                  hasFilters={hasFilters}
                  onCategoryClick={onCategoryClick}
                  onSelectTest={selectTest}
                  onCycleStatus={cycleStatus}
                  onSetStatus={setStatusFor}
                  onClearSelection={() => setSelection(new Set())}
                  onClearFilters={clearFilters}
                />
              ) : (
                <div className="h-full rounded-lg border border-sidebar-border bg-sidebar" />
              )}
            </ResizablePanel>
            <ResizableHandle className="mx-1.5 w-1 rounded-full bg-border/30 transition-colors hover:bg-primary/50 data-[resize-handle-state=drag]:bg-primary/70" />
            <ResizablePanel defaultSize={55} minSize={38}>
              <TestDetail
                test={selected?.test ?? null}
                category={shownCategory}
                showCategory={showCategory}
                info={selected ? testInfoData[selected.test.id] ?? null : null}
                categoryDescription={shownCategory ? categoryDescriptions[shownCategory.name] ?? '' : ''}
                categoryStats={categoryStats}
                status={selected ? getStatus(selected.test.id) : 'pending'}
                onSetStatus={(status) => selected && setTestStatus(selected.test.id, status)}
                top10={detailTop10}
                onOpenTop10={openTop10}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                note={selected ? getNote(selected.test.id) : ''}
                hasNote={selected ? hasNote(selected.test.id) : false}
                onNoteChange={(html) => selected && setNote(selected.test.id, html)}
                collapsed={collapsedPart}
                onToggleCollapsed={(part) => setCollapsedPart((c) => (c === part ? null : part))}
                onNavigateTest={goToTest}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </main>

      <footer className="flex-shrink-0 border-t border-border px-4 py-1 flex items-center justify-between gap-4 bg-card/50">
        {/* Legenda: un clic filtra per quello stato */}
        <div className="flex items-center gap-2 text-xs tabular-nums">
          {STATUSES.map((s) => (
            <button
              key={s}
              aria-pressed={statusFilter === s}
              onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
              className={cn('focus-ring flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:bg-secondary/60', statusFilter === s && 'bg-secondary')}
            >
              <span className={cn('w-2.5 h-2.5 rounded-sm', legendColor[s])} />
              {t(statusLabelKey[s])}: {counts[s]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {window.electron && (
            <button
              onClick={checkWstg}
              disabled={wstgBusy !== null}
              title={t('wstgUpdatesHint')}
              className="focus-ring flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-70"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', wstgBusy && 'animate-spin')} />
              {wstgBusy === 'download' ? t('wstgDownloading') : wstgBusy ? t('wstgChecking') : t('wstgUpdates')}
            </button>
          )}
          <div role="radiogroup" aria-label={t('language')} className="flex items-center gap-0.5 rounded-lg border border-primary/30 bg-gradient-to-r from-primary/10 to-accent/10 p-0.5">
            <Globe className="w-4 h-4 mx-1.5 text-primary" aria-hidden />
            {(['it', 'en'] as const).map((lang) => (
              <button
                key={lang}
                role="radio"
                aria-checked={language === lang}
                onClick={() => setLanguage(lang)}
                className={cn(
                  'focus-ring rounded-md px-2.5 py-0.5 text-xs font-semibold transition-colors',
                  language === lang ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {lang === 'it' ? 'Italiano' : 'English'}
              </button>
            ))}
          </div>
        </div>
      </footer>

      <Top10Dialog
        open={top10Open}
        onOpenChange={setTop10Open}
        entries={owaspTop10}
        selectedKey={top10Key}
        onSelect={setTop10Key}
        categories={categories}
        getStatus={getStatus}
        onGoToTest={goToTest}
      />

      <MessageModal isOpen={modal.isOpen} config={modal.config} onClose={modal.hide} />
    </div>
  );
};
