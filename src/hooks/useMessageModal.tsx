import { useState, useCallback } from 'react';
import { MessageModalConfig } from '@/components/MessageModal';

export const useMessageModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<MessageModalConfig>({});

  const show = useCallback((modalConfig: MessageModalConfig) => {
    setConfig(modalConfig);
    setIsOpen(true);
  }, []);

  const hide = useCallback(() => {
    setIsOpen(false);
    setTimeout(() => setConfig({}), 300);
  }, []);

  const confirmDelete = useCallback((itemName: string, onConfirm?: () => void) => {
    show({
      type: 'danger',
      title: 'Conferma Eliminazione',
      message: `Sei sicuro di voler eliminare "<strong class="text-cyan-400">${itemName}</strong>"?<br>Questa azione non può essere annullata.`,
      confirmText: 'Elimina',
      cancelText: 'Annulla',
      onConfirm
    });
  }, [show]);

  const danger = useCallback((title: string, message: string, onConfirm?: () => void) => {
    show({
      type: 'danger',
      title,
      message,
      confirmText: onConfirm ? 'Conferma' : 'Ok',
      cancelText: 'Annulla',
      showCancel: !!onConfirm,
      closeOnOverlayClick: false,
      onConfirm
    });
  }, [show]);

  const warning = useCallback((title: string, message: string, onConfirm?: () => void) => {
    show({
      type: 'warning',
      title,
      message,
      confirmText: onConfirm ? 'Conferma' : 'Ok',
      cancelText: 'Annulla',
      showCancel: !!onConfirm,
      closeOnOverlayClick: false,
      onConfirm
    });
  }, [show]);

  const success = useCallback((title: string, message: string, onConfirm?: () => void) => {
    show({
      type: 'success',
      title,
      message,
      confirmText: 'Ok',
      showCancel: false,
      closeOnOverlayClick: false,
      onConfirm
    });
  }, [show]);

  const info = useCallback((title: string, message: string, onConfirm?: () => void) => {
    show({
      type: 'info',
      title,
      message,
      confirmText: 'Ok',
      showCancel: false,
      closeOnOverlayClick: false,
      onConfirm
    });
  }, [show]);

  return {
    isOpen,
    config,
    show,
    hide,
    confirmDelete,
    danger,
    warning,
    success,
    info
  };
};
