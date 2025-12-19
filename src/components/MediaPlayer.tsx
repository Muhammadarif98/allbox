import { X, Download, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';

interface MediaPlayerProps {
  url: string;
  fileName: string;
  type: 'image' | 'video' | 'audio';
  onClose: () => void;
}

export function MediaPlayer({ url, fileName, type, onClose }: MediaPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [downloading, setDownloading] = useState(false);
  
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === ' ' && (type === 'video' || type === 'audio')) {
        e.preventDefault();
        togglePlay();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, type]);

  const togglePlay = () => {
    if (!mediaRef.current) return;
    if (isPlaying) {
      mediaRef.current.pause();
    } else {
      mediaRef.current.play();
    }
  };

  const handleTimeUpdate = () => {
    if (mediaRef.current) {
      setCurrentTime(mediaRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (mediaRef.current) {
      setDuration(mediaRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (mediaRef.current) {
      mediaRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const toggleMute = () => {
    if (mediaRef.current) {
      mediaRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      console.error('Download failed');
    } finally {
      setDownloading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="relative max-w-4xl max-h-full w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white/70 hover:text-white transition-colors"
        >
          <X className="w-8 h-8" />
        </button>

        {/* Media content */}
        <div className="bg-black rounded-xl overflow-hidden">
          {type === 'image' && (
            <img 
              src={url} 
              alt={fileName} 
              className="max-h-[80vh] w-auto mx-auto object-contain"
            />
          )}

          {type === 'video' && (
            <video
              ref={mediaRef as React.RefObject<HTMLVideoElement>}
              src={url}
              className="max-h-[80vh] w-full object-contain"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              onClick={togglePlay}
            />
          )}

          {type === 'audio' && (
            <div className="p-8 flex flex-col items-center gap-6">
              <audio
                ref={mediaRef as React.RefObject<HTMLAudioElement>}
                src={url}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
              />
              
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-secondary/40 to-accent/40 flex items-center justify-center">
                <button onClick={togglePlay}>
                  {isPlaying ? (
                    <Pause className="w-12 h-12 text-white" />
                  ) : (
                    <Play className="w-12 h-12 text-white ml-1" />
                  )}
                </button>
              </div>
              
              <p className="text-white font-medium text-center truncate max-w-full">
                {fileName}
              </p>
            </div>
          )}

          {/* Controls for video/audio */}
          {(type === 'video' || type === 'audio') && (
            <div className="p-4 bg-black/50 space-y-3">
              {/* Progress bar */}
              <input
                type="range"
                min={0}
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-accent"
              />
              
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-4">
                  <button onClick={togglePlay} className="hover:text-accent transition-colors">
                    {isPlaying ? (
                      <Pause className="w-6 h-6" />
                    ) : (
                      <Play className="w-6 h-6" />
                    )}
                  </button>
                  <button onClick={toggleMute} className="hover:text-accent transition-colors">
                    {isMuted ? (
                      <VolumeX className="w-6 h-6" />
                    ) : (
                      <Volume2 className="w-6 h-6" />
                    )}
                  </button>
                  <span className="text-sm tabular-nums">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>
                
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="hover:text-accent transition-colors"
                >
                  <Download className="w-6 h-6" />
                </button>
              </div>
            </div>
          )}

          {/* Download for image */}
          {type === 'image' && (
            <div className="p-4 bg-black/50 flex justify-between items-center">
              <p className="text-white/70 text-sm truncate">{fileName}</p>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="text-white/70 hover:text-white transition-colors"
              >
                <Download className="w-6 h-6" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
