import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Loader2, Download, Edit3, Check, X, LogOut } from 'lucide-react';
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
import { getDeviceId, hasDialogAccess, getDeviceLabelForDialog, addStoredDialog, getDialogName, updateStoredDialogName, archiveDialog } from '@/lib/device';
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
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');

  const forceRefresh = useCallback(() => setRefresh(n => n + 1), []);

  useEffect(() => {
    if (!dialogId) { navigate('/'); return; }
    if (!hasDialogAccess(dialogId)) { toast.error(t('noAccess')); navigate('/'); return; }

    const label = getDeviceLabelForDialog(dialogId);
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
    const { data } = await supabase.from('dialogs').select('name').eq('id', dialogId).maybeSingle();
    if (data?.name) { setDialogName(data.name); setEditName(data.name); }
  };

  const loadFiles = async () => {
    if (!dialogId) return;
    const { data } = await supabase.from('files').select('*').eq('dialog_id', dialogId).order('uploaded_at', { ascending: false });
    setFiles(data || []);
  };

  const loadMessages = async () => {
    if (!dialogId) return;
    const { data } = await supabase.from('messages').select('*').eq('dialog_id', dialogId).order('created_at', { ascending: false });
    setMessages((data || []) as MessageRecord[]);
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
    const currentLabel = getDeviceLabelForDialog(dialogId) || 'Unknown';
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
    const currentLabel = getDeviceLabelForDialog(dialogId) || 'Unknown';
    const { error } = await supabase.from('messages').insert({ dialog_id: dialogId, device_label: currentLabel, content: text, message_type: 'text' });
    if (error) toast.error(t('messageFailed'));
  };

  const handleSendVoice = async (blob: Blob, duration: number) => {
    if (!dialogId) return;
    const currentLabel = getDeviceLabelForDialog(dialogId) || 'Unknown';
    const voicePath = `${dialogId}/voice-${Date.now()}.webm`;
    const { error: uploadError } = await supabase.storage.from('dialog-files').upload(voicePath, blob, { contentType: 'audio/webm' });
    if (uploadError) { toast.error(t('messageFailed')); return; }
    const { error: dbError } = await supabase.from('messages').insert({ dialog_id: dialogId, device_label: currentLabel, voice_path: voicePath, voice_duration: duration, message_type: 'voice' });
    if (dbError) { await supabase.storage.from('dialog-files').remove([voicePath]); toast.error(t('messageFailed')); }
  };

  const getFileUrl = (filePath: string) => supabase.storage.from('dialog-files').getPublicUrl(filePath).data.publicUrl;

  const handlePlayMedia = (url: string, fileName: string, type: 'image' | 'video' | 'audio') => setMediaPlayer({ url, fileName, type });

  const handleDownloadPassword = () => {
    const content = `${dialogName || t('dialog')}\n\n${t('dialogCode')}: ****\n\nDialog ID: ${dialogId?.slice(0, 8)}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${dialogName || 'dialog'}-info.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

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
        <header className="flex items-center justify-between gap-4 flex-wrap animate-fade-in">
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
            <Button onClick={handleDownloadPassword} variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />{t('downloadPassword')}</Button>
            <Button onClick={handleExitDialog} variant="outline" size="sm" className="text-destructive border-destructive/50 hover:bg-destructive/10"><LogOut className="w-4 h-4 mr-2" />{t('exitDialog')}</Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-card px-4 py-2 rounded-lg"><Users className="w-4 h-4" /><span>{deviceCount} {t('devices')}</span></div>
          </div>
        </header>

        <section className="animate-fade-in" style={{ animationDelay: '0.05s' }}><MessageInput onSendText={handleSendText} onSendVoice={handleSendVoice} /></section>
        <section className="animate-fade-in" style={{ animationDelay: '0.1s' }}><FileUploadZone onUpload={handleUpload} /></section>

        {messages.length > 0 && (
          <section className="space-y-4 animate-fade-in" style={{ animationDelay: '0.15s' }}>
            <h2 className="text-xl font-display font-semibold text-foreground">{t('messages')} ({messages.length})</h2>
            <div className="space-y-3">{messages.map((message) => <MessageCard key={message.id} id={message.id} content={message.content || undefined} voiceUrl={message.voice_path ? getFileUrl(message.voice_path) : undefined} voiceDuration={message.voice_duration || undefined} messageType={message.message_type} deviceLabel={message.device_label} createdAt={message.created_at} onDelete={handleDeleteMessage} isDeleting={deletingId === message.id} />)}</div>
          </section>
        )}

        <section className="space-y-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <h2 className="text-xl font-display font-semibold text-foreground">{t('files')} ({files.length})</h2>
          {files.length === 0 ? <div className="text-center py-16 bg-card rounded-xl border border-border"><p className="text-muted-foreground">{t('noFiles')}</p></div> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">{files.map((file) => <FileCard key={file.id} id={file.id} fileName={file.file_name} fileSize={file.file_size} deviceLabel={file.device_label} uploadedAt={file.uploaded_at} fileUrl={getFileUrl(file.file_path)} onDelete={handleDeleteFile} onPlay={handlePlayMedia} isDeleting={deletingId === file.id} />)}</div>
          )}
        </section>
      </div>

      {mediaPlayer && <MediaPlayer url={mediaPlayer.url} fileName={mediaPlayer.fileName} type={mediaPlayer.type} onClose={() => setMediaPlayer(null)} />}
    </div>
  );
}