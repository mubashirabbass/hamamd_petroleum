import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const SHORTCUT_MAP: Record<string, string> = {
  'F1': '/',
  'F2': '/sale',
  'F3': '/purchase',
  'F4': '/ledger',
  'F5': '/expense',
  'F6': '/asset',
  'F7': '/liability',
  'F8': '/stock',
  'F9': '/customer',
  'F10': '/settings',
};

export const useShortcuts = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = SHORTCUT_MAP[e.key];
      if (target) {
        e.preventDefault();
        navigate(target);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);
};
