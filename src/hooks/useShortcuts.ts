import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';

declare global {
  interface Window {
    __ebsRecordingShortcut?: boolean;
  }
}

export const useShortcuts = () => {
  const navigate = useNavigate();
  const { settings, currentUser } = useStore();
  const shortcuts = settings.shortcuts || [];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Skip if we are recording a new shortcut in settings
      if (window.__ebsRecordingShortcut) return;

      const target = e.target as HTMLElement;
      if (!target) return;

      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable;

      // 2. Find matching shortcut
      const foundShortcut = shortcuts.find(s => {
        const parts = s.key.split('+');
        const mainKey = parts.pop()?.trim().toUpperCase();
        
        const needsCtrl  = parts.some(p => p.trim().toUpperCase() === 'CTRL');
        const needsShift = parts.some(p => p.trim().toUpperCase() === 'SHIFT');
        const needsAlt   = parts.some(p => p.trim().toUpperCase() === 'ALT');
        const needsMeta  = parts.some(p => p.trim().toUpperCase() === 'META');

        const matchModifiers = 
          e.ctrlKey  === needsCtrl  &&
          e.shiftKey === needsShift &&
          e.altKey   === needsAlt   &&
          e.metaKey  === needsMeta;

        let eventKey = e.key.toUpperCase();
        if (e.key === ' ') eventKey = 'SPACE';
        
        const normalizedMainKey = mainKey === 'SPACE' || mainKey === ' ' ? 'SPACE' : mainKey;
        
        return matchModifiers && eventKey === normalizedMainKey;
      });

      if (!foundShortcut) return;

      // 3. Smart Input Bypass
      // If we are in an input, ONLY allow:
      // - F-Keys (F1, F2, etc)
      // - Combinations with Modifiers (Ctrl, Alt, Meta)
      // Block single char shortcuts like 'H' or '1' while typing.
      if (isInput) {
        const isFKey = /^F\d+$/.test(e.key);
        const hasModifier = e.ctrlKey || e.altKey || e.metaKey;
        // Exception: Allow shortcuts with Shift if they aren't single-character typing keys
        const isComplexShift = e.shiftKey && e.key.length > 1; 

        if (!isFKey && !hasModifier && !isComplexShift) return;
      }

      // 4. Role & Visibility Checks
      const label = foundShortcut.label;
      const hiddenMenus = settings.hiddenMenus || [];
      const isDeveloper = currentUser?.role === 'Developer';
      const isAdmin     = currentUser?.role === 'Admin';

      if (!isDeveloper && hiddenMenus.includes(label)) return;
      if (label === 'Settings' && !isAdmin && !isDeveloper) return;

      // 5. Execute Navigation
      e.preventDefault();
      e.stopPropagation(); // Prevent the key from reaching specific component listeners

      const path = foundShortcut.targetPath + (foundShortcut.searchParams ? '?' + foundShortcut.searchParams : '');
      navigate(path);
    };

    // Use Capture phase (true) to ensure we catch the key before other elements swallow it
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [navigate, shortcuts, settings.hiddenMenus, currentUser?.role]);
};
