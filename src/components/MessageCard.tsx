import { Copy, Trash2, Loader2, Play, Pause, Download, Forward } from 'lucide-react';
import { t, getLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useState, useRef } from 'react';
import { toast } from 'sonner';

interface MessageCardProps {
  id: string;
  content?: string;
  voiceUrl?: string;
  voiceDuration?: number;
  messageType: 'text' | 'voice';
  deviceLabel: string;
  createdAt: string;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
  onForward?: (id: string) => void;
  forwardedFrom?: string;
  isCompact?: boolean;
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

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function MessageCard({ 
  id, 
  content,
  voiceUrl,
  voiceDuration,
  messageType,
  deviceLabel, 
  createdAt,
  onDelete,
  isDeleting,
  onForward,
  forwardedFrom,
  isCompact
}: MessageCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleCopy = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      toast.success(t('copied'));
    } catch {
      toast.error(t('copyFailed'));
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(Math.floor(audioRef.current.currentTime));
    }
  };

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleDownloadVoice = async () => {
    if (!voiceUrl) return;
    setDownloading(true);
    try {
      const response = await fetch(voiceUrl);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `voice-${id}.webm`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download error:', err);
      toast.error(t('downloadFailed'));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className={cn(
      "bg-card rounded-xl border border-border overflow-hidden",
      "transition-all duration-200 hover:border-secondary/50",
      "shadow-soft h-fit",
      isDeleting && "opacity-50 pointer-events-none"
    )}>
      <div className={cn("space-y-2", isCompact ? "p-3" : "p-4")}>
        {forwardedFrom && (
          <p className="text-xs text-accent italic mb-2">{t('forwardedFrom')}: {forwardedFrom}</p>
        )}
        {messageType === 'text' && content ? (
          <p className="text-foreground whitespace-pre-wrap break-words">
            {content}
          </p>
        ) : messageType === 'voice' && voiceUrl ? (
          <div className="flex items-center gap-3">
            <audio
              ref={audioRef}
              src={voiceUrl}
              onTimeUpdate={handleTimeUpdate}
              onPlay={handlePlay}
              onPause={handlePause}
              onEnded={handleEnded}
              preload="metadata"
            />
            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-accent/20 hover:bg-accent/30 flex items-center justify-center transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-accent" />
              ) : (
                <Play className="w-5 h-5 text-accent ml-0.5" />
              )}
            </button>
            <div className="flex-1">
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-accent transition-all duration-100"
                  style={{ width: `${(currentTime / (voiceDuration || 1)) * 100}%` }}
                />
              </div>
            </div>
            <span className="text-sm text-muted-foreground tabular-nums">
              {formatDuration(isPlaying ? currentTime : (voiceDuration || 0))}
            </span>
          </div>
        ) : null}
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{deviceLabel}</span>
          <span>{formatDateLocalized(createdAt)}</span>
        </div>
      </div>

      <div className="flex border-t border-border">
        {messageType === 'text' ? (
          <button
            onClick={handleCopy}
            className="flex-1 py-2.5 flex items-center justify-center gap-1.5 text-sm text-foreground hover:bg-secondary/20 transition-colors"
          >
            <Copy className="w-4 h-4" />
            <span>{t('copy')}</span>
          </button>
        ) : (
          <button
            onClick={handleDownloadVoice}
            disabled={downloading}
            className="flex-1 py-2.5 flex items-center justify-center gap-1.5 text-sm text-foreground hover:bg-secondary/20 transition-colors disabled:opacity-50"
          >
            {downloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>{t('download')}</span>
          </button>
        )}
        <div className="w-px bg-border" />
        {onForward && (
          <>
            <button
              onClick={() => onForward(id)}
              className="flex-1 py-2.5 flex items-center justify-center gap-1.5 text-sm text-accent hover:bg-accent/10 transition-colors"
            >
              <Forward className="w-4 h-4" />
              <span>{t('forward')}</span>
            </button>
            <div className="w-px bg-border" />
          </>
        )}
        <button
          onClick={() => onDelete(id)}
          disabled={isDeleting}
          className="flex-1 py-2.5 flex items-center justify-center gap-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
        >
          {isDeleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
          <span>{t('delete')}</span>
        </button>
      </div>
    </div>
  );
}