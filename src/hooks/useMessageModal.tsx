import { useState, useCallback } from 'react';
import { MessageModalConfig } from '@/components/MessageModal';

export const useMessageModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<MessageModalConfig>({});

  const show = useCallback((modalConfig: MessageModalConfig) => {
    setConfig(modalConfig);
    setIsOpen(true);
  }, []);

  // La config resta finché la modale non viene riaperta: niente reset ritardato che possa
  // cancellare la config di una modale aperta subito dopo (es. conferma in due passi).
  const hide = useCallback(() => setIsOpen(false), []);

  const danger = useCallback((title: string, message: string) => {
    show({ type: 'danger', title, message });
  }, [show]);

  return { isOpen, config, show, hide, danger };
};
