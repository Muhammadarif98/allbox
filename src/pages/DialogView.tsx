import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileCard } from '@/components/FileCard';
import { FileUploadZone } from '@/components/FileUploadZone';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { supabase } from '@/integrations/supabase/client';
import { getDeviceId, hasDialogAccess, getDeviceLabelForDialog, addStoredDialog } from '@/lib/device';
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

export default function DialogView() {
  const { dialogId } = useParams<{ dialogId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [deviceCount, setDeviceCount] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deviceLabel, setDeviceLabel] = useState<string>('');
  const [, setRefresh] = useState(0);

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
      supabase.removeChannel(devicesChannel);
    };
  }, [dialogId, navigate]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadFiles(), loadDeviceCount()]);
    setLoading(false);
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
    
    for (const file of uploadedFiles) {
      const filePath = `${dialogId}/${Date.now()}-${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('dialog-files')
        .upload(filePath, file);
      
      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error(t('uploadFailed', { name: file.name }));
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
        console.error('DB error:', dbError);
        toast.error(t('saveFailed', { name: file.name }));
        continue;
      }
    }
    
    addStoredDialog(dialogId, currentLabel);
    toast.success(t('uploadSuccess', { n: uploadedFiles.length }));
  };

  const handleDelete = async (fileId: string) => {
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

  const getFileUrl = (filePath: string) => {
    const { data } = supabase.storage
      .from('dialog-files')
      .getPublicUrl(filePath);
    return data.publicUrl;
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
                {t('dialog')} #{dialogId?.slice(0, 8)}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t('youAre')} {deviceLabel}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-card px-4 py-2 rounded-lg">
            <Users className="w-4 h-4" />
            <span>{deviceCount} {t('devices')}</span>
          </div>
        </header>

        {/* Upload Zone */}
        <section className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <FileUploadZone onUpload={handleUpload} />
        </section>

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
                  onDelete={handleDelete}
                  isDeleting={deletingId === file.id}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
