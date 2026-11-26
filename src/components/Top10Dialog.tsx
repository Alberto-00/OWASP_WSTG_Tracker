import { useMemo, useRef } from 'react';
import { ExternalLink, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { OwaspTop10Item, TestStatus, WSTGCategory } from '@/types/checklist';
import { TOP10_BY_TEST, top10Code } from '@/lib/top10Mapping';
import { levelStyle, StatusIcon } from '@/components/status';
import { useLanguage } from '@/hooks/useLanguage';

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

export const Top10Dialog = ({ open, onOpenChange, entries, selectedKey, onSelect, categories, getStatus, onGoToTest }: Top10DialogProps) => {
  const { t } = useLanguage();
  const keys = useMemo(() => Object.keys(entries), [entries]);
  // Dopo un salto a un test il focus resta sulla riga del test, non torna al pulsante che ha aperto la finestra
  const jumped = useRef(false);
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
  const cov = coverage(code);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[1100px] w-[94vw] h-[86vh] p-0 gap-0 bg-background border-border overflow-hidden flex flex-col"
        closeLabel={t('close')}
        onCloseAutoFocus={(e) => {
          if (jumped.current) e.preventDefault();
          jumped.current = false;
        }}
      >
        <DialogHeader className="px-5 py-3 border-b border-border space-y-0.5 text-left">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4 text-amber-400" />
            {t('mappingTitle')}
          </DialogTitle>
          <DialogDescription className="text-xs">{t('mappingDesc')}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 grid grid-cols-[minmax(250px,300px)_1fr] gap-3 p-3">
          {/* Elenco Top 10 */}
          <div role="listbox" aria-label="OWASP Top 10:2025" className="overflow-y-auto rounded-lg border border-border/70 bg-elevated/60 p-1.5 space-y-1">
            {keys.map((key) => {
              const entry = entries[key];
              const c = coverage(top10Code(key));
              const selected = key === current;
              return (
                <button
                  key={key}
                  role="option"
                  aria-selected={selected}
                  onClick={() => onSelect(key)}
                  style={levelStyle(entry.level)}
                  className="level-item focus-ring w-full rounded-md px-3 py-2 text-left transition-colors"
                >
                  <span className="flex items-baseline gap-2">
                    <span className="level-text text-[13px] font-semibold tabular-nums">{top10Code(key)}</span>
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

          {/* Dettaglio */}
          {item && (
            <div key={current} className="overflow-y-auto rounded-lg border border-border/70 bg-card/40 p-5 animate-fade-in">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div style={levelStyle(item.level)} className="space-y-1.5">
                  <h3 className="level-text text-lg font-semibold leading-tight">
                    {code}:2025 – {current.split(' - ')[1]}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="level-chip rounded px-1.5 py-0.5 font-semibold">
                      {t('riskLevel')}: {t(item.level)}
                    </span>
                    <span className="text-muted-foreground tabular-nums">{t('coverage', { done: cov.done, total: cov.total })}</span>
                  </div>
                </div>
                {item.link && (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="focus-ring inline-flex items-center gap-1 rounded text-sm text-cyan-400 hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {t('owaspPage')}
                  </a>
                )}
              </div>

              <div className="top10-description mt-4 text-sm text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: item.description }} />

              <h4 className="mt-6 mb-2 text-sm font-semibold text-foreground">
                {t('linkedTests')} <span className="text-muted-foreground font-normal tabular-nums">({cov.total})</span>
              </h4>
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
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
