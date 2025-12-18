import { Folder, ChevronRight } from 'lucide-react';
import { formatDate } from '@/lib/fileUtils';
import { cn } from '@/lib/utils';

interface DialogCardProps {
  dialogId: string;
  deviceLabel: string;
  accessedAt: string;
  onClick: () => void;
}

export function DialogCard({ dialogId, deviceLabel, accessedAt, onClick }: DialogCardProps) {
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
          Dialog #{dialogId.slice(0, 8)}
        </p>
        <p className="text-sm text-muted-foreground">
          {deviceLabel} • {formatDate(accessedAt)}
        </p>
      </div>

      {/* Arrow */}
      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-accent transition-colors" />
    </button>
  );
}
