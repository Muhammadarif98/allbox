import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { t } from '@/lib/i18n';
import { Key, Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { hashPassword, savePasswordForDialog } from '@/lib/device';
import { toast } from 'sonner';

interface PasswordPromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dialogId: string;
  dialogName: string;
  onSuccess: (password: string) => void;
}

export function PasswordPromptModal({ 
  open, 
  onOpenChange, 
  dialogId, 
  dialogName,
  onSuccess 
}: PasswordPromptModalProps) {
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    if (password.length !== 4) {
      setError(t('enterPassword'));
      return;
    }
    
    setVerifying(true);
    setError('');
    
    try {
      const hash = await hashPassword(password);
      const { data } = await supabase
        .from('dialogs')
        .select('password_hash')
        .eq('id', dialogId)
        .maybeSingle();
      
      if (data && data.password_hash === hash) {
        // Save password for future use
        savePasswordForDialog(dialogId, password);
        onSuccess(password);
        onOpenChange(false);
        setPassword('');
      } else {
        setError(t('wrongPassword'));
      }
    } catch (err) {
      setError(t('verifyFailed'));
    } finally {
      setVerifying(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleVerify();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            {t('enterPasswordToDownload')}
          </DialogTitle>
          <DialogDescription>
            {t('verifyPasswordForDialog')}: {dialogName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={password}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                setPassword(val);
                setError('');
              }}
              onKeyDown={handleKeyDown}
              placeholder="• • • •"
              className="text-center text-2xl tracking-[0.5em] font-mono"
              autoFocus
            />
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
          </div>
          
          <Button 
            onClick={handleVerify} 
            disabled={password.length !== 4 || verifying}
            className="w-full"
          >
            {verifying ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {t('downloadPassword')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
