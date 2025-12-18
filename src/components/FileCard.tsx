import { Download, Trash2, Loader2 } from 'lucide-react';
import { formatFileSize, formatDate, getFileIcon, isImageFile } from '@/lib/fileUtils';
import { cn } from '@/lib/utils';
import { useState } from 'react';

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
  const FileIcon = getFileIcon(fileName);
  const showThumbnail = isImageFile(fileName) && !imageError;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          {formatDate(uploadedAt)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex border-t border-border">
        <button
          onClick={handleDownload}
          className="flex-1 py-2.5 flex items-center justify-center gap-1.5 text-sm text-foreground hover:bg-secondary/20 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Download</span>
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
          <span>Delete</span>
        </button>
      </div>
    </div>
  );
}
