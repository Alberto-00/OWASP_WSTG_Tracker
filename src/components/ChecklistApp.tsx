import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Search, Save, FolderOpen, ChevronRight, Shield, ExternalLink, FileText, Lightbulb, Wrench, ShieldCheck, Sparkles, Target, Globe, StickyNote, Circle, CheckCircle, Clock, ChevronsDownUp, ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useChecklist } from '@/hooks/useChecklist';
import { useMessageModal } from '@/hooks/useMessageModal';
import { MessageModal } from '@/components/MessageModal';
import { WSTGTest, WSTGCategory, TestStatus } from '@/types/checklist';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { cn } from '@/lib/utils';

const owaspMapping: Record<string, string> = {
  'Information Gathering': 'A01, A05, A06',
  'Configuration and Deployment Management Testing': 'A05, A06',
  'Identity Management Testing': 'A07',
  'Authentication Testing': 'A07',
  'Authorization Testing': 'A01',
  'Session Management Testing': 'A07',
  'Input Validation Testing': 'A03, A10',
  'Testing for Error Handling': 'A05',
  'Testing for Weak Cryptography': 'A02, A08',
  'Business Logic Testing': 'A04, A08',
  'Client-side Testing': 'A03, A05',
  'API Testing': 'A01, A03, A05, A06, A10',
};

type DetailTab = 'summary' | 'howto' | 'tools' | 'remediation' | 'notes';

