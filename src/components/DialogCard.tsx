import { Folder, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t, getLanguage } from '@/lib/i18n';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DialogCardProps {
  dialogId: string;
  dialogName?: string;
  deviceLabel: string;
  accessedAt: string;
  onClick: () => void;
}

// Helper to get last seen timestamp for a dialog
const LAST_SEEN_KEY = 'allbox_last_seen';

function getLastSeen(dialogId: string): string | null {
  try {
    const data = JSON.parse(localStorage.getItem(LAST_SEEN_KEY) || '{}');
    return data[dialogId] || null;
  } catch {
    return null;
  }
}

function setLastSeen(dialogId: string, timestamp: string) {
  try {
    const data = JSON.parse(localStorage.getItem(LAST_SEEN_KEY) || '{}');
    data[dialogId] = timestamp;
    localStorage.setItem(LAST_SEEN_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
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
  const [hasNewContent, setHasNewContent] = useState(false);

  useEffect(() => {
    // Check for new content
    const checkNewContent = async () => {
      const lastSeen = getLastSeen(dialogId);
      
      if (!lastSeen) {
        // First time - no notification
        setLastSeen(dialogId, new Date().toISOString());
        return;
      }

      // Check for files newer than last seen
      const { count: filesCount } = await supabase
        .from('files')
        .select('*', { count: 'exact', head: true })
        .eq('dialog_id', dialogId)
        .gt('uploaded_at', lastSeen);

      // Check for messages newer than last seen
      const { count: messagesCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('dialog_id', dialogId)
        .gt('created_at', lastSeen);

      setHasNewContent((filesCount || 0) > 0 || (messagesCount || 0) > 0);
    };

    checkNewContent();

    // Subscribe to realtime updates
    const filesChannel = supabase
      .channel(`dialog-card-files-${dialogId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'files',
          filter: `dialog_id=eq.${dialogId}`
        },
        () => {
          setHasNewContent(true);
        }
      )
      .subscribe();

    const messagesChannel = supabase
      .channel(`dialog-card-messages-${dialogId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `dialog_id=eq.${dialogId}`
        },
        () => {
          setHasNewContent(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(filesChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [dialogId]);

  const handleClick = () => {
    // Update last seen when opening dialog
    setLastSeen(dialogId, new Date().toISOString());
    setHasNewContent(false);
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full p-4 bg-card hover:bg-card/80 rounded-xl",
        "border border-border hover:border-secondary/50",
        "transition-all duration-200 group",
        "flex items-center gap-4 text-left",
        "shadow-soft hover:shadow-glow",
        "relative"
      )}
    >
      {/* New content indicator */}
      {hasNewContent && (
        <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-accent animate-pulse" />
      )}

      {/* Icon */}
      <div className="w-12 h-12 rounded-lg bg-secondary/20 flex items-center justify-center flex-shrink-0 group-hover:bg-secondary/30 transition-colors relative">
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
