import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Loader2, Edit3, Check, X, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileCard } from '@/components/FileCard';
import { MessageCard } from '@/components/MessageCard';
import { FileUploadZone } from '@/components/FileUploadZone';
import { MessageInput } from '@/components/MessageInput';
import { MediaPlayer } from '@/components/MediaPlayer';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { supabase } from '@/integrations/supabase/client';
import { getDeviceId, hasDialogAccess, getDeviceLabelForDialog, addStoredDialog, getDialogName, updateStoredDialogName, archiveDialog, getDeviceName } from '@/lib/device';
import { t } from '@/lib/i18n';
import { toast } from 'sonner';

interface FileRecord {
  id: string;
  file_name: string;
  file_size: number;
  file_path: string;
  device_label: string;
  uploaded_at: string;
  type: 'file';
}

interface MessageRecord {
  id: string;
  content: string | null;
  voice_path: string | null;
  voice_duration: number | null;
  message_type: 'text' | 'voice';
  device_label: string;
  created_at: string;
  type: 'message';
}

type ContentItem = (FileRecord & { timestamp: string }) | (MessageRecord & { timestamp: string });

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
  const [, setRefresh] = useState(0);
  const [mediaPlayer, setMediaPlayer] = useState<MediaState | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');

  const forceRefresh = useCallback(() => setRefresh(n => n + 1), []);

  // Combined and sorted content (files + messages by timestamp, newest first)
  const sortedContent = useMemo<ContentItem[]>(() => {
    const filesWithType = files.map(f => ({ ...f, type: 'file' as const, timestamp: f.uploaded_at }));
    const messagesWithType = messages.map(m => ({ ...m, type: 'message' as const, timestamp: m.created_at }));
    const combined = [...filesWithType, ...messagesWithType];
    return combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [files, messages]);

  useEffect(() => {
    if (!dialogId) { navigate('/'); return; }
    if (!hasDialogAccess(dialogId)) { toast.error(t('noAccess')); navigate('/'); return; }

    // Get current device label - use custom name if available
    const customName = getDeviceName();
    const storedLabel = getDeviceLabelForDialog(dialogId);
    const label = customName || storedLabel;
    if (label) setDeviceLabel(label);
    
    const storedName = getDialogName(dialogId);
    if (storedName) setDialogName(storedName);

    loadData();
    
    const filesChannel = supabase.channel(`files-${dialogId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'files', filter: `dialog_id=eq.${dialogId}` }, () => loadFiles())
      .subscribe();

    const messagesChannel = supabase.channel(`messages-${dialogId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `dialog_id=eq.${dialogId}` }, () => loadMessages())
      .subscribe();

    const devicesChannel = supabase.channel(`devices-${dialogId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dialog_devices', filter: `dialog_id=eq.${dialogId}` }, () => loadDeviceCount())
      .subscribe();

    // Subscribe to dialog name changes
    const dialogChannel = supabase.channel(`dialog-name-${dialogId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'dialogs', filter: `id=eq.${dialogId}` }, (payload) => {
        const newData = payload.new as { name: string };
        if (newData.name) {
          setDialogName(newData.name);
          setEditName(newData.name);
          updateStoredDialogName(dialogId, newData.name);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(filesChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(devicesChannel);
      supabase.removeChannel(dialogChannel);
    };
  }, [dialogId, navigate]);

  // Update device label when custom name changes
  useEffect(() => {
    const customName = getDeviceName();
    if (customName) {
      setDeviceLabel(customName);
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadFiles(), loadMessages(), loadDeviceCount(), loadDialogName()]);
    setLoading(false);
  };

  const loadDialogName = async () => {
    if (!dialogId) return;
    const { data } = await supabase.from('dialogs').select('name').eq('id', dialogId).maybeSingle();
    if (data?.name) { setDialogName(data.name); setEditName(data.name); }
  };

  const loadFiles = async () => {
    if (!dialogId) return;
    const { data } = await supabase.from('files').select('*').eq('dialog_id', dialogId).order('uploaded_at', { ascending: false });
    setFiles((data || []).map(f => ({ ...f, type: 'file' as const })));
  };

  const loadMessages = async () => {
    if (!dialogId) return;
    const { data } = await supabase.from('messages').select('*').eq('dialog_id', dialogId).order('created_at', { ascending: false });
    setMessages((data || []).map(m => ({ ...m, type: 'message' as const })) as MessageRecord[]);
  };

  const loadDeviceCount = async () => {
    if (!dialogId) return;
    const { count } = await supabase.from('dialog_devices').select('*', { count: 'exact', head: true }).eq('dialog_id', dialogId);
    setDeviceCount(count || 0);
  };

  const handleSaveName = async () => {
    if (!dialogId || !editName.trim()) return;
    const { error } = await supabase.from('dialogs').update({ name: editName.trim() }).eq('id', dialogId);
    if (!error) {
      setDialogName(editName.trim());
      updateStoredDialogName(dialogId, editName.trim());
      toast.success(t('dialogRenamed'));
    }
    setIsEditingName(false);
  };

  const handleUpload = async (uploadedFiles: File[]) => {
    if (!dialogId) return;
    // Use custom device name if set
    const customName = getDeviceName();
    const storedLabel = getDeviceLabelForDialog(dialogId);
    const currentLabel = customName || storedLabel || 'Unknown';
    let successCount = 0;
    
    for (const file of uploadedFiles) {
      const sanitizedName = file.name.replace(/[^\w\s.-]/g, '_');
      const filePath = `${dialogId}/${Date.now()}-${sanitizedName}`;
      const { error: uploadError } = await supabase.storage.from('dialog-files').upload(filePath, file, { contentType: file.type || 'application/octet-stream' });
      if (uploadError) { toast.error(`${file.name}: ${uploadError.message}`); continue; }
      
      const { error: dbError } = await supabase.from('files').insert({ dialog_id: dialogId, file_name: file.name, file_size: file.size, file_path: filePath, device_label: currentLabel });
      if (dbError) { await supabase.storage.from('dialog-files').remove([filePath]); continue; }
      successCount++;
    }
    if (successCount > 0) { addStoredDialog(dialogId, currentLabel, dialogName); toast.success(t('uploadSuccess', { n: successCount })); }
  };

  const handleDeleteFile = async (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;
    setDeletingId(fileId);
    try {
      await supabase.storage.from('dialog-files').remove([file.file_path]);
      await supabase.from('files').delete().eq('id', fileId);
      toast.success(t('fileDeleted'));
    } catch { toast.error(t('deleteFailed')); }
    finally { setDeletingId(null); }
  };

  const handleDeleteMessage = async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;
    setDeletingId(messageId);
    try {
      if (message.voice_path) await supabase.storage.from('dialog-files').remove([message.voice_path]);
      await supabase.from('messages').delete().eq('id', messageId);
      toast.success(t('messageDeleted'));
    } catch { toast.error(t('deleteFailed')); }
    finally { setDeletingId(null); }
  };

  const handleSendText = async (text: string) => {
    if (!dialogId) return;
    // Use custom device name if set
    const customName = getDeviceName();
    const storedLabel = getDeviceLabelForDialog(dialogId);
    const currentLabel = customName || storedLabel || 'Unknown';
    const { error } = await supabase.from('messages').insert({ dialog_id: dialogId, device_label: currentLabel, content: text, message_type: 'text' });
    if (error) toast.error(t('messageFailed'));
  };

  const handleSendVoice = async (blob: Blob, duration: number) => {
    if (!dialogId) return;
    // Use custom device name if set
    const customName = getDeviceName();
    const storedLabel = getDeviceLabelForDialog(dialogId);
    const currentLabel = customName || storedLabel || 'Unknown';
    const voicePath = `${dialogId}/voice-${Date.now()}.webm`;
    const { error: uploadError } = await supabase.storage.from('dialog-files').upload(voicePath, blob, { contentType: 'audio/webm' });
    if (uploadError) { toast.error(t('messageFailed')); return; }
    const { error: dbError } = await supabase.from('messages').insert({ dialog_id: dialogId, device_label: currentLabel, voice_path: voicePath, voice_duration: duration, message_type: 'voice' });
    if (dbError) { await supabase.storage.from('dialog-files').remove([voicePath]); toast.error(t('messageFailed')); }
  };

  const getFileUrl = (filePath: string) => supabase.storage.from('dialog-files').getPublicUrl(filePath).data.publicUrl;

  const handlePlayMedia = (url: string, fileName: string, type: 'image' | 'video' | 'audio') => setMediaPlayer({ url, fileName, type });

  const handleExitDialog = () => {
    if (!dialogId) return;
    if (confirm(t('exitDialogConfirm'))) {
      archiveDialog(dialogId);
      toast.success(t('dialogExited'));
      navigate('/');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 text-accent animate-spin" /></div>;

  return (
    <div className="min-h-screen p-6 md:p-10">
      <div className="fixed top-4 right-4 flex items-center gap-2 z-50">
        <ThemeSwitcher onChange={forceRefresh} />
        <LanguageSwitcher onChange={forceRefresh} />
      </div>
      
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex items-center justify-between gap-4 flex-wrap animate-fade-in pt-12 sm:pt-0">
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate('/')} variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
            <div>
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="text-xl font-bold" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setIsEditingName(false); }} />
                  <Button size="icon" variant="ghost" onClick={handleSaveName}><Check className="w-4 h-4 text-green-500" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => setIsEditingName(false)}><X className="w-4 h-4" /></Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-display font-bold text-foreground">{dialogName || t('dialog')}</h1>
                  <Button size="icon" variant="ghost" onClick={() => { setEditName(dialogName); setIsEditingName(true); }}><Edit3 className="w-4 h-4" /></Button>
                </div>
              )}
              <p className="text-sm text-muted-foreground">{t('youAre')} {deviceLabel}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            <Button onClick={handleExitDialog} variant="outline" size="sm" className="text-destructive border-destructive/50 hover:bg-destructive/10"><LogOut className="w-4 h-4 mr-2" />{t('exitDialog')}</Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-card px-4 py-2 rounded-lg"><Users className="w-4 h-4" /><span>{deviceCount} {t('devices')}</span></div>
          </div>
        </header>

        <section className="animate-fade-in" style={{ animationDelay: '0.05s' }}><MessageInput onSendText={handleSendText} onSendVoice={handleSendVoice} /></section>
        <section className="animate-fade-in" style={{ animationDelay: '0.1s' }}><FileUploadZone onUpload={handleUpload} /></section>

        {/* Combined content - sorted by timestamp, newest first */}
        {sortedContent.length > 0 && (
          <section className="space-y-4 animate-fade-in" style={{ animationDelay: '0.15s' }}>
            <h2 className="text-xl font-display font-semibold text-foreground">
              {t('files')} ({sortedContent.length})
            </h2>
            <div className="space-y-3">
              {sortedContent.map((item) => {
                if (item.type === 'message') {
                  const msg = item as MessageRecord & { timestamp: string };
                  return (
                    <MessageCard
                      key={msg.id}
                      id={msg.id}
                      content={msg.content || undefined}
                      voiceUrl={msg.voice_path ? getFileUrl(msg.voice_path) : undefined}
                      voiceDuration={msg.voice_duration || undefined}
                      messageType={msg.message_type}
                      deviceLabel={msg.device_label}
                      createdAt={msg.created_at}
                      onDelete={handleDeleteMessage}
                      isDeleting={deletingId === msg.id}
                    />
                  );
                } else {
                  const file = item as FileRecord & { timestamp: string };
                  return (
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
                  );
                }
              })}
            </div>
          </section>
        )}

        {sortedContent.length === 0 && (
          <section className="space-y-4 animate-fade-in" style={{ animationDelay: '0.15s' }}>
            <h2 className="text-xl font-display font-semibold text-foreground">{t('files')}</h2>
            <div className="text-center py-16 bg-card rounded-xl border border-border">
              <p className="text-muted-foreground">{t('noFiles')}</p>
            </div>
          </section>
        )}
      </div>

      {mediaPlayer && <MediaPlayer url={mediaPlayer.url} fileName={mediaPlayer.fileName} type={mediaPlayer.type} onClose={() => setMediaPlayer(null)} />}
    </div>
  );
}