export const ChecklistApp = () => {
  const { language, setLanguage, t } = useLanguage();
  const { categories, categoryDescriptions, testInfoData, owaspTop10, getStatus, cycleStatus, setMultipleStatus, toggleCategory, isCategoryCollapsed, collapseAll, expandAll, getCompletedCount, getInProgressCount, getNote, setNote, exportState, importState, loadedFileName, setLoadedFileName, isInitialLoadComplete } = useChecklist();
  const modal = useMessageModal();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedTest, setSelectedTest] = useState<WSTGTest | null>(null);
  const [selectedCategoryInfo, setSelectedCategoryInfo] = useState<WSTGCategory | null>(null);
  const [showCategoryDescription, setShowCategoryDescription] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>('summary');
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set());
  const [selectedOwaspItem, setSelectedOwaspItem] = useState<string | null>(null);
  const [isTopSectionCollapsed, setIsTopSectionCollapsed] = useState(false);

  // Tracking modifiche non salvate
  const initialStateRef = useRef<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Calcola lo stato corrente come stringa
  const currentStateString = useMemo(() => {
    return JSON.stringify(exportState());
  }, [exportState]);

  // Memorizza lo stato iniziale SOLO dopo che il caricamento iniziale è completo
  useEffect(() => {
    if (isInitialLoadComplete && initialStateRef.current === '') {
      initialStateRef.current = currentStateString;
    }
  }, [isInitialLoadComplete, currentStateString]);

  // Controlla se ci sono modifiche non salvate
  useEffect(() => {
    if (!isInitialLoadComplete || initialStateRef.current === '') return;

    const hasChanges = currentStateString !== initialStateRef.current;
    setHasUnsavedChanges(hasChanges);

    if (window.electron) {
      window.electron.setUnsavedChanges(hasChanges);
    }
  }, [currentStateString, isInitialLoadComplete]);

  // Funzione per salvare con dialog nativo
  const saveWithPrompt = useCallback(async (onSuccess?: () => void) => {
    const defaultFilename = `wstg-progress-${new Date().toISOString().split('T')[0]}.json`;
    const data = exportState();

    if (window.electron) {
      // Mostra dialog di salvataggio nativo
      const dialogResult = await window.electron.showSaveDialog(defaultFilename);

      // Se l'utente ha annullato
      if (dialogResult.canceled || !dialogResult.filePath) {
        return false;
      }

      // Estrai solo il nome del file dal percorso completo
      const filename = dialogResult.filePath.split(/[\\/]/).pop() || defaultFilename;

      // Salva il file
      const result = await window.electron.saveFile(filename, data);
      if (result.success) {
        setLoadedFileName(filename);
        initialStateRef.current = JSON.stringify(data);
        setHasUnsavedChanges(false);
        // Mostra messaggio di successo con percorso
        modal.success('Salvataggio Completato', `File salvato con successo!`);
        if (onSuccess) {
          setTimeout(onSuccess, 2000);
        }
        return true;
      } else {
        modal.danger('Errore', `Impossibile salvare: ${result.error}`);
        return false;
      }
    }
    return false;
  }, [exportState, modal, setLoadedFileName]);

  // Handler per dialog modifiche non salvate
  const handleUnsavedChangesDialog = useCallback(() => {
    modal.show({
      type: 'warning',
      title: 'Modifiche non salvate',
      message: 'Ci sono modifiche non salvate. Vuoi salvare prima di uscire?',
      confirmText: 'Sì, Salva',
      cancelText: 'No',
      showCancel: true,
      closeOnOverlayClick: false,
      onConfirm: async () => {
        // Chiudi il modal per mostrare il prompt
        modal.hide();
        await new Promise(resolve => setTimeout(resolve, 300));

        // Salva con prompt per il nome file
        await saveWithPrompt(() => {
          window.electron?.forceQuit();
        });
      },
      onCancel: () => {
        // Prima chiudi il modal corrente, poi mostra il secondo
        modal.hide();
        setTimeout(() => {
          modal.show({
            type: 'danger',
            title: 'Conferma Uscita',
            message: 'Sei sicuro di voler uscire senza salvare? Tutte le modifiche andranno perse.',
            confirmText: 'Esci senza Salvare',
            cancelText: 'Annulla',
            showCancel: true,
            closeOnOverlayClick: false,
            onConfirm: () => {
              // Esci senza salvare
              if (window.electron) {
                window.electron.quitWithoutSaving();
              }
            }
            // onCancel non definito = chiude il modal e torna all'app
          });
        }, 350); // Delay maggiore per permettere l'animazione di chiusura
      }
    });
  }, [modal, exportState]);

  useEffect(() => {
    if (window.electron) {
      window.electron.onShowUnsavedChangesDialog(handleUnsavedChangesDialog);
    }
  }, [handleUnsavedChangesDialog]);

  const filteredCategories = useMemo(() => {
    let cats = categories;
    if (selectedCategory !== 'all') cats = cats.filter(c => c.id === selectedCategory);

    // Filtra per status
    if (selectedStatus !== 'all') {
      cats = cats.map(c => ({
        ...c,
        tests: c.tests.filter(t => getStatus(t.id) === selectedStatus)
      })).filter(c => c.tests.length > 0);
    }

    // Filtra per ricerca
    if (!searchQuery.trim()) return cats;
    const q = searchQuery.toLowerCase();
    return cats.map(c => ({ ...c, tests: c.tests.filter(t => t.id.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)) })).filter(c => c.tests.length > 0);
  }, [categories, selectedCategory, selectedStatus, searchQuery, getStatus]);

  const allTestIds = useMemo(() => categories.flatMap(c => c.tests.map(t => t.id)), [categories]);
  const totalCompleted = getCompletedCount(allTestIds);
  const totalTests = allTestIds.length;
  const percentage = totalTests > 0 ? (totalCompleted / totalTests) * 100 : 0;

  // Calcola il gradiente della progress bar da rosso a verde
  const getProgressBarGradient = (percent: number) => {
    if (percent < 33) {
      return 'bg-gradient-to-r from-red-600 via-red-500 to-orange-500';
    } else if (percent < 66) {
      return 'bg-gradient-to-r from-orange-500 via-yellow-500 to-yellow-400';
    } else {
      return 'bg-gradient-to-r from-yellow-400 via-green-500 to-green-600';
    }
  };

  const handleTestClick = (test: WSTGTest, cat: WSTGCategory, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      setSelectedTests(prev => {
        const n = new Set(prev);
        if (selectedTest && !prev.has(selectedTest.id)) n.add(selectedTest.id);
        if (n.has(test.id)) {
          n.delete(test.id);
        } else {
          n.add(test.id);
        }
        return n;
      });
      setSelectedTest(test);
    } else if (e.shiftKey && selectedTest) {
      const allTests = categories.flatMap(c => c.tests);
      const startIdx = allTests.findIndex(t => t.id === selectedTest.id);
      const endIdx = allTests.findIndex(t => t.id === test.id);
      const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
      setSelectedTests(new Set(allTests.slice(from, to + 1).map(t => t.id)));
      setSelectedTest(test);
    } else {
      setSelectedTests(new Set());
      setSelectedTest(test);
      setSelectedCategoryInfo(cat);
      setShowCategoryDescription(false);
    }
  };

  const handleCategoryClick = (cat: WSTGCategory) => {
    toggleCategory(cat.id);
    setSelectedCategoryInfo(cat);
    setSelectedTest(null);
    setShowCategoryDescription(true);
  };

  const handleSave = async () => {
    if (window.electron) {
      // Salvataggio tramite Electron con prompt per il nome
      await saveWithPrompt();
    } else {
      // Fallback browser: download tradizionale
      const data = exportState();
      const filename = `wstg-progress-${new Date().toISOString().split('T')[0]}.json`;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      // Resetta il tracking modifiche
      initialStateRef.current = JSON.stringify(data);
      setHasUnsavedChanges(false);
      setLoadedFileName(filename);
      modal.success('Salvataggio Completato', 'Lo stato è stato salvato con successo!');
    }
  };

  const handleLoad = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const loadedData = JSON.parse(ev.target?.result as string);
            importState(loadedData, file.name);
            // Resetta il tracking modifiche dopo caricamento riuscito
            initialStateRef.current = JSON.stringify(loadedData);
            setHasUnsavedChanges(false);
            modal.success('Caricamento Completato', `File "${file.name}" caricato con successo!`);
          }
          catch {
            modal.danger('Errore di Caricamento', 'Il file selezionato non è valido o è corrotto.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const getStatusIcon = (status: TestStatus) => {
    if (status === 'done') return <CheckCircle className="w-4 h-4 text-[hsl(var(--status-done))]" />;
    if (status === 'in-progress') return <Clock className="w-4 h-4 text-[hsl(var(--status-progress))]" />;
    return <Circle className="w-4 h-4 text-[hsl(var(--status-pending))]" />;
  };

  const getStatusColor = (status: TestStatus) => status === 'done' ? 'text-done' : status === 'in-progress' ? 'text-progress' : 'text-foreground';

  const getCatStatusColor = (catId: string) => {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return 'text-pending';
    const statuses = cat.tests.map(t => getStatus(t.id));
    const hasInProgress = statuses.some(s => s === 'in-progress');
    const hasDone = statuses.some(s => s === 'done');

    if (hasInProgress) return 'text-progress'; // Viola se c'è almeno un in-progress
    if (hasDone) return 'text-done'; // Verde se c'è almeno un completato (senza in-progress)
    return 'text-pending'; // Default pending
  };

  const getCatBgColor = (catId: string) => {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return 'bg-pending';
    const statuses = cat.tests.map(t => getStatus(t.id));
    const hasInProgress = statuses.some(s => s === 'in-progress');
    const hasDone = statuses.some(s => s === 'done');

    if (hasInProgress) return 'bg-progress';
    if (hasDone) return 'bg-done';
    return 'bg-pending';
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'critico': return 'hsl(var(--level-critical))';
      case 'alto': return 'hsl(var(--level-high))';
      case 'medio': return 'hsl(var(--level-medium))';
      case 'basso': return 'hsl(var(--level-low))';
      default: return 'hsl(var(--cyan))';
    }
  };

  const tabs = [
    { id: 'summary' as const, label: t('summary'), icon: FileText, color: 'bg-cyan-600 hover:bg-cyan-700' },
    { id: 'howto' as const, label: t('howTo'), icon: Lightbulb, color: 'bg-amber-600 hover:bg-amber-700' },
    { id: 'tools' as const, label: t('tools'), icon: Wrench, color: 'bg-purple-600 hover:bg-purple-700' },
    { id: 'remediation' as const, label: t('remediation'), icon: ShieldCheck, color: 'bg-emerald-600 hover:bg-emerald-700' },
    { id: 'notes' as const, label: t('notes'), icon: StickyNote, color: 'bg-pink-600 hover:bg-pink-700' },
  ];

  const testInfo = selectedTest ? testInfoData[selectedTest.id] : null;
  const selectedOwaspData = selectedOwaspItem ? owaspTop10[selectedOwaspItem] : null;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 bg-gradient-to-b from-card/95 to-card/80 backdrop-blur-xl border-b border-border/60 shadow-lg">
        {/* Top Section: Title & Progress */}
        <div className="px-4 py-2 flex items-center gap-6">
          {/* Logo Only */}
          <div className="flex items-center">
            <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
              <Shield className="w-5 h-5 text-primary" />
            </div>
          </div>

          {/* Progress Bar Section */}
          <div className="flex-1 flex items-center gap-4 min-w-0">
            <div className="flex-1 h-3 bg-secondary/50 rounded-full overflow-hidden shadow-inner border border-border/30">
              <div className={cn("h-full rounded-full transition-all duration-500 shadow-sm", getProgressBarGradient(percentage))} style={{ width: `${percentage}%` }} />
            </div>
            <div className="flex items-center gap-2 bg-secondary/30 px-3 py-1.5 rounded-lg border border-border/40">
              <span className="text-sm font-semibold text-foreground">{totalCompleted}/{totalTests}</span>
              <span className="text-xs text-muted-foreground">({percentage.toFixed(1)}%)</span>
            </div>
          </div>

          {/* Currently Loaded File Indicator */}
          <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20">
            <FileText className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-muted-foreground">File:</span>
            <span className="text-xs font-medium text-cyan-400 max-w-[200px] truncate" title={loadedFileName}>
              {loadedFileName}
            </span>
          </div>
        </div>

        {/* Bottom Section: Controls */}
        <div className="px-4 py-2 flex items-center gap-3 border-t border-border/30 bg-card/40">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
            <Input
              placeholder={t('search')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm bg-card border-2 border-primary/50 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48 h-9 text-sm bg-card border-2 border-primary/50 shadow-sm hover:border-primary focus:ring-2 focus:ring-primary/30">
              <SelectValue placeholder={t('allCategories')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allCategories')}</SelectItem>
              {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-40 h-9 text-sm bg-card border-2 border-primary/50 shadow-sm hover:border-primary focus:ring-2 focus:ring-primary/30">
              <SelectValue placeholder="Tutti gli stati" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli stati</SelectItem>
              <SelectItem value="pending">
                <div className="flex items-center gap-2">
                  <Circle className="w-3.5 h-3.5 text-[hsl(var(--status-pending))]" />
                  <span>Da fare</span>
                </div>
              </SelectItem>
              <SelectItem value="in-progress">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-[hsl(var(--status-progress))]" />
                  <span>In corso</span>
                </div>
              </SelectItem>
              <SelectItem value="done">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-[hsl(var(--status-done))]" />
                  <span>Completato</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          {/* Separatore visivo */}
          <div className="h-6 w-px bg-border/50" />

          {/* View Controls */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={expandAll} className="h-8 w-8 p-0" title="Espandi tutte le fasi">
              <ChevronsUpDown className="w-3.5 h-3.5" />
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll} className="h-8 w-8 p-0" title="Collassa tutte le fasi">
              <ChevronsDownUp className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="flex-1" />

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setShowMappingModal(true)} className="h-8 gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-sm shadow-md">
              <Sparkles className="w-3.5 h-3.5" />{t('mapping')}
            </Button>
            <div className="h-6 w-px bg-border/50" />
            <Button variant="outline" size="sm" onClick={handleSave} className="h-8 gap-1.5 text-sm border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500">
              <Save className="w-3.5 h-3.5" />{t('saveState')}
            </Button>
            <Button variant="outline" size="sm" onClick={handleLoad} className="h-8 gap-1.5 text-sm border-orange-500/50 text-orange-400 hover:bg-orange-500/10 hover:border-orange-500">
              <FolderOpen className="w-3.5 h-3.5" />{t('loadState')}
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 overflow-hidden mx-1 my-2 bg-background/40 rounded-xl p-3">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left Panel */}
          <ResizablePanel defaultSize={48} minSize={40} maxSize={48}>
            <aside className="h-full flex flex-col bg-sidebar-background rounded-lg border border-sidebar-border overflow-hidden shadow-lg">
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-5">
                  {filteredCategories.map((cat, ci) => {
                    const collapsed = isCategoryCollapsed(cat.id);
                    return (
                      <div key={cat.id} className="animate-fade-in" style={{ animationDelay: `${ci * 30}ms` }}>
                        <button onClick={() => handleCategoryClick(cat)} className={cn('w-full flex items-center gap-2 p-2.5 rounded-lg transition-all', getCatBgColor(cat.id), 'hover:opacity-90')}>
                          <ChevronRight className={cn('w-4 h-4 flex-shrink-0 transition-transform', getCatStatusColor(cat.id), !collapsed && 'rotate-90')} />
                          <span className={cn('flex-1 text-left font-semibold text-sm', getCatStatusColor(cat.id))}>{cat.name}</span>
                          <span className={cn('text-sm font-medium flex-shrink-0', getCatStatusColor(cat.id))}>{getCompletedCount(cat.tests.map(t => t.id))}/{cat.tests.length}</span>
                        </button>
                        {!collapsed && (
                          <div className="mt-1 space-y-0.5 animate-fade-in">
                            {cat.tests.map((test, ti) => {
                              const status = getStatus(test.id);
                              const isSelected = selectedTest?.id === test.id || selectedTests.has(test.id);
                              return (
                                <ContextMenu key={test.id}>
                                  <ContextMenuTrigger asChild>
                                    <button
                                      onClick={(e) => handleTestClick(test, cat, e)}
                                      onContextMenu={(e) => {
                                        if (!selectedTests.has(test.id) && selectedTest?.id !== test.id) {
                                          setSelectedTest(test);
                                        }
                                      }}
                                      className={cn('w-full flex items-center gap-2 px-2.5 py-2 rounded-md transition-all text-left animate-fade-in', isSelected ? 'bg-primary/20 border-l-2 border-primary' : 'hover:bg-secondary/50 border-l-2 border-transparent')}
                                      style={{ animationDelay: `${(ci * 30) + (ti * 15)}ms` }}
                                    >
                                      <span onClick={(e) => { e.stopPropagation(); cycleStatus(test.id); }} className="flex-shrink-0 cursor-pointer">
                                        {getStatusIcon(status)}
                                      </span>
                                      <span className={cn('flex-1 text-[13px]', getStatusColor(status))}>{test.id} - {test.name}</span>
                                    </button>
                                  </ContextMenuTrigger>
                                  <ContextMenuContent>
                                    <ContextMenuItem onClick={() => {
                                      const targets = selectedTests.size > 0 ? Array.from(selectedTests) : [test.id];
                                      setMultipleStatus(targets, 'pending');
                                      setSelectedTests(new Set());
                                      if (selectedTest?.id === test.id) setSelectedTest(null);
                                    }}>
                                      <Circle className="w-4 h-4 mr-2 text-[hsl(var(--status-pending))]" />
                                      {t('pending')}
                                    </ContextMenuItem>
                                    <ContextMenuItem onClick={() => {
                                      const targets = selectedTests.size > 0 ? Array.from(selectedTests) : [test.id];
                                      setMultipleStatus(targets, 'in-progress');
                                      setSelectedTests(new Set());
                                      if (selectedTest?.id === test.id) setSelectedTest(null);
                                    }}>
                                      <Clock className="w-4 h-4 mr-2 text-[hsl(var(--status-progress))]" />
                                      {t('inProgress')}
                                    </ContextMenuItem>
                                    <ContextMenuItem onClick={() => {
                                      const targets = selectedTests.size > 0 ? Array.from(selectedTests) : [test.id];
                                      setMultipleStatus(targets, 'done');
                                      setSelectedTests(new Set());
                                      if (selectedTest?.id === test.id) setSelectedTest(null);
                                    }}>
                                      <CheckCircle className="w-4 h-4 mr-2 text-[hsl(var(--status-done))]" />
                                      {t('done')}
                                    </ContextMenuItem>
                                  </ContextMenuContent>
                                </ContextMenu>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </aside>
          </ResizablePanel>

          <ResizableHandle className="mx-2 opacity-0 hover:opacity-100 transition-opacity" />

          {/* Right Panel */}
          <ResizablePanel defaultSize={50}>
            <div className="h-full flex flex-col gap-3">
              {/* Top Section: Test Info or Category Description - Collapsible */}
              <div className={cn(
                "rounded-lg border border-border/70 bg-card/40 flex flex-col shadow-md overflow-hidden transition-all duration-300",
                isTopSectionCollapsed ? "h-auto" : "h-[35vh]"
              )}>
                {/* Collapse Button Header */}
                  <div className="flex-shrink-0 px-3 py-2 bg-card/60 border-b border-border/50 flex items-center justify-between cursor-pointer hover:bg-card/80 transition-colors"
                    onClick={() => setIsTopSectionCollapsed(!isTopSectionCollapsed)}>
                    <div className="flex items-center gap-2">
                    {showCategoryDescription && selectedCategoryInfo ? (
                      <>
                        <Target className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs font-semibold text-cyan-400">{t('categoryDescription')}</span>
                      </>
                    ) : selectedTest ? (
                      <>
                        <Shield className="w-4 h-4 text-pink-400" />
                        <span className="text-sm font-semibold text-pink-400">{selectedTest.id} - {selectedCategoryInfo?.name}</span>
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs font-semibold text-muted-foreground">Info Test</span>
                      </>
                    )}
                  </div>
                   <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsTopSectionCollapsed(!isTopSectionCollapsed);
                    }}
                    className="h-6 w-6 p-0 hover:bg-primary/10"
                    title={isTopSectionCollapsed ? "Espandi" : "Collassa"}
                    >
                    {isTopSectionCollapsed ? (
                      <ChevronDown className="w-4 h-4 text-primary" />
                    ) : (
                      <ChevronUp className="w-4 h-4 text-primary" />
                    )}
                  </Button>
                </div>

                {/* Content - Only visible when not collapsed */}
                {!isTopSectionCollapsed && (
                  <div className="flex-1 overflow-hidden">
                    {showCategoryDescription && selectedCategoryInfo ? (
                      <div className="p-4 animate-fade-in h-full overflow-y-auto">
                        <h3 className="text-base font-semibold text-foreground mb-2">{selectedCategoryInfo.name}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {categoryDescriptions[selectedCategoryInfo.name] || 'No description available.'}
                        </p>
                      </div>
                    ) : selectedTest ? (
                      <div className="p-4 animate-fade-in h-full overflow-y-auto">
                        <h3 className="text-sm font-semibold mb-3 text-pink-400">{selectedTest.name}</h3>
                        <div className="space-y-2">
                          <span className="text-sm text-pink-300 font-semibold">{t('testObjectives')}:</span>
                          <ul className="list-disc list-outside text-[13px] text-pink-300 leading-relaxed space-y-2 pl-5">
                            {selectedTest.objectives.map((o, i) => <li key={i}>{o}</li>)}
                          </ul>
                        </div>
                        <a href={selectedTest.reference} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-cyan-400 hover:underline mt-3">
                          <ExternalLink className="w-3.5 h-3.5" />{t('reference')}
                        </a>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center h-full">
                        <div className="text-center">
                          <Shield className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                          <p className="text-sm text-muted-foreground">{t('selectTest')}</p>
                          <p className="text-xs text-muted-foreground/70">{t('selectTestDesc')}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Section: Tab Content - Expands when top is collapsed */}
              <div className="flex-1 rounded-lg border border-border/70 bg-elevated/60 overflow-hidden flex flex-col shadow-md">
                {selectedTest ? (
                  <>
                    <div className="flex-shrink-0 p-3 border-b border-border bg-card/50 flex flex-wrap gap-2">
                      {tabs.map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          style={{ padding: '7px 15px', marginRight: '5px' }}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                            'border border-transparent backdrop-blur-sm shadow-md hover-lift',
                            activeTab === tab.id
                              ? `${tab.color} text-white`
                              : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
                          )}
                        >
                          <tab.icon className="w-3.5 h-3.5" />{tab.label}
                        </button>
                      ))}
                    </div>
                    <ScrollArea className="flex-1 p-4">
                      {activeTab === 'summary' && testInfo?.summary && <div className="tab-content text-muted-foreground prose prose-invert prose-sm max-w-none animate-fade-in" dangerouslySetInnerHTML={{ __html: testInfo.summary }} />}
                      {activeTab === 'howto' && testInfo?.['how-to'] && <div className="tab-content text-muted-foreground prose prose-invert prose-sm max-w-none animate-fade-in" dangerouslySetInnerHTML={{ __html: testInfo['how-to'] }} />}
                      {activeTab === 'tools' && testInfo?.tools && <div className="tab-content text-muted-foreground prose prose-invert prose-sm max-w-none animate-fade-in" dangerouslySetInnerHTML={{ __html: testInfo.tools }} />}
                      {activeTab === 'remediation' && testInfo?.remediation && <div className="tab-content text-muted-foreground prose prose-invert prose-sm max-w-none animate-fade-in" dangerouslySetInnerHTML={{ __html: testInfo.remediation }} />}
                      {activeTab === 'notes' && (
                        <div className="space-y-2">
                          {/* Toolbar di formattazione */}
                          <div className="flex flex-wrap gap-2 p-2 bg-card/50 rounded-lg border border-border/50">
                            {/* Testo base */}
                            <div className="flex gap-1">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 px-3 text-sm font-extrabold" 
                                onClick={() => document.execCommand('bold')} 
                                title="Grassetto"
                              >
                                <span className="font-black">B</span>
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 px-3 text-sm italic font-semibold" 
                                onClick={() => document.execCommand('italic')} 
                                title="Corsivo"
                              >
                                I
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 px-3 text-sm underline decoration-2" 
                                onClick={() => document.execCommand('underline')} 
                                title="Sottolineato"
                              >
                                U
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 px-3 text-sm line-through" 
                                onClick={() => document.execCommand('strikeThrough')} 
                                title="Barrato"
                              >
                                S
                              </Button>
                            </div>

                            <div className="w-px h-8 bg-border" />

                            {/* Headers Select */}
                            <Select 
                              value={undefined}
                              onValueChange={(value) => document.execCommand('formatBlock', false, value)}
                            >
                              <SelectTrigger className="h-8 w-32 text-xs bg-secondary/50">
                                <SelectValue placeholder="Formato" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="p" className="text-xs">
                                  📄 Paragrafo
                                </SelectItem>
                                <SelectItem value="h1" className="text-base font-bold">
                                  H1 - Titolo 1
                                </SelectItem>
                                <SelectItem value="h2" className="text-sm font-semibold">
                                  H2 - Titolo 2
                                </SelectItem>
                                <SelectItem value="h3" className="text-xs font-semibold">
                                  H3 - Titolo 3
                                </SelectItem>
                              </SelectContent>
                            </Select>

                            <div className="w-px h-8 bg-border" />

                            {/* Inserisci Select - Liste e Code */}
                            <Select 
                              value={undefined}
                              onValueChange={(value) => {
                                const selection = window.getSelection();
                                if (!selection || selection.rangeCount === 0) return;
                                
                                if (value === 'ul') {
                                  document.execCommand('insertUnorderedList');
                                } else if (value === 'ol') {
                                  document.execCommand('insertOrderedList');
                                } else if (value === 'code') {
                                  const text = selection.toString();
                                  if (text) {
                                    const range = selection.getRangeAt(0);
                                    range.deleteContents();
                                    
                                    const code = document.createElement('code');
                                    code.className = 'code-inline';
                                    code.textContent = text;
                                    
                                    range.insertNode(code);
                                    
                                    // Aggiungi zero-width space dopo per continuare a scrivere
                                    const space = document.createTextNode('\u200B');
                                    code.after(space);
                                    
                                    // Posiziona cursore dopo
                                    range.setStartAfter(space);
                                    range.collapse(true);
                                    selection.removeAllRanges();
                                    selection.addRange(range);
                                  }
                                } else if (value === 'codeblock') {
                                  const text = selection.toString() || 'Il tuo codice qui...';
                                  const range = selection.getRangeAt(0);
                                  
                                  const pre = document.createElement('pre');
                                  pre.className = 'code-block';
                                  pre.textContent = text;
                                  
                                  const p = document.createElement('p');
                                  p.innerHTML = '<br>';
                                  
                                  range.deleteContents();
                                  range.insertNode(p);
                                  range.insertNode(pre);
                                  
                                  // Sposta il cursore dopo
                                  range.setStartAfter(p);
                                  range.collapse(true);
                                  selection.removeAllRanges();
                                  selection.addRange(range);
                                }
                              }}
                            >
                              <SelectTrigger className="h-8 w-32 text-xs bg-secondary/50">
                                <SelectValue placeholder="➕ Inserisci" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ul" className="text-xs">
                                  • Lista puntata
                                </SelectItem>
                                <SelectItem value="ol" className="text-xs">
                                  1. Lista numerata
                                </SelectItem>
                                <SelectItem value="code" className="text-xs font-mono">
                                  &lt;/&gt; Codice inline
                                </SelectItem>
                                <SelectItem value="codeblock" className="text-xs font-mono">
                                  💻 Blocco codice
                                </SelectItem>
                              </SelectContent>
                            </Select>

                            <div className="w-px h-8 bg-border" />

                            {/* Evidenziazione Select */}
                            <Select 
                              value={undefined}
                              onValueChange={(value) => {
                                const selection = window.getSelection();
                                if (!selection || selection.rangeCount === 0 || !selection.toString().trim()) return;
                                
                                const range = selection.getRangeAt(0);
                                
                                // Funzione ricorsiva per pulire gli span con background
                                const cleanHighlights = (node: Node): DocumentFragment => {
                                  const result = document.createDocumentFragment();
                                  
                                  node.childNodes.forEach(child => {
                                    if (child.nodeType === Node.TEXT_NODE) {
                                      result.appendChild(child.cloneNode());
                                    } else if (child.nodeType === Node.ELEMENT_NODE) {
                                      const el = child as HTMLElement;
                                      // Se è uno span con background, estrai solo il contenuto
                                      if (el.tagName === 'SPAN' && el.style.backgroundColor) {
                                        result.appendChild(cleanHighlights(el));
                                      } else {
                                        // Clona l'elemento ma pulisci i figli ricorsivamente
                                        const clone = el.cloneNode(false) as HTMLElement;
                                        clone.appendChild(cleanHighlights(el));
                                        result.appendChild(clone);
                                      }
                                    }
                                  });
                                  
                                  return result;
                                };
                                
                                // Estrai il contenuto e puliscilo
                                const fragment = range.extractContents();
                                const cleanedContent = cleanHighlights(fragment);
                                
                                if (value === 'transparent') {
                                  // Solo rimuovi evidenziazione - inserisci contenuto pulito
                                  range.insertNode(cleanedContent);
                                } else {
                                  // Crea nuovo span con colore
                                  const span = document.createElement('span');
                                  span.style.backgroundColor = value;
                                  span.style.padding = '2px 4px';
                                  span.style.borderRadius = '3px';
                                  span.appendChild(cleanedContent);
                                  
                                  range.insertNode(span);
                                  
                                  // Seleziona il nuovo span
                                  range.selectNodeContents(span);
                                }
                                
                                selection.removeAllRanges();
                                selection.addRange(range);
                              }}
                            >
                              <SelectTrigger className="h-8 w-36 text-xs bg-secondary/50">
                                <SelectValue placeholder="🎨 Evidenzia" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="#d97706" className="text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="w-4 h-4 rounded" style={{backgroundColor: '#d97706'}}></span>
                                    Ambra scuro
                                  </div>
                                </SelectItem>
                                <SelectItem value="#ea580c" className="text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="w-4 h-4 rounded" style={{backgroundColor: '#ea580c'}}></span>
                                    Arancione scuro
                                  </div>
                                </SelectItem>
                                <SelectItem value="#db2777" className="text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="w-4 h-4 rounded" style={{backgroundColor: '#db2777'}}></span>
                                    Rosa scuro
                                  </div>
                                </SelectItem>
                                <SelectItem value="#7c3aed" className="text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="w-4 h-4 rounded" style={{backgroundColor: '#7c3aed'}}></span>
                                    Viola scuro
                                  </div>
                                </SelectItem>
                                <SelectItem value="#2563eb" className="text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="w-4 h-4 rounded" style={{backgroundColor: '#2563eb'}}></span>
                                    Blu scuro
                                  </div>
                                </SelectItem>
                                <SelectItem value="#059669" className="text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="w-4 h-4 rounded" style={{backgroundColor: '#059669'}}></span>
                                    Verde smeraldo
                                  </div>
                                </SelectItem>
                                <SelectItem value="transparent" className="text-xs">
                                  ✕ Rimuovi evidenziazione
                                </SelectItem>
                              </SelectContent>
                            </Select>

                            <div className="w-px h-8 bg-border" />

                            {/* Font Size Select */}
                            <Select 
                              value={undefined}
                              onValueChange={(value) => document.execCommand('fontSize', false, value)}
                            >
                              <SelectTrigger className="h-8 w-28 text-xs bg-secondary/50">
                                <SelectValue placeholder="Grandezza" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1" className="text-[10px]">
                                  Molto piccolo
                                </SelectItem>
                                <SelectItem value="2" className="text-xs">
                                  Piccolo
                                </SelectItem>
                                <SelectItem value="3" className="text-sm">
                                  Normale
                                </SelectItem>
                                <SelectItem value="4" className="text-base">
                                  Grande
                                </SelectItem>
                                <SelectItem value="5" className="text-lg">
                                  Molto grande
                                </SelectItem>
                              </SelectContent>
                            </Select>

                            <div className="w-px h-8 bg-border" />

                            {/* Utilità - Clear FIXED */}
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 px-3 text-xs text-red-400 hover:text-red-300" 
                              onClick={() => {
                                const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
                                if (!editor) return;
                                
                                const selection = window.getSelection();
                                if (!selection || selection.rangeCount === 0) return;
                                
                                const range = selection.getRangeAt(0);
                                const selectedText = selection.toString();
                                const editorText = editor.textContent || '';
                                
                                // Se la selezione copre quasi tutto l'editor o se il container è l'editor stesso
                                const isFullSelection = 
                                  selectedText.length >= editorText.length * 0.8 ||
                                  range.commonAncestorContainer === editor ||
                                  (range.commonAncestorContainer.parentElement === editor && selectedText.length > 0);
                                
                                if (isFullSelection && selectedText.length > 0) {
                                  // Pulisci tutto: estrai solo il testo puro
                                  const plainText = selectedText || editorText;
                                  editor.innerHTML = `<p>${plainText}</p>`;
                                  return;
                                }
                                
                                // Pulisci solo la selezione
                                if (selectedText) {
                                  const fragment = range.extractContents();
                                  const tempDiv = document.createElement('div');
                                  tempDiv.appendChild(fragment);
                                  
                                  // Ottieni solo il testo puro
                                  const textContent = tempDiv.textContent || '';
                                  
                                  // Inserisci il testo pulito
                                  const textNode = document.createTextNode(textContent);
                                  range.insertNode(textNode);
                                  
                                  // Ripristina selezione
                                  range.selectNodeContents(textNode);
                                  selection.removeAllRanges();
                                  selection.addRange(range);
                                }
                              }} 
                              title="Rimuovi formattazione"
                            >
                              ✕ Clear
                            </Button>
                          </div>

                          {/* Area di editing con bordo colorato su focus */}
                          <div 
                            contentEditable 
                            className="min-h-[320px] max-h-[400px] overflow-y-auto p-4 rounded-lg border-2 border-border bg-secondary/30 text-[13px] leading-relaxed outline-none focus:border-primary transition-colors prose prose-invert prose-sm max-w-none
                              [&_h1]:text-2xl [&_h1]:font-black [&_h1]:mb-2 [&_h1]:text-primary [&_h1]:border-b [&_h1]:border-primary/30 [&_h1]:pb-2
                              [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-2 [&_h2]:text-cyan-400
                              [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-1 [&_h3]:text-purple-400
                              [&_p]:my-2 [&_p]:text-foreground
                              [&_ul]:my-2 [&_ul]:list-disc [&_ul]:list-outside [&_ul]:ml-5
                              [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:list-outside [&_ol]:ml-5
                              [&_li]:my-1 [&_li]:text-foreground
                              [&_.code-block]:bg-zinc-900 [&_.code-block]:border [&_.code-block]:border-zinc-700 [&_.code-block]:p-3 [&_.code-block]:rounded-lg [&_.code-block]:my-2 [&_.code-block]:text-cyan-300 [&_.code-block]:font-mono [&_.code-block]:text-xs [&_.code-block]:overflow-x-auto [&_.code-block]:block [&_.code-block]:whitespace-pre
                              [&_.code-inline]:text-cyan-400 [&_.code-inline]:bg-zinc-900 [&_.code-inline]:px-1.5 [&_.code-inline]:py-0.5 [&_.code-inline]:rounded [&_.code-inline]:font-mono [&_.code-inline]:text-xs [&_.code-inline]:border [&_.code-inline]:border-zinc-700
                              [&_strong]:font-black [&_strong]:text-foreground
                              [&_em]:italic [&_em]:text-muted-foreground
                              [&_u]:underline [&_u]:decoration-2 [&_u]:decoration-primary"
                            onBlur={(e) => setNote(selectedTest.id, e.currentTarget.innerHTML)} 
                            dangerouslySetInnerHTML={{ __html: getNote(selectedTest.id) }} 
                          />
                        </div>
                      )}

                      {!testInfo && activeTab !== 'notes' && <p className="text-sm text-muted-foreground">Nessuna informazione disponibile per questo test.</p>}
                    </ScrollArea>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                    Seleziona un test per vedere i dettagli
                  </div>
                )}
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Footer */}
      <footer className="flex-shrink-0 border-t border-border px-4 py-2 flex items-center justify-between bg-card/50">
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[hsl(var(--status-pending))]" />{t('pending')}: {allTestIds.length - totalCompleted - getInProgressCount(allTestIds)}</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[hsl(var(--status-progress))]" />{t('inProgress')}: {getInProgressCount(allTestIds)}</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[hsl(var(--status-done))]" />{t('done')}: {totalCompleted}</span>
        </div>
        <Select value={language} onValueChange={(v) => setLanguage(v as 'en' | 'it')}>
          <SelectTrigger className="w-36 h-9 text-sm font-medium bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30 hover:border-primary/50 transition-all">
            <Globe className="w-4 h-4 mr-2 text-primary" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="it" className="text-sm">🇮🇹 Italiano</SelectItem>
            <SelectItem value="en" className="text-sm">🇬🇧 English</SelectItem>
          </SelectContent>
        </Select>
      </footer>

      {/* Mapping Modal */}
      <Dialog open={showMappingModal} onOpenChange={setShowMappingModal}>
        <DialogContent className="max-w-[1300px] h-[91.2vh] p-0 gap-0 bg-background border-border overflow-hidden">
          <DialogHeader className="px-4 py-2 border-b border-border">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Mapping WSTG <ChevronRight className="w-4 h-4 mx-1" /> OWASP Top 10
            </DialogTitle>          
          </DialogHeader>
          <div className="flex-1 flex overflow-hidden gap-4 p-3">
            {/* Left: Table */}
            <div className="w-[430px] overflow-auto flex-shrink-0 rounded-lg border border-border/70 bg-card/40 shadow-md">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card/80 backdrop-blur-sm">
                  <tr><th className="text-left p-3 font-semibold border-b border-border">Categoria WSTG</th><th className="text-left p-3 font-semibold border-b border-border">OWASP Top 10</th></tr>
                </thead>
                <tbody>
                  {categories.map((cat, i) => (
                    <tr key={cat.id} className="border-b border-border/50 hover:bg-secondary/30 animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
                      <td className="p-3 text-cyan-400">{cat.name}</td>
                      <td className="p-3 text-purple-400">{owaspMapping[cat.name] || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Center: OWASP List */}
            <div className="w-[390px] p-3 overflow-auto flex-shrink-0 rounded-lg border border-border/70 bg-elevated/60 shadow-md">
              <div className="space-y-1.5">
                {Object.entries(owaspTop10).map(([key, item], i) => (
                  <button
                      key={key}
                      onClick={() => setSelectedOwaspItem(key)}
                      className={cn(
                        'w-full p-2.5 rounded-lg text-left transition-all duration-200 animate-fade-in'
                      )}
                      style={{
                        animationDelay: `${i * 50}ms`,
                        backgroundColor: selectedOwaspItem === key ? `${getLevelColor(item.level)}30` : `${getLevelColor(item.level)}10`,
                        border: `3px solid ${selectedOwaspItem === key ? getLevelColor(item.level) : 'transparent'}`
                      }}
                      onMouseEnter={(e) => {
                        if (selectedOwaspItem !== key) {
                          e.currentTarget.style.backgroundColor = `${getLevelColor(item.level)}20`;
                          e.currentTarget.style.borderColor = getLevelColor(item.level);
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedOwaspItem !== key) {
                          e.currentTarget.style.backgroundColor = `${getLevelColor(item.level)}10`;
                          e.currentTarget.style.borderColor = 'transparent';
                        }
                      }}
                    >
                    <span className="text-[13px] font-semibold" style={{ color: getLevelColor(item.level) }}>{key}</span>
                  </button>
                ))}
              </div>
            </div>
            {/* Right: Description */}
            <div className="w-[420px] p-4 overflow-auto flex-shrink-0 rounded-lg border border-border/70 bg-card/40 shadow-md">
              {selectedOwaspData ? (
                <div className="animate-fade-in">
                  <h3 className="text-lg font-semibold mb-3" style={{ color: getLevelColor(selectedOwaspData.level) }}>{selectedOwaspItem}</h3>
                  <div className="text-sm text-muted-foreground leading-relaxed mb-4" dangerouslySetInnerHTML={{ __html: selectedOwaspData.description }} />
                  {selectedOwaspData.link && (
                    <a href={selectedOwaspData.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-cyan-400 hover:underline">
                      <ExternalLink className="w-3.5 h-3.5" />Riferimento
                    </a>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Seleziona un elemento OWASP Top 10 per vedere la descrizione
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <MessageModal
        isOpen={modal.isOpen}
        config={modal.config}
        onClose={modal.hide}
      />
    </div>
  );
};
