import { Folder, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t, getLanguage } from '@/lib/i18n';

interface DialogCardProps {
  dialogId: string;
  dialogName?: string;
  deviceLabel: string;
  accessedAt: string;
  onClick: () => void;
}

function formatDateLocalized(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return t('justNow');
  if (diffMins < 60) return t('minutesAgo', { n: diffMins });
  if (diffHours < 24) return t('hoursAgo', { n: diffHours });
  if (diffDays < 7) return t('daysAgo', { n: diffDays });
  
  const lang = getLanguage();
  return date.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

export function DialogCard({ dialogId, dialogName, deviceLabel, accessedAt, onClick }: DialogCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-4 bg-card hover:bg-card/80 rounded-xl",
        "border border-border hover:border-secondary/50",
        "transition-all duration-200 group",
        "flex items-center gap-4 text-left",
        "shadow-soft hover:shadow-glow"
      )}
    >
      {/* Icon */}
      <div className="w-12 h-12 rounded-lg bg-secondary/20 flex items-center justify-center flex-shrink-0 group-hover:bg-secondary/30 transition-colors">
        <Folder className="w-6 h-6 text-secondary" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-display font-semibold text-foreground truncate">
          {dialogName || `Dialog #${dialogId.slice(0, 8)}`}
        </p>
        <p className="text-sm text-muted-foreground">
          {deviceLabel} • {formatDateLocalized(accessedAt)}
        </p>
      </div>

      {/* Arrow */}
      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-accent transition-colors" />
    </button>
  );
}
