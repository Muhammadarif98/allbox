import { Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getTheme, setTheme, Theme } from '@/lib/device';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface ThemeSwitcherProps {
  onChange?: () => void;
}

export function ThemeSwitcher({ onChange }: ThemeSwitcherProps) {
  const [theme, setCurrentTheme] = useState<Theme>('dark');

  useEffect(() => {
    setCurrentTheme(getTheme());
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    setCurrentTheme(newTheme);
    onChange?.();
  };

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors",
        "bg-card hover:bg-muted border border-border",
        "text-sm text-foreground"
      )}
      title={theme === 'dark' ? t('lightTheme') : t('darkTheme')}
    >
      {theme === 'dark' ? (
        <>
          <Sun className="w-4 h-4" />
          <span className="hidden sm:inline">{t('lightTheme')}</span>
        </>
      ) : (
        <>
          <Moon className="w-4 h-4" />
          <span className="hidden sm:inline">{t('darkTheme')}</span>
        </>
      )}
    </button>
  );
}