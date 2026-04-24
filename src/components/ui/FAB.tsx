import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface FABProps {
  icon: LucideIcon;
  label?: string;
  onClick: () => void;
  className?: string;
  isFixed?: boolean;
}

export default function FAB({ 
  icon: Icon, 
  label, 
  onClick, 
  className = '',
  isFixed = false
}: FABProps) {
  return (
    <div className={cn(
      "fab-container",
      isFixed && "fab-fixed"
    )}>
      {label && (
        <span className="fab-btn-label animate-fade-in">
          {label}
        </span>
      )}
      <button
        onClick={onClick}
        className={cn("fab-btn group", className)}
        aria-label={label || 'Action'}
      >
        <Icon className="w-6 h-6 transition-transform group-hover:scale-110 group-active:scale-95" />
      </button>
    </div>
  );
}
