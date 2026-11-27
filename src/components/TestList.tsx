import { KeyboardEvent, useRef } from 'react';
import { ChevronRight, Info, SearchX, X } from 'lucide-react';
import { WSTGCategory, TestStatus } from '@/types/checklist';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';
import { ChangingStatusIcon, StatusIcon, STATUSES, statusLabelKey } from '@/components/status';
import { cn } from '@/lib/utils';

interface TestListProps {
  categories: WSTGCategory[];
  // Test visibili nell'ordine della lista (categorie espanse): frecce e selezione con Maiusc
  visibleIds: string[];
  getStatus: (id: string) => TestStatus;
  hasNote: (id: string) => boolean;
  isCollapsed: (catId: string) => boolean;
  selectedTestId: string | null;
  selection: Set<string>;
  hasFilters: boolean;
  onCategoryClick: (cat: WSTGCategory, toggle?: boolean) => void;
  onSelectTest: (id: string, mode?: 'toggle' | 'range') => void;
  onCycleStatus: (id: string) => void;
  onSetStatus: (ids: string[], status: TestStatus) => void;
  onClearSelection: () => void;
  onClearFilters: () => void;
}

// Tinta della categoria: viola se c'è almeno un test in corso, verde se almeno uno è completato
const categoryTone = (statuses: TestStatus[]) =>
  statuses.includes('in-progress')
    ? { bg: 'bg-progress', text: 'text-progress' }
    : statuses.includes('done')
      ? { bg: 'bg-done', text: 'text-done' }
      : { bg: 'bg-pending', text: 'text-pending' };

const nameColor: Record<TestStatus, string> = { done: 'text-done', 'in-progress': 'text-progress', pending: 'text-foreground' };

