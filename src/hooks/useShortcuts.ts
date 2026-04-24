import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';

export const useShortcuts = () => {
  const navigate = useNavigate();
  const shortcuts = useStore((s) => s.settings.shortcuts);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Find a matching shortcut
      const match = shortcuts.find(s => s.key === e.key);
      
      if (match) {
        e.preventDefault();
        const path = match.targetPath + (match.searchParams ? '?' + match.searchParams : '');
        navigate(path);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, shortcuts]);
};
