import React, { useRef } from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';

export type ModalType = 'danger' | 'warning' | 'success' | 'info';

export interface MessageModalConfig {
  type?: ModalType;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  // Eseguiti dopo la chiusura. Esc chiude senza eseguire nulla.
  onConfirm?: () => void;
  onCancel?: () => void;
  showCancel?: boolean;
}

interface MessageModalProps {
  isOpen: boolean;
  config: MessageModalConfig;
  onClose: () => void;
}

const icons: Record<ModalType, React.ReactNode> = {
  danger: <AlertTriangle className="w-8 h-8" />,
  warning: <AlertTriangle className="w-8 h-8" />,
  success: <CheckCircle2 className="w-8 h-8" />,
  info: <Info className="w-8 h-8" />,
};

const iconColors: Record<ModalType, string> = {
  danger: 'text-red-500 bg-red-500/10',
  warning: 'text-amber-500 bg-amber-500/10',
  success: 'text-green-500 bg-green-500/10',
  info: 'text-cyan-500 bg-cyan-500/10',
};

const buttonColors: Record<ModalType, string> = {
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  warning: 'bg-amber-600 hover:bg-amber-700 text-white',
  success: 'bg-green-600 hover:bg-green-700 text-white',
  info: 'bg-cyan-600 hover:bg-cyan-700 text-white',
};

export const MessageModal: React.FC<MessageModalProps> = ({ isOpen, config, onClose }) => {
  const { t } = useLanguage();
  const { type = 'info', title = '', message = '', confirmText = t('ok'), cancelText = t('cancel'), onConfirm, onCancel, showCancel = false } = config;
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <AlertDialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0">
          <AlertDialog.Content
            className={cn(
              'relative w-[90%] max-w-md rounded-2xl p-8 bg-gradient-to-br from-card to-card/95 border border-border shadow-2xl',
              'data-[state=open]:animate-in data-[state=open]:zoom-in-95 data-[state=open]:fade-in-0',
              'data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=closed]:fade-out-0',
            )}
            onOpenAutoFocus={(e) => {
              // Nelle conferme distruttive il focus parte da "Annulla"
              e.preventDefault();
              (type === 'danger' && showCancel ? cancelRef : confirmRef).current?.focus();
            }}
          >
            <div className={cn('w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center', iconColors[type])}>
              {icons[type]}
            </div>

            <div className="text-center mb-8">
              <AlertDialog.Title className="text-xl font-bold text-foreground mb-3">{title}</AlertDialog.Title>
              <AlertDialog.Description className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {message}
              </AlertDialog.Description>
            </div>

            <div className="flex gap-3 justify-center">
              {showCancel && (
                <button
                  ref={cancelRef}
                  onClick={() => {
                    onClose();
                    onCancel?.();
                  }}
                  className="flex-1 min-w-[120px] px-4 py-2.5 rounded-lg bg-secondary text-foreground border border-border hover:bg-secondary/80 hover:border-primary/50 transition-colors font-medium text-sm"
                >
                  {cancelText}
                </button>
              )}
              <button
                ref={confirmRef}
                onClick={() => {
                  onClose();
                  onConfirm?.();
                }}
                className={cn('flex-1 min-w-[120px] px-4 py-2.5 rounded-lg transition-colors font-medium text-sm shadow-lg', buttonColors[type])}
              >
                {confirmText}
              </button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Overlay>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
};
