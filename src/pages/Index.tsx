import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LogIn, Box, Loader2, Search, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DialogCard } from '@/components/DialogCard';
import { ArchivedDialogCard } from '@/components/ArchivedDialogCard';
import { EnterDialogModal } from '@/components/EnterDialogModal';
import { PasswordDisplay } from '@/components/PasswordDisplay';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { DeviceNameEditor } from '@/components/DeviceNameEditor';
import { supabase } from '@/integrations/supabase/client';
import { 
  getDeviceId, 
  getStoredDialogs, 
  getArchivedDialogs,
  addStoredDialog, 
  generatePassword, 
  hashPassword,
  initTheme,
  getDeviceName,
  updateStoredDialogName,
  savePasswordForDialog
} from '@/lib/device';
import { getRandomDialogName } from '@/lib/dialogNames';
import { t, getLanguage } from '@/lib/i18n';
import { toast } from 'sonner';

export default function Index() {
  const navigate = useNavigate();
  const [enterModalOpen, setEnterModalOpen] = useState(false);
  const [creatingDialog, setCreatingDialog] = useState(false);
  const [showPasswordScreen, setShowPasswordScreen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [newDialogId, setNewDialogId] = useState('');
  const [newDialogName, setNewDialogName] = useState('');
  const [, setRefresh] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [dialogActivities, setDialogActivities] = useState<Record<string, string>>({});
  const [dialogNames, setDialogNames] = useState<Record<string, string>>({});
  
  const storedDialogs = getStoredDialogs();
  const archivedDialogs = getArchivedDialogs();

  const forceRefresh = useCallback(() => setRefresh(n => n + 1), []);

  // Initialize theme
  useEffect(() => {
    initTheme();
  }, []);

  // Fetch last activity and names for all dialogs
  useEffect(() => {
    const fetchDialogData = async () => {
      const dialogIds = storedDialogs.map(d => d.dialogId);
      if (dialogIds.length === 0) return;

      const { data } = await supabase
        .from('dialogs')
        .select('id, last_activity_at, name')
        .in('id', dialogIds);

      if (data) {
        const activities: Record<string, string> = {};
        const names: Record<string, string> = {};
        data.forEach(d => {
          activities[d.id] = d.last_activity_at || d.id;
          names[d.id] = d.name;
          // Update local storage with latest name
          updateStoredDialogName(d.id, d.name);
        });
        setDialogActivities(activities);
        setDialogNames(names);
      }
    };

    fetchDialogData();

    // Subscribe to realtime updates for dialogs (activity and name changes)
    const dialogChannel = supabase
      .channel('index-dialogs-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'dialogs'
        },
        (payload) => {
          const newData = payload.new as { id: string; last_activity_at: string; name: string };
          setDialogActivities(prev => ({
            ...prev,
            [newData.id]: newData.last_activity_at
          }));
          setDialogNames(prev => ({
            ...prev,
            [newData.id]: newData.name
          }));
          // Update local storage
          updateStoredDialogName(newData.id, newData.name);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(dialogChannel);
    };
  }, [storedDialogs.length]);

  // Sort dialogs by last activity
  const sortedDialogs = useMemo(() => {
    return [...storedDialogs].sort((a, b) => {
      const aActivity = dialogActivities[a.dialogId] || a.lastActivityAt || a.accessedAt;
      const bActivity = dialogActivities[b.dialogId] || b.lastActivityAt || b.accessedAt;
      return new Date(bActivity).getTime() - new Date(aActivity).getTime();
    });
  }, [storedDialogs, dialogActivities]);

  // Filter dialogs by search
  const filteredDialogs = useMemo(() => {
    if (!searchQuery.trim()) return sortedDialogs;
    const query = searchQuery.toLowerCase();
    return sortedDialogs.filter(d => {
      const name = dialogNames[d.dialogId] || d.name;
      return name?.toLowerCase().includes(query) || d.dialogId.toLowerCase().includes(query);
    });
  }, [sortedDialogs, searchQuery, dialogNames]);

  const filteredArchived = useMemo(() => {
    if (!searchQuery.trim()) return archivedDialogs;
    const query = searchQuery.toLowerCase();
    return archivedDialogs.filter(d => 
      d.name?.toLowerCase().includes(query) || 
      d.dialogId.toLowerCase().includes(query)
    );
  }, [archivedDialogs, searchQuery]);

  const handleCreateDialog = async () => {
    setCreatingDialog(true);
    
    try {
      const password = generatePassword();
      const passwordHash = await hashPassword(password);
      const dialogName = getRandomDialogName(getLanguage());
      
      // Store password in database for anyone to download
      const { data: dialog, error } = await supabase
        .from('dialogs')
        .insert({ password_hash: passwordHash, name: dialogName, password: password })
        .select()
        .single();
      
      if (error) throw error;
      
      const deviceId = getDeviceId();
      const { data: existingDevices } = await supabase
        .from('dialog_devices')
        .select('device_label')
        .eq('dialog_id', dialog.id);
      
      // Use custom device name if set
      const customName = getDeviceName();
      const deviceLabel = customName || `Device ${(existingDevices?.length || 0) + 1}`;
      
      await supabase
        .from('dialog_devices')
        .insert({
          dialog_id: dialog.id,
          device_id: deviceId,
          device_label: deviceLabel
        });
      
      addStoredDialog(dialog.id, deviceLabel, dialogName);
      
      // Save password for later download
      savePasswordForDialog(dialog.id, password);
      
      setNewPassword(password);
      setNewDialogId(dialog.id);
      setNewDialogName(dialogName);
      setShowPasswordScreen(true);
    } catch (err) {
      console.error('Error creating dialog:', err);
      toast.error(t('createFailed'));
    } finally {
      setCreatingDialog(false);
    }
  };

  const handlePasswordConfirmed = () => {
    setShowPasswordScreen(false);
    navigate(`/dialog/${newDialogId}`);
  };

  const handleEnterDialog = async (password: string): Promise<boolean> => {
    try {
      const passwordHash = await hashPassword(password);
      
      const { data: dialogs, error } = await supabase
        .from('dialogs')
        .select('id, name')
        .eq('password_hash', passwordHash);
      
      if (error) throw error;
      if (!dialogs || dialogs.length === 0) return false;
      
      const dialog = dialogs[0];
      const deviceId = getDeviceId();
      
      const { data: existingDevice } = await supabase
        .from('dialog_devices')
        .select('device_label')
        .eq('dialog_id', dialog.id)
        .eq('device_id', deviceId)
        .maybeSingle();
      
      let deviceLabel: string;
      
      if (existingDevice) {
        deviceLabel = existingDevice.device_label;
      } else {
        const { data: allDevices } = await supabase
          .from('dialog_devices')
          .select('device_label')
          .eq('dialog_id', dialog.id);
        
        // Use custom device name if set
        const customName = getDeviceName();
        deviceLabel = customName || `Device ${(allDevices?.length || 0) + 1}`;
        
        await supabase
          .from('dialog_devices')
          .insert({
            dialog_id: dialog.id,
            device_id: deviceId,
            device_label: deviceLabel
          });
      }
      
      addStoredDialog(dialog.id, deviceLabel, dialog.name);
      
      // Save password for this device so it can download it later
      savePasswordForDialog(dialog.id, password);
      
      setEnterModalOpen(false);
      navigate(`/dialog/${dialog.id}`);
      return true;
    } catch (err) {
      console.error('Error entering dialog:', err);
      return false;
    }
  };

  const handleOpenDialog = (dialogId: string) => {
    navigate(`/dialog/${dialogId}`);
  };

  if (showPasswordScreen) {
    return (
      <>
        <div className="fixed top-4 left-4 z-50">
          <ThemeSwitcher onChange={forceRefresh} />
        </div>
        <div className="fixed top-4 right-4 z-50">
          <LanguageSwitcher onChange={forceRefresh} />
        </div>
        <PasswordDisplay 
          password={newPassword} 
          dialogName={newDialogName}
          onConfirm={handlePasswordConfirmed} 
        />
      </>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-10">
      <div className="fixed top-4 left-4 z-50">
        <ThemeSwitcher onChange={forceRefresh} />
      </div>
      <div className="fixed top-4 right-4 z-50">
        <LanguageSwitcher onChange={forceRefresh} />
      </div>
      
      <div className="max-w-2xl mx-auto space-y-10">
        {/* Header */}
        <header className="text-center space-y-4 animate-fade-in pt-12 sm:pt-0">
          <div className="inline-flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-accent/20 flex items-center justify-center">
              <Box className="w-8 h-8 text-accent" />
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground">
              {t('appName')}
            </h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            {t('tagline')}
          </p>
        </header>

        {/* Device Name Editor */}
        <div className="animate-fade-in" style={{ animationDelay: '0.05s' }}>
          <DeviceNameEditor onUpdate={forceRefresh} />
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <Button
            onClick={handleCreateDialog}
            disabled={creatingDialog}
            size="lg"
            className="h-20 bg-accent hover:bg-accent/90 text-accent-foreground font-display font-semibold text-lg rounded-xl shadow-soft hover:shadow-glow transition-all"
          >
            {creatingDialog ? (
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
            ) : (
              <Plus className="w-6 h-6 mr-2" />
            )}
            {t('createDialog')}
          </Button>

          <Button
            onClick={() => setEnterModalOpen(true)}
            size="lg"
            variant="outline"
            className="h-20 border-2 border-secondary bg-transparent hover:bg-secondary/20 text-secondary font-display font-semibold text-lg rounded-xl transition-all"
          >
            <LogIn className="w-6 h-6 mr-2" />
            {t('enterDialog')}
          </Button>
        </div>

        {/* Search */}
        {(storedDialogs.length > 0 || archivedDialogs.length > 0) && (
          <div className="animate-fade-in" style={{ animationDelay: '0.15s' }}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchDialogs')}
                className="pl-10"
              />
            </div>
          </div>
        )}

        {/* My Dialogs */}
        {filteredDialogs.length > 0 && (
          <section className="space-y-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <h2 className="text-xl font-display font-semibold text-foreground">
              {t('myDialogs')}
            </h2>
            <div className="space-y-3">
              {filteredDialogs.map((dialog) => (
                <DialogCard
                  key={dialog.dialogId}
                  dialogId={dialog.dialogId}
                  dialogName={dialogNames[dialog.dialogId] || dialog.name}
                  deviceLabel={dialog.deviceLabel}
                  accessedAt={dialogActivities[dialog.dialogId] || dialog.lastActivityAt || dialog.accessedAt}
                  onClick={() => handleOpenDialog(dialog.dialogId)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Archived Dialogs Toggle */}
        {archivedDialogs.length > 0 && (
          <section className="space-y-4 animate-fade-in" style={{ animationDelay: '0.25s' }}>
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="flex items-center gap-2 text-xl font-display font-semibold text-foreground hover:text-accent transition-colors"
            >
              <Archive className="w-5 h-5" />
              {t('archivedDialogs')} ({archivedDialogs.length})
            </button>
            
            {showArchived && (
              <div className="space-y-3">
                {filteredArchived.map((dialog) => (
                  <ArchivedDialogCard
                    key={dialog.dialogId}
                    dialogId={dialog.dialogId}
                    dialogName={dialog.name}
                    deviceLabel={dialog.deviceLabel}
                    accessedAt={dialog.accessedAt}
                    onRestore={forceRefresh}
                    onLeave={forceRefresh}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Footer */}
        <footer className="text-center text-sm text-muted-foreground/50 pt-8">
          <p>{t('footer')}</p>
        </footer>
      </div>

      <EnterDialogModal
        open={enterModalOpen}
        onOpenChange={setEnterModalOpen}
        onEnter={handleEnterDialog}
      />
    </div>
  );
}
