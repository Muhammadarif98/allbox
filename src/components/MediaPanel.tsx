import { useState, useMemo } from 'react';
import { X, Video, Music, Mic, FileText, ChevronRight, Image, ArrowUpDown, Calendar, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { FileCard } from './FileCard';
import { isImageFile, isVideoFile, isAudioFile } from '@/lib/fileUtils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FileRecord {
  id: string;
  file_name: string;
  file_size: number;
  file_path: string;
  device_label: string;
  uploaded_at: string;
}

interface MessageRecord {
  id: string;
  content: string | null;
  voice_path: string | null;
  voice_duration: number | null;
  message_type: 'text' | 'voice';
  device_label: string;
  created_at: string;
}

interface MediaPanelProps {
  open: boolean;
  onClose: () => void;
  files: FileRecord[];
  messages: MessageRecord[];
  getFileUrl: (path: string) => string;
  onDeleteFile: (id: string) => void;
  onPlayMedia: (url: string, fileName: string, type: 'image' | 'video' | 'audio') => void;
  onForwardFile?: (id: string) => void;
  deletingId: string | null;
}

type MediaTab = 'all' | 'photos' | 'video' | 'audio' | 'voice' | 'documents';
type SortOrder = 'newest' | 'oldest';
type DateFilter = 'all' | 'today' | 'week' | 'month';
type SizeFilter = 'all' | 'small' | 'medium' | 'large';

