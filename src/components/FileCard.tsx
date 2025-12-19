import { Download, Trash2, Loader2, Play, Eye } from 'lucide-react';
import { formatFileSize, getFileIcon, isImageFile, isVideoFile, isAudioFile, getFileExtension } from '@/lib/fileUtils';
import { t, getLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';

interface FileCardProps {
  id: string;
  fileName: string;
  fileSize: number;
  deviceLabel: string;
  uploadedAt: string;
  fileUrl: string;
  onDelete: (id: string) => void;
  onPlay?: (url: string, fileName: string, type: 'image' | 'video' | 'audio') => void;
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

// Video thumbnail component
function VideoThumbnail({ fileUrl, fileName }: { fileUrl: string; fileName: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedData = () => {
      video.currentTime = 0.1; // Seek to get first frame
    };

    const handleSeeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          setThumbnail(canvas.toDataURL('image/jpeg', 0.8));
        }
      } catch (e) {
        setError(true);
      }
    };

    const handleError = () => setError(true);

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('error', handleError);
    };
  }, [fileUrl]);

  if (error) {
    return <FileIconWithExt fileName={fileName} />;
  }

  return (
    <>
      <video ref={videoRef} src={fileUrl} className="hidden" crossOrigin="anonymous" preload="metadata" />
      {thumbnail ? (
        <div className="relative w-full h-full">
          <img src={thumbnail} alt={fileName} className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Play className="w-10 h-10 text-white fill-white/80" />
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center w-full h-full">
          <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
        </div>
      )}
    </>
  );
}

// File icon with extension badge
function FileIconWithExt({ fileName }: { fileName: string }) {
  const FileIcon = getFileIcon(fileName);
  const ext = getFileExtension(fileName);
  
  return (
    <div className="relative flex flex-col items-center justify-center gap-2">
      <FileIcon className="w-14 h-14 text-muted-foreground/60" />
      <span className="px-2 py-0.5 bg-secondary/30 rounded text-xs font-medium text-secondary uppercase">
        {ext}
      </span>
    </div>
  );
}

// Audio preview with music icon
function AudioPreview({ fileName }: { fileName: string }) {
  return (
    <div className="relative flex flex-col items-center justify-center gap-2">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-secondary/40 to-accent/40 flex items-center justify-center">
        <Play className="w-8 h-8 text-secondary ml-1" />
      </div>
      <span className="px-2 py-0.5 bg-secondary/30 rounded text-xs font-medium text-secondary uppercase">
        {getFileExtension(fileName)}
      </span>
    </div>
  );
}

export function FileCard({ 
  id, 
  fileName, 
  fileSize, 
  deviceLabel, 
  uploadedAt, 
  fileUrl, 
  onDelete,
  onPlay,
  isDeleting 
}: FileCardProps) {
  const [imageError, setImageError] = useState(false);
  const [downloading, setDownloading] = useState(false);
  
  const isImage = isImageFile(fileName);
  const isVideo = isVideoFile(fileName);
  const isAudio = isAudioFile(fileName);
  const isPlayable = isImage || isVideo || isAudio;

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

  const handlePlay = () => {
    if (!onPlay) return;
    if (isImage) onPlay(fileUrl, fileName, 'image');
    else if (isVideo) onPlay(fileUrl, fileName, 'video');
    else if (isAudio) onPlay(fileUrl, fileName, 'audio');
  };

  const handleCardClick = () => {
    if (isPlayable && onPlay) {
      handlePlay();
    }
  };

  const renderPreview = () => {
    if (isImage && !imageError) {
      return (
        <img
          src={fileUrl}
          alt={fileName}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      );
    }
    
    if (isVideo) {
      return <VideoThumbnail fileUrl={fileUrl} fileName={fileName} />;
    }
    
    if (isAudio) {
      return <AudioPreview fileName={fileName} />;
    }
    
    return <FileIconWithExt fileName={fileName} />;
  };

  return (
    <div className={cn(
      "bg-card rounded-xl border border-border overflow-hidden",
      "transition-all duration-200 group hover:border-secondary/50",
      "shadow-soft hover:shadow-glow",
      isDeleting && "opacity-50 pointer-events-none"
    )}>
      {/* Thumbnail / Icon Area */}
      <div 
        className={cn(
          "aspect-square bg-muted flex items-center justify-center overflow-hidden relative",
          isPlayable && onPlay && "cursor-pointer"
        )}
        onClick={handleCardClick}
      >
        {renderPreview()}
        {isPlayable && onPlay && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <Eye className="w-8 h-8 text-white" />
          </div>
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
        {isPlayable && onPlay ? (
          <button
            onClick={handlePlay}
            className="flex-1 py-2.5 flex items-center justify-center gap-1.5 text-sm text-foreground hover:bg-secondary/20 transition-colors"
          >
            <Play className="w-4 h-4" />
            <span>{t('play')}</span>
          </button>
        ) : (
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
        )}
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
