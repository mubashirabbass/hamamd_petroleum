import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface Props {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
  isDesktop?: boolean;
  icon?: React.ElementType;
}

export default function Modal({ title, onClose, children, wide, isDesktop, icon: Icon }: Props) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Initial Focus - Only on Mount
    const firstInput = modalRef.current?.querySelector('input:not([disabled])') as HTMLElement;
    const firstElement = modalRef.current?.querySelector(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ) as HTMLElement;
    (firstInput || firstElement)?.focus();
  }, []);

  useEffect(() => {
    // 2. Capture and Trap Focus (Including Enter key navigation setup)
    const focusableElements = Array.from(modalRef.current?.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ) || []) as HTMLElement[];
    
    const firstElement = focusableElements[0];
    const lastElement  = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      
      // Enter key navigation for desktop mode
      if (isDesktop && e.key === 'Enter') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'SELECT') {
          if (target.getAttribute('type') === 'submit') return;
          
          e.preventDefault();
          const currentIndex = focusableElements.indexOf(target);
          if (currentIndex !== -1 && currentIndex < focusableElements.length - 1) {
            focusableElements[currentIndex + 1].focus();
          }
        }
      }

      if (e.key !== 'Tab') return;

      if (e.shiftKey) { // Shift + Tab
        if (document.activeElement === firstElement) { e.preventDefault(); lastElement?.focus(); }
      } else { // Tab
        if (document.activeElement === lastElement) { e.preventDefault(); firstElement?.focus(); }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isDesktop, children]); 

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        ref={modalRef}
        className={`modal-box ${wide ? 'max-w-3xl' : 'max-w-xl'} ${isDesktop ? 'rounded-[2rem]' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {isDesktop ? (
          <div className="desktop-modal-header">
            <h2 className="desktop-modal-title">
              {Icon && <Icon className="w-5 h-5 text-primary-400" />}
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 dark:text-dark-400 hover:text-slate-900 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-dark-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
