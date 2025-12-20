import { Folder, RotateCcw, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t, getLanguage } from '@/lib/i18n';
import { restoreFromArchive, removeFromArchive } from '@/lib/device';
import { toast } from 'sonner';

interface ArchivedDialogCardProps {
  dialogId: string;
  dialogName?: string;
  deviceLabel: string;
  accessedAt: string;
  onRestore: () => void;
  onLeave: () => void;
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

export function ArchivedDialogCard({ 
  dialogId, 
  dialogName, 
  deviceLabel, 
  accessedAt,
  onRestore,
  onLeave
}: ArchivedDialogCardProps) {
  const handleRestore = (e: React.MouseEvent) => {
    e.stopPropagation();
    restoreFromArchive(dialogId);
    toast.success(t('dialogRestored'));
    onRestore();
  };

  const handleLeave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(t('leaveDialogConfirm'))) {
      removeFromArchive(dialogId);
      toast.success(t('dialogLeft'));
      onLeave();
    }
  };

  return (
    <div
      className={cn(
        "w-full p-4 bg-card/50 rounded-xl",
        "border border-border/50",
        "transition-all duration-200",
        "flex items-center gap-4",
        "opacity-70"
      )}
    >
      {/* Icon */}
      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
        <Folder className="w-6 h-6 text-muted-foreground" />
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

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleRestore}
          className="p-2 rounded-lg bg-accent/20 hover:bg-accent/30 text-accent transition-colors"
          title={t('restoreDialog')}
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={handleLeave}
          className="p-2 rounded-lg bg-destructive/20 hover:bg-destructive/30 text-destructive transition-colors"
          title={t('leaveDialog')}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}