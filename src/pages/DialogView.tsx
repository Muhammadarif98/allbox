import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileCard } from '@/components/FileCard';
import { MessageCard } from '@/components/MessageCard';
import { FileUploadZone } from '@/components/FileUploadZone';
import { MessageInput } from '@/components/MessageInput';
import { MediaPlayer } from '@/components/MediaPlayer';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { supabase } from '@/integrations/supabase/client';
import { getDeviceId, hasDialogAccess, getDeviceLabelForDialog, addStoredDialog, getDialogName } from '@/lib/device';
import { t } from '@/lib/i18n';
import { toast } from 'sonner';

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

interface MediaState {
  url: string;
  fileName: string;
  type: 'image' | 'video' | 'audio';
}

export default function DialogView() {
  const { dialogId } = useParams<{ dialogId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [deviceCount, setDeviceCount] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deviceLabel, setDeviceLabel] = useState<string>('');
  const [dialogName, setDialogName] = useState<string>('');
  const [dialogPassword, setDialogPassword] = useState<string>('');
  const [, setRefresh] = useState(0);
  const [mediaPlayer, setMediaPlayer] = useState<MediaState | null>(null);

  const forceRefresh = useCallback(() => setRefresh(n => n + 1), []);

  useEffect(() => {
    if (!dialogId) {
      navigate('/');
      return;
    }

    if (!hasDialogAccess(dialogId)) {
      toast.error(t('noAccess'));
      navigate('/');
      return;
    }

    const label = getDeviceLabelForDialog(dialogId);
    if (label) setDeviceLabel(label);

    const storedName = getDialogName(dialogId);
    if (storedName) setDialogName(storedName);

    loadData();
    
    const filesChannel = supabase
      .channel(`files-${dialogId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'files',
          filter: `dialog_id=eq.${dialogId}`
        },
        () => {
          loadFiles();
        }
      )
      .subscribe();

    const messagesChannel = supabase
      .channel(`messages-${dialogId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `dialog_id=eq.${dialogId}`
        },
        () => {
          loadMessages();
        }
      )
      .subscribe();

    const devicesChannel = supabase
      .channel(`devices-${dialogId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dialog_devices',
          filter: `dialog_id=eq.${dialogId}`
        },
        () => {
          loadDeviceCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(filesChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(devicesChannel);
    };
  }, [dialogId, navigate]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadFiles(), loadMessages(), loadDeviceCount(), loadDialogName()]);
    setLoading(false);
  };

  const loadDialogName = async () => {
    if (!dialogId) return;
    
    const { data } = await supabase
      .from('dialogs')
      .select('name')
      .eq('id', dialogId)
      .maybeSingle();
    
    if (data?.name) {
      setDialogName(data.name);
    }
  };

  const loadFiles = async () => {
    if (!dialogId) return;
    
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('dialog_id', dialogId)
      .order('uploaded_at', { ascending: false });
    
    if (error) {
      console.error('Error loading files:', error);
      return;
    }
    
    setFiles(data || []);
  };

  const loadMessages = async () => {
    if (!dialogId) return;
    
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('dialog_id', dialogId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error loading messages:', error);
      return;
    }
    
    setMessages((data || []) as MessageRecord[]);
  };

  const loadDeviceCount = async () => {
    if (!dialogId) return;
    
    const { count } = await supabase
      .from('dialog_devices')
      .select('*', { count: 'exact', head: true })
      .eq('dialog_id', dialogId);
    
    setDeviceCount(count || 0);
  };

  const handleUpload = async (uploadedFiles: File[]) => {
    if (!dialogId) return;
    
    const currentLabel = getDeviceLabelForDialog(dialogId) || 'Unknown';
    let successCount = 0;
    
    for (const file of uploadedFiles) {
      const sanitizedName = file.name.replace(/[^\w\s.-]/g, '_');
      const filePath = `${dialogId}/${Date.now()}-${sanitizedName}`;
      const contentType = file.type || 'application/octet-stream';
      
      const { error: uploadError } = await supabase.storage
        .from('dialog-files')
        .upload(filePath, file, {
          contentType: contentType,
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) {
        console.error('Upload error:', uploadError.message, uploadError);
        toast.error(`${file.name}: ${uploadError.message}`);
        continue;
      }
      
      const { error: dbError } = await supabase
        .from('files')
        .insert({
          dialog_id: dialogId,
          file_name: file.name,
          file_size: file.size,
          file_path: filePath,
          device_label: currentLabel
        });
      
      if (dbError) {
        console.error('DB error:', dbError.message, dbError);
        toast.error(t('saveFailed', { name: file.name }));
        await supabase.storage.from('dialog-files').remove([filePath]);
        continue;
      }
      
      successCount++;
    }
    
    if (successCount > 0) {
      addStoredDialog(dialogId, currentLabel, dialogName);
      toast.success(t('uploadSuccess', { n: successCount }));
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;
    
    setDeletingId(fileId);
    
    try {
      await supabase.storage
        .from('dialog-files')
        .remove([file.file_path]);
      
      await supabase
        .from('files')
        .delete()
        .eq('id', fileId);
      
      toast.success(t('fileDeleted'));
    } catch (err) {
      console.error('Delete error:', err);
      toast.error(t('deleteFailed'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;
    
    setDeletingId(messageId);
    
    try {
      if (message.voice_path) {
        await supabase.storage
          .from('dialog-files')
          .remove([message.voice_path]);
      }
      
      await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);
      
      toast.success(t('messageDeleted'));
    } catch (err) {
      console.error('Delete error:', err);
      toast.error(t('deleteFailed'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleSendText = async (text: string) => {
    if (!dialogId) return;
    
    const currentLabel = getDeviceLabelForDialog(dialogId) || 'Unknown';
    
    const { error } = await supabase
      .from('messages')
      .insert({
        dialog_id: dialogId,
        device_label: currentLabel,
        content: text,
        message_type: 'text'
      });
    
    if (error) {
      console.error('Send error:', error);
      toast.error(t('messageFailed'));
    }
  };

  const handleSendVoice = async (blob: Blob, duration: number) => {
    if (!dialogId) return;
    
    const currentLabel = getDeviceLabelForDialog(dialogId) || 'Unknown';
    const voicePath = `${dialogId}/voice-${Date.now()}.webm`;
    
    const { error: uploadError } = await supabase.storage
      .from('dialog-files')
      .upload(voicePath, blob, {
        contentType: 'audio/webm',
        cacheControl: '3600'
      });
    
    if (uploadError) {
      console.error('Voice upload error:', uploadError);
      toast.error(t('messageFailed'));
      return;
    }
    
    const { error: dbError } = await supabase
      .from('messages')
      .insert({
        dialog_id: dialogId,
        device_label: currentLabel,
        voice_path: voicePath,
        voice_duration: duration,
        message_type: 'voice'
      });
    
    if (dbError) {
      console.error('Voice save error:', dbError);
      await supabase.storage.from('dialog-files').remove([voicePath]);
      toast.error(t('messageFailed'));
    }
  };

  const getFileUrl = (filePath: string) => {
    const { data } = supabase.storage
      .from('dialog-files')
      .getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handlePlayMedia = (url: string, fileName: string, type: 'image' | 'video' | 'audio') => {
    setMediaPlayer({ url, fileName, type });
  };

  const handleDownloadPassword = () => {
    // Get password from localStorage (stored dialogs)
    const storedDialogs = JSON.parse(localStorage.getItem('allbox_dialogs') || '[]');
    const dialog = storedDialogs.find((d: any) => d.dialogId === dialogId);
    
    // Create file with dialog name and password info
    const content = `${dialogName || t('dialog')}\n\nDialog ID: ${dialogId}\n\nNote: Password was shown only once during dialog creation.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${dialogName || 'dialog'}-info.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-10">
      <LanguageSwitcher onChange={forceRefresh} />
      
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex items-center justify-between gap-4 flex-wrap animate-fade-in">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/')}
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">
                {dialogName || t('dialog')}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t('youAre')} {deviceLabel}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              onClick={handleDownloadPassword}
              variant="outline"
              size="sm"
              className="text-muted-foreground"
            >
              <Download className="w-4 h-4 mr-2" />
              {t('downloadPassword')}
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-card px-4 py-2 rounded-lg">
              <Users className="w-4 h-4" />
              <span>{deviceCount} {t('devices')}</span>
            </div>
          </div>
        </header>

        {/* Message Input */}
        <section className="animate-fade-in" style={{ animationDelay: '0.05s' }}>
          <MessageInput 
            onSendText={handleSendText}
            onSendVoice={handleSendVoice}
          />
        </section>

        {/* Upload Zone */}
        <section className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <FileUploadZone onUpload={handleUpload} />
        </section>

        {/* Messages */}
        {messages.length > 0 && (
          <section className="space-y-4 animate-fade-in" style={{ animationDelay: '0.15s' }}>
            <h2 className="text-xl font-display font-semibold text-foreground">
              {t('messages')} ({messages.length})
            </h2>
            
            <div className="space-y-3">
              {messages.map((message) => (
                <MessageCard
                  key={message.id}
                  id={message.id}
                  content={message.content || undefined}
                  voiceUrl={message.voice_path ? getFileUrl(message.voice_path) : undefined}
                  voiceDuration={message.voice_duration || undefined}
                  messageType={message.message_type}
                  deviceLabel={message.device_label}
                  createdAt={message.created_at}
                  onDelete={handleDeleteMessage}
                  isDeleting={deletingId === message.id}
                />
              ))}
            </div>
          </section>
        )}

        {/* Files Grid */}
        <section className="space-y-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <h2 className="text-xl font-display font-semibold text-foreground">
            {t('files')} ({files.length})
          </h2>
          
          {files.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-xl border border-border">
              <p className="text-muted-foreground">{t('noFiles')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {files.map((file) => (
                <FileCard
                  key={file.id}
                  id={file.id}
                  fileName={file.file_name}
                  fileSize={file.file_size}
                  deviceLabel={file.device_label}
                  uploadedAt={file.uploaded_at}
                  fileUrl={getFileUrl(file.file_path)}
                  onDelete={handleDeleteFile}
                  onPlay={handlePlayMedia}
                  isDeleting={deletingId === file.id}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Media Player Modal */}
      {mediaPlayer && (
        <MediaPlayer
          url={mediaPlayer.url}
          fileName={mediaPlayer.fileName}
          type={mediaPlayer.type}
          onClose={() => setMediaPlayer(null)}
        />
      )}
    </div>
  );
}