export const TestList = ({
  categories, visibleIds, getStatus, hasNote, isCollapsed, selectedTestId, selection, hasFilters,
  onCategoryClick, onSelectTest, onCycleStatus, onSetStatus, onClearSelection, onClearFilters,
}: TestListProps) => {
  const { t } = useLanguage();
  const listRef = useRef<HTMLDivElement>(null);

  const focusId = selectedTestId && visibleIds.includes(selectedTestId) ? selectedTestId : visibleIds[0];

  const focusRow = (id: string) =>
    requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>(`[data-test-id="${id}"] [data-row]`)?.focus());

  const onRowKeyDown = (e: KeyboardEvent, id: string) => {
    const index = visibleIds.indexOf(id);
    const move = (to: number) => {
      const next = visibleIds[Math.max(0, Math.min(visibleIds.length - 1, to))];
      if (next && next !== id) {
        onSelectTest(next);
        focusRow(next);
      }
    };
    if (e.key === 'ArrowDown') move(index + 1);
    else if (e.key === 'ArrowUp') move(index - 1);
    else if (e.key === 'Home') move(0);
    else if (e.key === 'End') move(visibleIds.length - 1);
    else if (e.key === ' ') onCycleStatus(id);
    else return;
    e.preventDefault();
  };

  const contextTargets = (id: string) => (selection.size > 1 && selection.has(id) ? Array.from(selection) : [id]);

  if (categories.length === 0) {
    return (
      <aside className="h-full flex flex-col items-center justify-center gap-3 bg-sidebar rounded-lg border border-sidebar-border text-center p-6">
        <SearchX className="w-10 h-10 text-muted-foreground/60" />
        <p className="text-sm text-muted-foreground">{t('noResults')}</p>
        {hasFilters && (
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            {t('clearFilters')}
          </Button>
        )}
      </aside>
    );
  }

  return (
    <aside className="h-full flex flex-col bg-sidebar rounded-lg border border-sidebar-border overflow-hidden shadow-lg">
      <ScrollArea className="flex-1">
        <div ref={listRef} className="p-2 space-y-4">
          {categories.map((cat, ci) => {
            const collapsed = isCollapsed(cat.id);
            const statuses = cat.tests.map((test) => getStatus(test.id));
            const done = statuses.filter((s) => s === 'done').length;
            const busy = statuses.filter((s) => s === 'in-progress').length;
            const tone = categoryTone(statuses);
            return (
              <section key={cat.id} aria-label={cat.name} className="animate-fade-in" style={{ animationDelay: `${ci * 25}ms` }}>
                <div className="relative">
                  <button
                    onClick={() => onCategoryClick(cat)}
                    aria-expanded={!collapsed}
                    className={cn('focus-ring w-full rounded-lg px-2.5 pt-2.5 pb-2 text-left transition-[filter] hover:brightness-110', tone.bg)}
                  >
                    <span className="flex items-center gap-2 pr-7">
                      <ChevronRight className={cn('w-4 h-4 flex-shrink-0 transition-transform duration-200', tone.text, !collapsed && 'rotate-90')} />
                      <span className={cn('flex-1 font-semibold text-sm', tone.text)}>{cat.name}</span>
                      <span className={cn('text-sm font-medium tabular-nums flex-shrink-0', tone.text)}>
                        {done}/{cat.tests.length}
                      </span>
                    </span>
                    {/* Avanzamento della categoria: completati (verde) + in corso (viola) */}
                    <span className="mt-2 ml-6 flex h-1 rounded-full bg-background/40 overflow-hidden" aria-hidden>
                      <span className="h-full bg-[hsl(var(--status-done))] transition-[width] duration-500" style={{ width: `${(done / cat.tests.length) * 100}%` }} />
                      <span className="h-full bg-[hsl(var(--status-progress))] transition-[width] duration-500" style={{ width: `${(busy / cat.tests.length) * 100}%` }} />
                    </span>
                  </button>
                  {/* Fratello e non figlio dell'header (niente pulsanti annidati): mostra solo la descrizione */}
                  <button
                    onClick={() => onCategoryClick(cat, false)}
                    title={t('categoryDescription')}
                    aria-label={`${t('categoryDescription')}: ${cat.name}`}
                    className={cn('focus-ring absolute right-1.5 top-2 h-6 w-6 flex items-center justify-center rounded-md opacity-70 transition hover:opacity-100 hover:bg-foreground/10', tone.text)}
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>

                <div className={cn('grid transition-[grid-template-rows] duration-200 ease-out', collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]')}>
                  <div className="overflow-hidden" aria-hidden={collapsed || undefined}>
                    <ul className="mt-1 space-y-0.5">
                      {cat.tests.map((test) => {
                        const status = getStatus(test.id);
                        const isSelected = selectedTestId === test.id || selection.has(test.id);
                        return (
                          <li key={test.id} data-test-id={test.id}>
                            <ContextMenu>
                              <ContextMenuTrigger asChild>
                                <div
                                  className={cn(
                                    'group flex items-start gap-2 rounded-md border-l-2 transition-colors',
                                    isSelected ? 'bg-primary/20 border-primary' : 'border-transparent hover:bg-foreground/10',
                                  )}
                                  onContextMenu={() => {
                                    if (!selection.has(test.id) && selectedTestId !== test.id) onSelectTest(test.id);
                                  }}
                                >
                                  <button
                                    tabIndex={-1}
                                    onClick={() => onCycleStatus(test.id)}
                                    title={`${t('status')}: ${t(statusLabelKey[status])}`}
                                    aria-label={`${t('status')}: ${t(statusLabelKey[status])}`}
                                    className="flex-shrink-0 pl-2.5 py-2 transition-transform duration-150 hover:scale-110 active:scale-90"
                                  >
                                    <ChangingStatusIcon status={status} />
                                  </button>
                                  <button
                                    data-row
                                    tabIndex={test.id === focusId ? 0 : -1}
                                    aria-current={selectedTestId === test.id ? 'true' : undefined}
                                    onClick={(e) => onSelectTest(test.id, e.ctrlKey || e.metaKey ? 'toggle' : e.shiftKey ? 'range' : undefined)}
                                    onKeyDown={(e) => onRowKeyDown(e, test.id)}
                                    className="focus-ring flex-1 min-w-0 flex items-baseline gap-2 py-2 pr-2.5 text-left rounded-r-md"
                                  >
                                    <span className="w-[96px] flex-shrink-0 whitespace-nowrap text-[11px] font-medium tabular-nums text-muted-foreground/80">{test.id}</span>
                                    <span className={cn('flex-1 text-[13px] leading-snug transition-colors duration-200', nameColor[status])}>{test.name}</span>
                                    {hasNote(test.id) && <span className="self-center w-1.5 h-1.5 rounded-full bg-pink-400 flex-shrink-0" title={t('hasNotes')} />}
                                  </button>
                                </div>
                              </ContextMenuTrigger>
                              <ContextMenuContent>
                                {STATUSES.map((s) => (
                                  <ContextMenuItem key={s} onClick={() => onSetStatus(contextTargets(test.id), s)}>
                                    <StatusIcon status={s} className="mr-2" />
                                    {t(statusLabelKey[s])}
                                  </ContextMenuItem>
                                ))}
                              </ContextMenuContent>
                            </ContextMenu>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </ScrollArea>

      {selection.size > 1 && (
        <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 border-t border-sidebar-border bg-card/80 animate-fade-in">
          <span className="text-xs font-medium text-foreground flex-1">{t('selectedCount', { n: selection.size })}</span>
          {STATUSES.map((s) => (
            <Button
              key={s}
              variant="outline"
              size="sm"
              className="h-7 px-2 gap-1.5 text-xs"
              onClick={() => onSetStatus(Array.from(selection), s)}
            >
              <StatusIcon status={s} className="w-3.5 h-3.5" />
              {t(statusLabelKey[s])}
            </Button>
          ))}
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClearSelection} title={t('clearSelection')} aria-label={t('clearSelection')}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </aside>
  );
};
