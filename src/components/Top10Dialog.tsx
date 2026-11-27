import { useMemo, useRef, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { ExternalLink, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { OwaspTop10Item, TestStatus, WSTGCategory } from '@/types/checklist';
import { rankChange, TOP10_2021, TOP10_BY_TEST, TOP10_NEW_2025, top10Code } from '@/lib/top10Mapping';
import { StatusIcon } from '@/components/status';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';

interface Top10DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: Record<string, OwaspTop10Item>;
  selectedKey: string | null;
  onSelect: (key: string) => void;
  categories: WSTGCategory[];
  getStatus: (id: string) => TestStatus;
  onGoToTest: (id: string) => void;
}

type Origin2021 = (typeof TOP10_2021)[number];

// Diagramma 2021 → 2025: righe ad altezza fissa, così le frecce SVG partono e arrivano al centro di ogni riga
const ROW = 32;
const GAP = 6; // = space-y-1.5
const LANE = 150; // colonna delle frecce
const rowY = (code: string) => (Number(code.slice(1)) - 1) * (ROW + GAP) + ROW / 2;
// Come nella figura OWASP: verde sale o resta, arancio scende, giallo tratteggiato accorpata
// Ogni riquadro 2021 ha una sola freccia: il suo bordo ne riprende il colore (tratteggiato se accorpata)
const ARROWS = [
  { kind: 'up', tone: 'text-done', legend: 'legendUp', box: 'border-[hsl(var(--status-done)/0.6)] bg-[hsl(var(--status-done)/0.06)]' },
  { kind: 'down', tone: 'text-orange-400', legend: 'legendDown', box: 'border-orange-400/60 bg-orange-400/[0.06]' },
  { kind: 'merged', tone: 'text-yellow-300', legend: 'legendMerged', box: 'border-dashed border-yellow-300/70 bg-yellow-300/[0.06]' },
] as const;
const arrowFor = (o: Origin2021) => {
  const n = rankChange(o);
  return ARROWS[n === null ? 2 : n < 0 ? 1 : 0];
};
const dash = (kind: string) => (kind === 'merged' ? '5 4' : undefined);
const NEW_BADGE = 'rounded border border-[hsl(var(--status-done)/0.35)] bg-[hsl(var(--status-done)/0.12)] px-1.5 py-0.5 font-semibold text-done';
const INTRO_2025 = 'https://top10.owasp.org/2025/0x00_2025-Introduction/';

const Top10History = ({ keys, onOpen }: { keys: string[]; onOpen: (key: string) => void }) => {
  const { t } = useLanguage();
  // Riquadro sotto il mouse (o con il focus): restano accese le sue frecce e i riquadri collegati, il resto si attenua
  const [hover, setHover] = useState<{ year: 2021 | 2025; code: string } | null>(null);
  const active = TOP10_2021.filter((o) => !hover || (hover.year === 2021 ? o.code === hover.code : o.to === hover.code));
  const lit = (on: boolean) => cn('transition-opacity duration-150', !on && 'opacity-25');
  const on2025 = (code: string) => !hover || (hover.year === 2025 ? code === hover.code : active.some((o) => o.to === code));
  const follow = (year: 2021 | 2025, code: string) => ({ onMouseEnter: () => setHover({ year, code }), onMouseLeave: () => setHover(null) });
  return (
    <div className="mx-auto max-w-[1000px]">
      <div className="grid gap-x-2" style={{ gridTemplateColumns: `1fr ${LANE}px 1fr` }}>
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground">OWASP Top 10:2021</h3>
        <span />
        <h3 className="mb-2 text-sm font-semibold text-foreground">OWASP Top 10:2025</h3>
        <ol className="space-y-1.5">
          {TOP10_2021.map((o) => (
            <li
              key={o.code}
              {...follow(2021, o.code)}
              style={{ height: ROW }}
              className={cn('flex items-center gap-2 rounded-md border px-3 text-[13px]', arrowFor(o).box, lit(active.includes(o)))}
            >
              <span className={cn('font-semibold tabular-nums', arrowFor(o).tone)}>{o.code}</span>
              <span className="truncate text-muted-foreground" title={o.name}>{o.name}</span>
            </li>
          ))}
        </ol>
        <svg width={LANE} height={10 * ROW + 9 * GAP} aria-hidden>
          <defs>
            {ARROWS.map((a) => (
              <marker key={a.kind} id={`top10-arrow-${a.kind}`} className={a.tone} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
              </marker>
            ))}
          </defs>
          {TOP10_2021.map((o) => {
            const a = arrowFor(o);
            return (
              <line
                key={o.code}
                x1={4}
                y1={rowY(o.code)}
                x2={LANE - 6}
                y2={rowY(o.to)}
                className={cn(a.tone, lit(active.includes(o)))}
                stroke="currentColor"
                strokeWidth={2}
                strokeDasharray={dash(a.kind)}
                markerEnd={`url(#top10-arrow-${a.kind})`}
              />
            );
          })}
        </svg>
        <ol className="space-y-1.5">
          {keys.map((key) => {
            const code = top10Code(key);
            const name = key.split(' - ')[1];
            return (
              <li key={key} style={{ height: ROW }} className={lit(on2025(code))}>
                <button
                  {...follow(2025, code)}
                  onFocus={() => setHover({ year: 2025, code })}
                  onBlur={() => setHover(null)}
                  onClick={() => onOpen(key)}
                  className="focus-ring h-full w-full flex items-center gap-2 rounded-md border border-border/60 bg-card/40 px-3 text-left text-[13px] transition-colors hover:bg-foreground/10"
                >
                  <span className="font-semibold tabular-nums text-foreground">{code}</span>
                  <span className="flex-1 truncate text-foreground/90" title={name}>{name}</span>
                  {TOP10_NEW_2025.includes(code) && <span className={cn(NEW_BADGE, 'text-[11px] leading-none')}>{t('newBadge')}</span>}
                </button>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
        {ARROWS.map((a) => (
          <span key={a.kind} className="flex items-center gap-2">
            <svg width="28" height="8" className={a.tone} aria-hidden>
              <line x1="1" y1="4" x2="27" y2="4" stroke="currentColor" strokeWidth="2" strokeDasharray={dash(a.kind)} />
            </svg>
            {t(a.legend)}
          </span>
        ))}
        <span className="text-muted-foreground/70">{t('historyHint')}</span>
        <a
          href={INTRO_2025}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-ring ml-auto inline-flex items-center gap-1 rounded text-cyan-400 hover:underline"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          {t('source')}: OWASP Top 10:2025
        </a>
      </div>
    </div>
  );
};

type Section = 'overview' | 'tests' | 'prevention' | 'scenarios' | 'cwes' | 'references';
const PANEL = 'flex-1 min-h-0 overflow-y-auto p-5 focus-visible:outline-none';
// Testi ufficiali OWASP (HTML di scripts/import-top10.mjs) con lo stile dei contenuti WSTG
const PROSE = 'tab-content prose prose-invert prose-sm max-w-none';

export const Top10Dialog = ({ open, onOpenChange, entries, selectedKey, onSelect, categories, getStatus, onGoToTest }: Top10DialogProps) => {
  const { t } = useLanguage();
  const keys = useMemo(() => Object.keys(entries), [entries]);
  // Dopo un salto a un test il focus resta sulla riga del test, non torna al pulsante che ha aperto la finestra
  const jumped = useRef(false);
  const [view, setView] = useState<'categories' | 'history'>('categories');
  const [section, setSection] = useState<Section>('overview');
  const current = selectedKey && entries[selectedKey] ? selectedKey : keys[0];

  // Per ogni categoria Top 10: test collegati raggruppati per categoria WSTG, nell'ordine della checklist
  const linked = useMemo(() => {
    const byCode: Record<string, { category: WSTGCategory; tests: WSTGCategory['tests'] }[]> = {};
    for (const key of keys) {
      const code = top10Code(key);
      byCode[code] = categories
        .map((category) => ({ category, tests: category.tests.filter((test) => TOP10_BY_TEST[test.id]?.includes(code)) }))
        .filter((group) => group.tests.length > 0);
    }
    return byCode;
  }, [keys, categories]);

  const coverage = (code: string) => {
    const tests = (linked[code] ?? []).flatMap((g) => g.tests);
    return { done: tests.filter((test) => getStatus(test.id) === 'done').length, total: tests.length };
  };

  const item = current ? entries[current] : null;
  const code = current ? top10Code(current) : '';
  const title = current ? current.split(' - ')[1] : '';
  const cov = coverage(code);
  // Provenienza nella Top 10:2021 (nessuna per A10, nuova)
  const origin = TOP10_2021.filter((o) => o.to === code);
  const isNew = TOP10_NEW_2025.includes(code);
  const moveText = (o: Origin2021) => {
    const n = rankChange(o);
    const move = n === null ? t('merged') : n > 0 ? t('movedUp', { n }) : n < 0 ? t('movedDown', { n: -n }) : t('samePosition');
    return n !== null && !isNew && o.name !== title ? `${move}, ${t('renamed')}` : move;
  };

  const sections: [Section, string][] = [
    ['overview', t('overview')],
    ['tests', `${t('wstgTests')} (${cov.total})`],
    ['prevention', t('prevention')],
    ['scenarios', t('scenarios')],
    ['cwes', `${t('mappedCwes')} (${item?.cwes.length ?? 0})`],
    ['references', t('references')],
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[1100px] w-[94vw] h-[86vh] p-0 gap-0 bg-background border-border overflow-hidden flex flex-col"
        closeLabel={t('close')}
        onCloseAutoFocus={(e) => {
          if (jumped.current) e.preventDefault();
          jumped.current = false;
          // Si riapre sempre sulla panoramica delle categorie: i chip Top 10 del dettaglio portano lì
          setView('categories');
          setSection('overview');
        }}
      >
        <Tabs.Root value={view} onValueChange={(v) => setView(v as typeof view)} className="flex-1 min-h-0 flex flex-col">
          <DialogHeader className="flex-row items-center gap-4 space-y-0 pl-5 pr-14 py-3 border-b border-border text-left">
            <div className="flex-1 min-w-0 space-y-0.5">
              <DialogTitle className="flex items-center gap-2 text-base">
                <Sparkles className="w-4 h-4 text-amber-400" />
                {t('mappingTitle')}
              </DialogTitle>
              <DialogDescription className="text-xs">{t(view === 'categories' ? 'mappingDesc' : 'historyDesc')}</DialogDescription>
            </div>
            <Tabs.List aria-label={t('mapping')} className="flex-shrink-0 flex rounded-md border border-amber-500/40 bg-amber-500/5 p-0.5">
              {(['categories', 'history'] as const).map((v) => (
                <Tabs.Trigger
                  key={v}
                  value={v}
                  className="focus-ring h-7 rounded px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-amber-500/10 hover:text-amber-200 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300"
                >
                  {v === 'categories' ? t('top10Categories') : '2021 → 2025'}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
          </DialogHeader>

          <Tabs.Content value="categories" className="flex-1 min-h-0 grid grid-cols-[minmax(250px,300px)_1fr] gap-3 p-3 focus-visible:outline-none data-[state=inactive]:hidden">
            {/* Elenco Top 10 con l'avanzamento dei test collegati */}
            <div role="listbox" aria-label="OWASP Top 10:2025" className="overflow-y-auto rounded-lg border border-border/70 bg-elevated/60 p-1.5 space-y-1">
              {keys.map((key) => {
                const c = coverage(top10Code(key));
                return (
                  <button
                    key={key}
                    role="option"
                    aria-selected={key === current}
                    onClick={() => onSelect(key)}
                    className="top10-item focus-ring w-full rounded-md px-3 py-2 text-left transition-colors"
                  >
                    <span className="flex items-baseline gap-2">
                      <span className="top10-text text-[13px] font-semibold tabular-nums">{top10Code(key)}</span>
                      <span className="flex-1 text-[13px] font-medium text-foreground leading-snug">{key.split(' - ')[1]}</span>
                    </span>
                    <span className="mt-1.5 flex items-center gap-2 pl-8">
                      <span className="flex-1 h-1 rounded-full bg-background/60 overflow-hidden" aria-hidden>
                        <span
                          className="block h-full bg-[hsl(var(--status-done))] transition-[width] duration-500"
                          style={{ width: c.total ? `${(c.done / c.total) * 100}%` : 0 }}
                        />
                      </span>
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        {c.done}/{c.total}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Dettaglio: in alto titolo e provenienza 2021; sotto i dati ufficiali OWASP in schede */}
            {item && (
              <div key={current} className="min-h-0 flex flex-col rounded-lg border border-border/70 bg-card/40 overflow-hidden animate-fade-in">
                <div className="flex-shrink-0 px-5 pt-4 pb-3 space-y-2.5 border-b border-border/50">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold leading-tight text-foreground">
                      <span className="top10-text">{code}:2025</span> – {title}
                    </h3>
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="focus-ring flex-shrink-0 inline-flex items-center gap-1 rounded text-[13px] text-cyan-400 hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {t('owaspPage')}
                    </a>
                  </div>
                  {(isNew || origin.length > 0) && (
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      {isNew && <span className={NEW_BADGE}>{t('newBadge')}</span>}
                      {origin.length > 0 && (
                        <span>
                          {t(isNew ? 'expands' : 'in2021')}{' '}
                          {origin.map((o, i) => (
                            <span key={o.code}>
                              {i > 0 && ' · '}
                              <span className="font-medium text-foreground/85">
                                {o.code}:2021 – {o.name}
                              </span>{' '}
                              ({moveText(o)})
                            </span>
                          ))}
                        </span>
                      )}
                    </p>
                  )}
                </div>

                <Tabs.Root value={section} onValueChange={(v) => setSection(v as Section)} className="flex-1 min-h-0 flex flex-col">
                  <Tabs.List aria-label={title} className="flex-shrink-0 flex flex-wrap gap-x-1 px-3 border-b border-border/50">
                    {sections.map(([s, label]) => (
                      <Tabs.Trigger
                        key={s}
                        value={s}
                        className="focus-ring -mb-px border-b-2 border-transparent px-2.5 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:border-[hsl(var(--top10))] data-[state=active]:text-foreground"
                      >
                        {label}
                      </Tabs.Trigger>
                    ))}
                  </Tabs.List>

                  <Tabs.Content value="overview" className={PANEL}>
                    {/* Tabella dei punteggi: etichette e numeri come nella pagina OWASP della lingua scelta */}
                    <dl aria-label={t('scoreTable')} className="mb-5 grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-x-4 gap-y-2 rounded-md border border-border/50 bg-background/30 px-3 py-2">
                      {item.stats.map(([label, value]) => (
                        <div key={label} className="min-w-0">
                          <dt className="text-[11px] leading-tight text-muted-foreground">{label}</dt>
                          <dd className="text-sm font-semibold tabular-nums text-foreground">{value}</dd>
                        </div>
                      ))}
                    </dl>
                    <div className={PROSE}>
                      <h3>{t('background')}</h3>
                      <div dangerouslySetInnerHTML={{ __html: item.background }} />
                      <h3>{t('top10Description')}</h3>
                      <div dangerouslySetInnerHTML={{ __html: item.description }} />
                    </div>
                  </Tabs.Content>

                  <Tabs.Content value="tests" className={PANEL}>
                    <p className="mb-3 text-xs text-muted-foreground tabular-nums">{t('coverage', { done: cov.done, total: cov.total })}</p>
                    <div className="space-y-3">
                      {(linked[code] ?? []).map(({ category, tests }) => (
                        <div key={category.id}>
                          <p className="text-xs font-semibold text-cyan-400 mb-1">{category.name}</p>
                          <ul className="space-y-0.5">
                            {tests.map((test) => (
                              <li key={test.id}>
                                <button
                                  onClick={() => {
                                    jumped.current = true;
                                    onGoToTest(test.id);
                                  }}
                                  className="focus-ring w-full flex items-baseline gap-2 rounded-md px-2 py-1.5 text-left hover:bg-foreground/10 transition-colors"
                                >
                                  <StatusIcon status={getStatus(test.id)} className="w-3.5 h-3.5 self-center flex-shrink-0" />
                                  <span className="w-[96px] flex-shrink-0 whitespace-nowrap text-[11px] font-medium tabular-nums text-muted-foreground/80">{test.id}</span>
                                  <span className="flex-1 text-[13px] text-foreground">{test.name}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </Tabs.Content>

                  {(['prevention', 'scenarios', 'references'] as const).map((s) => (
                    <Tabs.Content key={s} value={s} className={PANEL}>
                      <div className={PROSE} dangerouslySetInnerHTML={{ __html: item[s] }} />
                    </Tabs.Content>
                  ))}

                  <Tabs.Content value="cwes" className={PANEL}>
                    <ul className="space-y-0.5">
                      {item.cwes.map((cwe) => (
                        <li key={cwe.id}>
                          <a
                            href={cwe.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="focus-ring flex items-baseline gap-3 rounded-md px-2 py-1 text-[13px] transition-colors hover:bg-foreground/10"
                          >
                            <span className="top10-text w-[72px] flex-shrink-0 font-medium tabular-nums">{cwe.id}</span>
                            <span className="text-foreground/90">{cwe.name}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </Tabs.Content>
                </Tabs.Root>
              </div>
            )}
          </Tabs.Content>

          <Tabs.Content value="history" className="flex-1 min-h-0 overflow-y-auto p-5 animate-fade-in focus-visible:outline-none">
            <Top10History
              keys={keys}
              onOpen={(key) => {
                onSelect(key);
                setView('categories');
              }}
            />
          </Tabs.Content>
        </Tabs.Root>
      </DialogContent>
    </Dialog>
  );
};
