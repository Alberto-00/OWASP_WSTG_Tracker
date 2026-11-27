import { MouseEvent } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { ChevronDown, ExternalLink, FileText, Lightbulb, Shield, ShieldCheck, StickyNote, Target, Wrench } from 'lucide-react';
import { TestInfoData, TestStatus, WSTGCategory, WSTGTest } from '@/types/checklist';
import { NoteEditor } from '@/components/NoteEditor';
import { STATUSES, StatusIcon, statusLabelKey } from '@/components/status';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';

export type DetailTab = 'summary' | 'howto' | 'tools' | 'remediation' | 'notes';
// Sezione compressa della colonna di dettaglio (una alla volta: l'altra prende lo spazio)
export type CollapsedPart = 'info' | 'tabs';

export interface Top10Ref {
  key: string;
  code: string;
  title: string;
}

interface TestDetailProps {
  test: WSTGTest | null;
  category: WSTGCategory | null;
  showCategory: boolean;
  info: TestInfoData | null;
  categoryDescription: string;
  categoryStats: { done: number; busy: number; total: number } | null;
  status: TestStatus;
  onSetStatus: (status: TestStatus) => void;
  top10: Top10Ref[];
  onOpenTop10: (key: string) => void;
  activeTab: DetailTab;
  onTabChange: (tab: DetailTab) => void;
  note: string;
  hasNote: boolean;
  onNoteChange: (html: string) => void;
  collapsed: CollapsedPart | null;
  onToggleCollapsed: (part: CollapsedPart) => void;
  onNavigateTest: (id: string) => void;
}

const TABS = [
  { id: 'summary', label: 'summary', icon: FileText, active: 'data-[state=active]:bg-cyan-600', field: 'summary', empty: 'emptySection' },
  { id: 'howto', label: 'howTo', icon: Lightbulb, active: 'data-[state=active]:bg-amber-600', field: 'how-to', empty: 'emptySection' },
  { id: 'tools', label: 'tools', icon: Wrench, active: 'data-[state=active]:bg-purple-600', field: 'tools', empty: 'emptyTools' },
  { id: 'remediation', label: 'remediation', icon: ShieldCheck, active: 'data-[state=active]:bg-emerald-600', field: 'remediation', empty: 'emptyRemediation' },
] as const;

