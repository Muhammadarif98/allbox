import { Download, Trash2, Loader2 } from 'lucide-react';
import { formatFileSize, getFileIcon, isImageFile } from '@/lib/fileUtils';
import { t, getLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { toast } from 'sonner';

interface FileCardProps {
  id: string;
  fileName: string;
  fileSize: number;
  deviceLabel: string;
  uploadedAt: string;
  fileUrl: string;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
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

export function FileCard({ 
  id, 
  fileName, 
  fileSize, 
  deviceLabel, 
  uploadedAt, 
  fileUrl, 
  onDelete,
  isDeleting 
}: FileCardProps) {
  const [imageError, setImageError] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const FileIcon = getFileIcon(fileName);
  const showThumbnail = isImageFile(fileName) && !imageError;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
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
      "transition-all duration-200 group hover:border-secondary/50",
      "shadow-soft hover:shadow-glow",
      isDeleting && "opacity-50 pointer-events-none"
    )}>
      {/* Thumbnail / Icon Area */}
      <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
        {showThumbnail ? (
          <img
            src={fileUrl}
            alt={fileName}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <FileIcon className="w-16 h-16 text-muted-foreground/50" />
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <p className="font-medium text-foreground text-sm truncate" title={fileName}>
          {fileName}
        </p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatFileSize(fileSize)}</span>
          <span>{deviceLabel}</span>
        </div>
        <p className="text-xs text-muted-foreground/70">
          {formatDateLocalized(uploadedAt)}
        </p>
      </div>

      <div className="flex border-t border-border">
        <button
          onClick={handleDownload}
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
        <div className="w-px bg-border" />
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
