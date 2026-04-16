import { Search } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  fullWidth?: boolean;
}

export default function SearchBar({ 
  value, 
  onChange, 
  placeholder = 'Search...', 
  className = '',
  fullWidth = false
}: SearchBarProps) {
  return (
    <div className={`relative ${fullWidth ? 'w-full' : ''}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-dark-500 pointer-events-none z-10" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`input pl-9 ${fullWidth ? 'w-full' : 'w-60'} ${className}`}
      />
    </div>
  );
}