// HTML dei contenuti WSTG: i link "#WSTG-…" portano al test, quelli esterni si aprono nel browser
const ContentHtml = ({ html, onNavigateTest }: { html: string; onNavigateTest: (id: string) => void }) => {
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const link = (e.target as HTMLElement).closest('a');
    if (!link) return;
    const href = link.getAttribute('href') || '';
    e.preventDefault();
    if (href.startsWith('#WSTG-')) onNavigateTest(href.slice(1));
    else if (/^https?:\/\//i.test(href)) window.open(href, '_blank', 'noopener,noreferrer');
  };
  return (
    <div
      className="tab-content prose prose-invert prose-sm max-w-none p-4 animate-fade-in"
      onClick={onClick}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

const Top10Chips = ({ items, onOpen }: { items: Top10Ref[]; onOpen: (key: string) => void }) => (
  <div className="flex flex-wrap gap-1.5">
    {items.map((item) => (
      <button
        key={item.key}
        onClick={() => onOpen(item.key)}
        className="top10-chip focus-ring inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium transition-colors"
      >
        <span className="font-semibold tabular-nums">{item.code}:2025</span>
        <span className="text-foreground/85">{item.title}</span>
      </button>
    ))}
  </div>
);

export const TestDetail = (props: TestDetailProps) => {
  const {
    test, category, showCategory, info, categoryDescription, categoryStats, status, onSetStatus,
    top10, onOpenTop10, activeTab, onTabChange, note, hasNote, onNoteChange, collapsed, onToggleCollapsed, onNavigateTest,
  } = props;
  const { t } = useLanguage();
  const mode = showCategory && category ? 'category' : test ? 'test' : 'none';
  const infoCollapsed = collapsed === 'info';
  const tabsCollapsed = collapsed === 'tabs' && mode === 'test';
  // Un clic su una scheda mentre la sezione è compressa la riapre
  const expandTabs = () => tabsCollapsed && onToggleCollapsed('tabs');

  const headerLabel =
    mode === 'category' ? (
      <>
        <Target className="w-4 h-4 text-cyan-400 flex-shrink-0" />
        <span className="text-xs font-semibold text-cyan-400 truncate">{t('categoryDescription')}</span>
      </>
    ) : mode === 'test' && test ? (
      <>
        <Shield className="w-4 h-4 text-pink-400 flex-shrink-0" />
        <span className="text-sm font-semibold text-pink-400 tabular-nums flex-shrink-0">{test.id}</span>
        <span className="text-sm text-muted-foreground truncate">· {category?.name}</span>
      </>
    ) : (
      <>
        <Shield className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span className="text-xs font-semibold text-muted-foreground">{t('testInfo')}</span>
      </>
    );

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Riquadro informazioni: 35% dell'altezza, tutto lo spazio se le schede sotto sono compresse.
          Le altezze passano da flex-grow/flex-basis, che il browser anima: ogni cambio è fluido. */}
      <section className={cn('min-h-0 flex flex-col rounded-lg border border-border/70 bg-card/40 shadow-md overflow-hidden transition-[flex-grow] duration-300 ease-out', tabsCollapsed ? 'grow' : 'grow-0')}>
        <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-card/60 border-b border-border/50">
          <button tabIndex={-1} onClick={() => onToggleCollapsed('info')} className="flex-1 min-w-0 flex items-center gap-2 py-1 text-left">
            {headerLabel}
          </button>
          {mode === 'test' && (
            <div role="radiogroup" aria-label={t('status')} className="flex items-center rounded-md border border-border/60 bg-background/40 p-0.5">
              {STATUSES.map((s) => {
                const active = s === status;
                return (
                  <button
                    key={s}
                    role="radio"
                    aria-checked={active}
                    title={t(statusLabelKey[s])}
                    onClick={() => onSetStatus(s)}
                    className={cn(
                      'focus-ring h-6 flex items-center gap-1.5 rounded px-1.5 text-xs font-medium transition-colors',
                      active ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary/50',
                    )}
                  >
                    <StatusIcon status={s} className="w-3.5 h-3.5" />
                    {active && <span>{t(statusLabelKey[s])}</span>}
                  </button>
                );
              })}
            </div>
          )}
          <button
            onClick={() => onToggleCollapsed('info')}
            aria-expanded={!infoCollapsed}
            aria-label={infoCollapsed ? t('expand') : t('collapse')}
            title={infoCollapsed ? t('expand') : t('collapse')}
            className="focus-ring h-7 w-7 flex items-center justify-center rounded-md text-primary hover:bg-primary/10"
          >
            <ChevronDown className={cn('w-4 h-4 transition-transform duration-200', !infoCollapsed && 'rotate-180')} />
          </button>
        </div>

        <div className={cn('grow min-h-0 overflow-hidden transition-[flex-basis] duration-300 ease-out', infoCollapsed ? 'basis-0' : 'basis-[35vh]')}>
          <div className="h-full overflow-y-auto p-4">
            {mode === 'category' && category ? (
              <div key={category.id} className="space-y-3 animate-fade-in">
                <h2 className="text-base font-semibold text-foreground">{category.name}</h2>
                <p className="text-[13px] text-muted-foreground leading-relaxed">{categoryDescription}</p>
                {categoryStats && (
                  <p className="text-xs text-muted-foreground tabular-nums">
                    <span className="text-done font-medium">{t('categoryProgress', { done: categoryStats.done, total: categoryStats.total })}</span>
                    {categoryStats.busy > 0 && (
                      <span className="text-progress"> · {categoryStats.busy} {t('inProgress').toLowerCase()}</span>
                    )}
                  </p>
                )}
                {top10.length > 0 && <Top10Chips items={top10} onOpen={onOpenTop10} />}
              </div>
            ) : mode === 'test' && test ? (
              <div key={test.id} className="space-y-3 animate-fade-in">
                <h2 className="text-base font-semibold text-pink-400 leading-snug">{test.name}</h2>
                {top10.length > 0 ? (
                  <Top10Chips items={top10} onOpen={onOpenTop10} />
                ) : (
                  <p className="text-xs text-muted-foreground">{t('reconOnly')}</p>
                )}
                <div className="space-y-1.5">
                  <h3 className="text-sm text-pink-300 font-semibold">{t('testObjectives')}</h3>
                  <ul className="list-disc list-outside text-[13px] text-pink-300 leading-relaxed space-y-1.5 pl-5">
                    {test.objectives.map((o, i) => (
                      <li key={i}>{o}</li>
                    ))}
                  </ul>
                </div>
                <a
                  href={test.reference}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus-ring inline-flex items-center gap-1 rounded text-[13px] font-medium text-cyan-400 hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {t('reference')}
                </a>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-6 gap-2">
                <Shield className="w-12 h-12 text-muted-foreground/40" />
                <p className="text-sm text-foreground/90">{t('selectTest')}</p>
                <p className="text-xs text-muted-foreground max-w-sm">{t('selectTestDesc')}</p>
                <p className="text-[11px] text-muted-foreground/80 mt-1">{t('keyboardHint')}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Schede: tutto lo spazio restante; si comprimono verso il basso come il riquadro sopra */}
      <section className={cn('min-h-0 flex flex-col rounded-lg border border-border/70 bg-elevated/60 shadow-md overflow-hidden transition-[flex-grow] duration-300 ease-out', tabsCollapsed ? 'grow-0' : 'grow')}>
        {test && mode === 'test' ? (
          <Tabs.Root value={activeTab} onValueChange={(v) => onTabChange(v as DetailTab)} className="grow min-h-0 flex flex-col">
            {/* Come l'header del riquadro sopra: un clic sullo spazio libero comprime/espande.
                I clic sui pulsanti (schede e freccia) restano ai loro gestori. */}
            <div
              onClick={(e) => !(e.target as HTMLElement).closest('button') && onToggleCollapsed('tabs')}
              className={cn('flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-card/50 cursor-pointer', !tabsCollapsed && 'border-b border-border')}
            >
              <Tabs.List className="flex-1 min-w-0 flex flex-wrap gap-1 xl:gap-1.5">
                {TABS.map((tab) => {
                  const empty = !info?.[tab.field];
                  return (
                    <Tabs.Trigger
                      key={tab.id}
                      value={tab.id}
                      onClick={expandTabs}
                      className={cn(
                        'focus-ring flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors shadow-md',
                        'data-[state=inactive]:bg-secondary/50 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-secondary data-[state=inactive]:hover:text-foreground',
                        tab.active, 'data-[state=active]:text-white',
                        empty && 'data-[state=inactive]:opacity-60',
                      )}
                    >
                      <tab.icon className="w-3.5 h-3.5" />
                      {t(tab.label)}
                    </Tabs.Trigger>
                  );
                })}
                <Tabs.Trigger
                  value="notes"
                  onClick={expandTabs}
                  className={cn(
                    'group focus-ring flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors shadow-md',
                    'data-[state=inactive]:bg-secondary/50 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-secondary data-[state=inactive]:hover:text-foreground',
                    'data-[state=active]:bg-pink-600 data-[state=active]:text-white',
                  )}
                >
                  <StickyNote className="w-3.5 h-3.5" />
                  {t('notes')}
                  {hasNote && <span className="w-1.5 h-1.5 rounded-full bg-pink-400 group-data-[state=active]:bg-white" title={t('hasNotes')} />}
                </Tabs.Trigger>
              </Tabs.List>
              <button
                onClick={() => onToggleCollapsed('tabs')}
                aria-expanded={!tabsCollapsed}
                aria-label={tabsCollapsed ? t('expand') : t('collapse')}
                title={tabsCollapsed ? t('expand') : t('collapse')}
                className="focus-ring h-7 w-7 flex-shrink-0 flex items-center justify-center rounded-md text-primary hover:bg-primary/10"
              >
                <ChevronDown className={cn('w-4 h-4 transition-transform duration-200', tabsCollapsed && 'rotate-180')} />
              </button>
            </div>

            {TABS.map((tab) => (
              <Tabs.Content key={tab.id} value={tab.id} className={cn('grow basis-0 min-h-0 overflow-y-auto focus-visible:outline-none transition-[visibility] duration-300', tabsCollapsed && 'invisible')}>
                {info?.[tab.field] ? (
                  <ContentHtml key={`${test.id}-${tab.id}`} html={info[tab.field]!} onNavigateTest={onNavigateTest} />
                ) : (
                  <p key={`${test.id}-${tab.id}`} className="p-4 text-sm text-muted-foreground animate-fade-in">{t(tab.empty)}</p>
                )}
              </Tabs.Content>
            ))}
            <Tabs.Content value="notes" className={cn('grow basis-0 min-h-0 focus-visible:outline-none transition-[visibility] duration-300', tabsCollapsed && 'invisible')}>
              <NoteEditor content={note} onChange={onNoteChange} testId={test.id} />
            </Tabs.Content>
          </Tabs.Root>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-6 text-center">{t('tabsHint')}</div>
        )}
      </section>
    </div>
  );
};
