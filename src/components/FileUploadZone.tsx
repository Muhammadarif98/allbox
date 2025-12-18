import { useCallback, useState } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFileSize, MAX_FILE_SIZE } from '@/lib/fileUtils';
import { Progress } from '@/components/ui/progress';

interface FileUploadZoneProps {
  onUpload: (files: File[]) => Promise<void>;
  disabled?: boolean;
}

export function FileUploadZone({ onUpload, disabled }: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || disabled) return;
    
    setError(null);
    const validFiles: File[] = [];
    
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`${file.name} exceeds 100MB limit`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    setUploading(true);
    setProgress(0);

    // Simulate progress while uploading
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 200);

    try {
      await onUpload(validFiles);
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
      }, 500);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  }, [disabled]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    e.target.value = ''; // Reset for same file selection
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-8 transition-all duration-200",
          "flex flex-col items-center justify-center gap-3 text-center",
          isDragging 
            ? "border-accent bg-accent/10" 
            : "border-border hover:border-secondary/50 hover:bg-card/50",
          (disabled || uploading) && "opacity-50 pointer-events-none"
        )}
      >
        {uploading ? (
          <Loader2 className="w-10 h-10 text-accent animate-spin" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-secondary/20 flex items-center justify-center">
            <Upload className="w-7 h-7 text-secondary" />
          </div>
        )}

        <div>
          <p className="font-display font-semibold text-foreground">
            {uploading ? 'Uploading...' : isDragging ? 'Drop files here' : 'Drag & drop files'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            or click to browse • Max {formatFileSize(MAX_FILE_SIZE)} per file
          </p>
        </div>

        <input
          type="file"
          multiple
          onChange={handleFileSelect}
          disabled={disabled || uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>

      {/* Progress Bar */}
      {uploading && (
        <div className="space-y-1">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">{progress}%</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
          <X className="w-4 h-4 text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
}
