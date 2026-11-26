import { useRef, type CSSProperties } from 'react';
import { Circle, CheckCircle, Clock } from 'lucide-react';
import { OwaspTop10Item, TestStatus } from '@/types/checklist';
import { cn } from '@/lib/utils';

export const STATUSES: TestStatus[] = ['pending', 'in-progress', 'done'];

export const statusLabelKey = { pending: 'pending', 'in-progress': 'inProgress', done: 'done' } as const;

export const StatusIcon = ({ status, className }: { status: TestStatus; className?: string }) => {
  const cls = cn('w-4 h-4', className);
  if (status === 'done') return <CheckCircle className={cn(cls, 'text-[hsl(var(--status-done))]')} />;
  if (status === 'in-progress') return <Clock className={cn(cls, 'text-[hsl(var(--status-progress))]')} />;
  return <Circle className={cn(cls, 'text-[hsl(var(--status-pending))]')} />;
};

// Icona che "rimbalza" solo quando lo stato cambia: niente animazioni all'avvio o ai re-render.
// La chiave = stato crea un nuovo elemento ad ogni cambio, così l'animazione riparte.
export const ChangingStatusIcon = ({ status, className }: { status: TestStatus; className?: string }) => {
  const last = useRef(status);
  const popped = useRef<TestStatus | null>(null);
  if (last.current !== status) {
    popped.current = status;
    last.current = status;
  }
  return <StatusIcon key={status} status={status} className={cn(popped.current === status && 'animate-status-pop', className)} />;
};

// Variabile CSS --lvl usata dalle classi .level-* in index.css
const LEVEL_VAR: Record<OwaspTop10Item['level'], string> = {
  critico: 'var(--level-critical)',
  alto: 'var(--level-high)',
  medio: 'var(--level-medium)',
  basso: 'var(--level-low)',
};

export const levelStyle = (level: OwaspTop10Item['level']) => ({ '--lvl': LEVEL_VAR[level] ?? 'var(--cyan)' }) as CSSProperties;
