import React, { useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

export type ModalType = 'danger' | 'warning' | 'success' | 'info';

export interface MessageModalConfig {
  type?: ModalType;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | boolean | Promise<void>;
  onCancel?: () => void;
  showCancel?: boolean;
  closeOnOverlayClick?: boolean;
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
  info: <Info className="w-8 h-8" />
};

const iconColors: Record<ModalType, string> = {
  danger: 'text-red-500 bg-red-500/10',
  warning: 'text-amber-500 bg-amber-500/10',
  success: 'text-green-500 bg-green-500/10',
  info: 'text-cyan-500 bg-cyan-500/10'
};

const buttonColors: Record<ModalType, string> = {
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  warning: 'bg-amber-600 hover:bg-amber-700 text-white',
  success: 'bg-green-600 hover:bg-green-700 text-white',
  info: 'bg-cyan-600 hover:bg-cyan-700 text-white'
};

export const MessageModal: React.FC<MessageModalProps> = ({ isOpen, config, onClose }) => {
  const {
    type = 'info',
    title = 'Attenzione',
    message = '',
    confirmText = 'Conferma',
    cancelText = 'Annulla',
    onConfirm,
    onCancel,
    showCancel = true,
    closeOnOverlayClick = true
  } = config;

  const handleCancel = useCallback(() => {
    if (onCancel) onCancel();
    onClose();
  }, [onCancel, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleCancel]);

  const handleConfirm = async () => {
    if (onConfirm) {
      const result = onConfirm();
      // Se la funzione restituisce false, non chiudere
      if (result === false) return;
      // Se restituisce una Promise, aspetta che finisca
      if (result instanceof Promise) {
        await result;
        return; // Non chiudere automaticamente - la funzione async gestirà la chiusura
      }
    }
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) {
      handleCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-[10001] flex items-center justify-center',
        'bg-black/70 backdrop-blur-sm',
        'animate-in fade-in duration-300'
      )}
      onClick={handleOverlayClick}
      aria-hidden={!isOpen}
    >
      <div
        className={cn(
          'relative bg-gradient-to-br from-card to-card/95 border border-border',
          'rounded-2xl p-8 max-w-md w-[90%]',
          'shadow-2xl',
          'animate-in zoom-in-95 slide-in-from-bottom-4 duration-300'
        )}
      >
        {/* Icon */}
        <div
          className={cn(
            'w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center',
            'animate-in zoom-in duration-500',
            iconColors[type]
          )}
        >
          {icons[type]}
        </div>

        {/* Content */}
        <div className="text-center mb-8 animate-in slide-in-from-top-2 duration-500 delay-100">
          <h3 className="text-xl font-bold text-foreground mb-3">{title}</h3>
          <div
            className="text-sm text-muted-foreground leading-relaxed"
            dangerouslySetInnerHTML={{ __html: message }}
          />
        </div>

        {/* Actions */}
        <div className={cn(
          'flex gap-3 animate-in slide-in-from-bottom-2 duration-500 delay-200',
          showCancel ? 'justify-center' : 'justify-center'
        )}>
          {showCancel && (
            <button
              onClick={handleCancel}
              className={cn(
                'flex-1 min-w-[120px] px-4 py-2.5 rounded-lg',
                'bg-secondary text-foreground border border-border',
                'hover:bg-secondary/80 hover:border-primary/50',
                'transition-all duration-200',
                'font-medium text-sm'
              )}
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={handleConfirm}
            className={cn(
              'flex-1 min-w-[120px] px-4 py-2.5 rounded-lg',
              'transition-all duration-200',
              'font-medium text-sm shadow-lg',
              buttonColors[type]
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
