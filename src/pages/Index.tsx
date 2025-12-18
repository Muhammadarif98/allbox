import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LogIn, Box, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogCard } from '@/components/DialogCard';
import { EnterDialogModal } from '@/components/EnterDialogModal';
import { PasswordDisplay } from '@/components/PasswordDisplay';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { supabase } from '@/integrations/supabase/client';
import { 
  getDeviceId, 
  getStoredDialogs, 
  addStoredDialog, 
  generatePassword, 
  hashPassword 
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
  
  const storedDialogs = getStoredDialogs();

  const forceRefresh = useCallback(() => setRefresh(n => n + 1), []);

  const handleCreateDialog = async () => {
    setCreatingDialog(true);
    
    try {
      const password = generatePassword();
      const passwordHash = await hashPassword(password);
      const dialogName = getRandomDialogName(getLanguage());
      
      const { data: dialog, error } = await supabase
        .from('dialogs')
        .insert({ password_hash: passwordHash, name: dialogName })
        .select()
        .single();
      
      if (error) throw error;
      
      const deviceId = getDeviceId();
      const { data: existingDevices } = await supabase
        .from('dialog_devices')
        .select('device_label')
        .eq('dialog_id', dialog.id);
      
      const deviceLabel = `Device ${(existingDevices?.length || 0) + 1}`;
      
      await supabase
        .from('dialog_devices')
        .insert({
          dialog_id: dialog.id,
          device_id: deviceId,
          device_label: deviceLabel
        });
      
      addStoredDialog(dialog.id, deviceLabel, dialogName);
      
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
        
        deviceLabel = `Device ${(allDevices?.length || 0) + 1}`;
        
        await supabase
          .from('dialog_devices')
          .insert({
            dialog_id: dialog.id,
            device_id: deviceId,
            device_label: deviceLabel
          });
      }
      
      addStoredDialog(dialog.id, deviceLabel, dialog.name);
      
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
        <LanguageSwitcher onChange={forceRefresh} />
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
      <LanguageSwitcher onChange={forceRefresh} />
      
      <div className="max-w-2xl mx-auto space-y-10">
        {/* Header */}
        <header className="text-center space-y-4 animate-fade-in">
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

        {/* My Dialogs */}
        {storedDialogs.length > 0 && (
          <section className="space-y-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <h2 className="text-xl font-display font-semibold text-foreground">
              {t('myDialogs')}
            </h2>
            <div className="space-y-3">
              {storedDialogs
                .sort((a, b) => new Date(b.accessedAt).getTime() - new Date(a.accessedAt).getTime())
                .map((dialog) => (
                  <DialogCard
                    key={dialog.dialogId}
                    dialogId={dialog.dialogId}
                    dialogName={dialog.name}
                    deviceLabel={dialog.deviceLabel}
                    accessedAt={dialog.accessedAt}
                    onClick={() => handleOpenDialog(dialog.dialogId)}
                  />
                ))}
            </div>
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