export function MediaPanel({
  open,
  onClose,
  files,
  messages,
  getFileUrl,
  onDeleteFile,
  onPlayMedia,
  onForwardFile,
  deletingId
}: MediaPanelProps) {
  const [activeTab, setActiveTab] = useState<MediaTab>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [sizeFilter, setSizeFilter] = useState<SizeFilter>('all');

  // Filter files by type
  const videoFiles = files.filter(f => isVideoFile(f.file_name));
  const audioFiles = files.filter(f => isAudioFile(f.file_name));
  const imageFiles = files.filter(f => isImageFile(f.file_name));
  const documentFiles = files.filter(f => 
    !isVideoFile(f.file_name) && 
    !isAudioFile(f.file_name) && 
    !isImageFile(f.file_name)
  );
  const voiceMessages = messages.filter(m => m.message_type === 'voice' && m.voice_path);

  const getFilesByType = () => {
    switch (activeTab) {
      case 'photos':
        return imageFiles;
      case 'video':
        return videoFiles;
      case 'audio':
        return audioFiles;
      case 'documents':
        return documentFiles;
      default:
        return files;
    }
  };

  // Apply all filters and sorting
  const filteredFiles = useMemo(() => {
    let result = getFilesByType();
    
    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      result = result.filter(f => new Date(f.uploaded_at) >= filterDate);
    }
    
    // Size filter (small < 1MB, medium 1-100MB, large > 100MB)
    if (sizeFilter !== 'all') {
      switch (sizeFilter) {
        case 'small':
          result = result.filter(f => f.file_size < 1024 * 1024);
          break;
        case 'medium':
          result = result.filter(f => f.file_size >= 1024 * 1024 && f.file_size < 100 * 1024 * 1024);
          break;
        case 'large':
          result = result.filter(f => f.file_size >= 100 * 1024 * 1024);
          break;
      }
    }
    
    // Sort
    result = [...result].sort((a, b) => {
      const dateA = new Date(a.uploaded_at).getTime();
      const dateB = new Date(b.uploaded_at).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
    
    return result;
  }, [files, activeTab, dateFilter, sizeFilter, sortOrder, imageFiles, videoFiles, audioFiles, documentFiles]);

  const filteredVoice = useMemo(() => {
    let result = activeTab === 'voice' || activeTab === 'all' ? voiceMessages : [];
    
    // Date filter for voice
    if (dateFilter !== 'all' && result.length > 0) {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      result = result.filter(m => new Date(m.created_at) >= filterDate);
    }
    
    // Sort voice messages
    result = [...result].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
    
    return result;
  }, [messages, activeTab, dateFilter, sortOrder, voiceMessages]);

  const tabs: { id: MediaTab; label: string; icon: typeof Video; count: number }[] = [
    { id: 'all', label: t('allMedia'), icon: FileText, count: files.length },
    { id: 'photos', label: t('photoFiles'), icon: Image, count: imageFiles.length },
    { id: 'video', label: t('videoFiles'), icon: Video, count: videoFiles.length },
    { id: 'audio', label: t('audioFiles'), icon: Music, count: audioFiles.length },
    { id: 'voice', label: t('voiceMessages'), icon: Mic, count: voiceMessages.length },
    { id: 'documents', label: t('documents'), icon: FileText, count: documentFiles.length },
  ];

  return (
    <>
      {/* Overlay */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/50 z-40 transition-opacity",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
      
      {/* Panel */}
      <div 
        className={cn(
          "fixed top-0 right-0 h-full w-full sm:w-[450px] md:w-[500px] bg-background z-50",
          "transform transition-transform duration-300 ease-out",
          "flex flex-col shadow-2xl border-l border-border",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-display font-bold text-foreground">{t('mediaFiles')}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 p-4 border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-accent text-accent-foreground"
                  : "bg-secondary/30 text-muted-foreground hover:bg-secondary/50"
              )}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-background/50 text-xs">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 p-4 border-b border-border">
          {/* Sort Order */}
          <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as SortOrder)}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <ArrowUpDown className="w-3 h-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t('sortNewest')}</SelectItem>
              <SelectItem value="oldest">{t('sortOldest')}</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Filter */}
          <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <Calendar className="w-3 h-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filterAllTime')}</SelectItem>
              <SelectItem value="today">{t('filterToday')}</SelectItem>
              <SelectItem value="week">{t('filterWeek')}</SelectItem>
              <SelectItem value="month">{t('filterMonth')}</SelectItem>
            </SelectContent>
          </Select>

          {/* Size Filter */}
          {activeTab !== 'voice' && (
            <Select value={sizeFilter} onValueChange={(v) => setSizeFilter(v as SizeFilter)}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <HardDrive className="w-3 h-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filterAllSizes')}</SelectItem>
                <SelectItem value="small">{t('filterSmall')}</SelectItem>
                <SelectItem value="medium">{t('filterMedium')}</SelectItem>
                <SelectItem value="large">{t('filterLarge')}</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Files Grid */}
          {filteredFiles.length > 0 && activeTab !== 'voice' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredFiles.map((file) => (
                <FileCard
                  key={file.id}
                  id={file.id}
                  fileName={file.file_name}
                  fileSize={file.file_size}
                  deviceLabel={file.device_label}
                  uploadedAt={file.uploaded_at}
                  fileUrl={getFileUrl(file.file_path)}
                  filePath={file.file_path}
                  onDelete={onDeleteFile}
                  onPlay={onPlayMedia}
                  onForward={onForwardFile}
                  isDeleting={deletingId === file.id}
                />
              ))}
            </div>
          )}

          {/* Voice Messages */}
          {filteredVoice.length > 0 && (activeTab === 'voice' || activeTab === 'all') && (
            <div className={cn(activeTab === 'all' && filteredFiles.length > 0 && "mt-6")}>
              {activeTab === 'all' && (
                <h3 className="text-sm font-medium text-muted-foreground mb-3">{t('voiceMessages')}</h3>
              )}
              <div className="space-y-2">
                {filteredVoice.map((msg) => (
                  <VoiceMessageItem
                    key={msg.id}
                    voiceUrl={getFileUrl(msg.voice_path!)}
                    duration={msg.voice_duration || 0}
                    deviceLabel={msg.device_label}
                    createdAt={msg.created_at}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {filteredFiles.length === 0 && filteredVoice.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-muted-foreground">{t('noMedia')}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Simple voice message item for the panel
function VoiceMessageItem({ 
  voiceUrl, 
  duration, 
  deviceLabel, 
  createdAt 
}: { 
  voiceUrl: string; 
  duration: number; 
  deviceLabel: string; 
  createdAt: string; 
}) {
  const [isPlaying, setIsPlaying] = useState(false);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlay = () => {
    const audio = new Audio(voiceUrl);
    audio.onplay = () => setIsPlaying(true);
    audio.onended = () => setIsPlaying(false);
    audio.onpause = () => setIsPlaying(false);
    audio.play();
  };

  return (
    <div 
      onClick={handlePlay}
      className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border hover:border-accent/50 cursor-pointer transition-colors"
    >
      <div className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
        isPlaying ? "bg-accent" : "bg-accent/20"
      )}>
        <Mic className={cn("w-5 h-5", isPlaying ? "text-accent-foreground" : "text-accent")} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">{deviceLabel}</p>
        <p className="text-xs text-muted-foreground">{formatDuration(duration)}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </div>
  );
}
