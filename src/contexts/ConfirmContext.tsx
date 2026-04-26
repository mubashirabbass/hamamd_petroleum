import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import ConfirmDialog, { ConfirmKind } from '../components/ui/ConfirmDialog';

interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  kind?: ConfirmKind;
}

interface ConfirmContextType {
  confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [options, setOptions] = useState<ConfirmOptions>({});
  
  const resolver = useRef<((val: boolean) => void) | undefined>(undefined);

  const confirm = useCallback((msg: string, opts: ConfirmOptions = {}) => {
    setMessage(msg);
    setOptions(opts);
    setIsOpen(true);
    return new Promise<boolean>((res) => {
      resolver.current = res;
    });
  }, []);

  const handleConfirm = () => {
    setIsOpen(false);
    resolver.current?.(true);
  };

  const handleCancel = () => {
    setIsOpen(false);
    resolver.current?.(false);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmDialog
        isOpen={isOpen}
        title={options.title || 'Are you sure?'}
        message={message}
        confirmLabel={options.confirmLabel}
        cancelLabel={options.cancelLabel}
        kind={options.kind}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx.confirm;
}
