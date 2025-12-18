import { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { getLanguage, setLanguage, Language } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  onChange?: () => void;
}

export function LanguageSwitcher({ onChange }: LanguageSwitcherProps) {
  const [lang, setLang] = useState<Language>(getLanguage());

  const toggleLanguage = () => {
    const newLang = lang === 'en' ? 'ru' : 'en';
    setLanguage(newLang);
    setLang(newLang);
    onChange?.();
  };

  return (
    <button
      onClick={toggleLanguage}
      className={cn(
        "fixed top-4 right-4 z-50",
        "flex items-center gap-2 px-3 py-2 rounded-lg",
        "bg-card/80 backdrop-blur-sm border border-border",
        "text-sm text-foreground hover:bg-card hover:border-secondary/50",
        "transition-all duration-200"
      )}
    >
      <Globe className="w-4 h-4 text-muted-foreground" />
      <span className="font-medium">{lang === 'en' ? 'RU' : 'EN'}</span>
    </button>
  );
}
