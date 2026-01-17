import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FlexiblePasswordInput } from '@/components/PasswordInput';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface EnterDialogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnter: (password: string) => Promise<boolean>;
}

export function EnterDialogModal({ open, onOpenChange, onEnter }: EnterDialogModalProps) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const isValidLength = password.length === 4 || password.length === 6;

  const handleEnter = async (pwd?: string) => {
    const passwordToUse = pwd || password;
    if (passwordToUse.length !== 4 && passwordToUse.length !== 6) return;
    
    setLoading(true);
    setError(false);
    
    const success = await onEnter(passwordToUse);
    
    if (!success) {
      setError(true);
      setPassword('');
    }
    
    setLoading(false);
  };

  const handleClose = () => {
    setPassword('');
    setError(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center font-display text-2xl text-foreground">
            {t('enterDialogTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <p className="text-center text-muted-foreground">
            {t('enterPasswordPrompt')}
          </p>

          <FlexiblePasswordInput
            value={password}
            onChange={(v) => {
              setPassword(v);
              setError(false);
            }}
            onComplete={handleEnter}
            disabled={loading}
            error={error}
          />

          {error && (
            <p className="text-center text-destructive text-sm animate-fade-in">
              {t('wrongPassword')}
            </p>
          )}

          <Button
            onClick={() => handleEnter()}
            disabled={!isValidLength || loading}
            className={cn(
              "w-full bg-accent hover:bg-accent/90 text-accent-foreground",
              "font-semibold py-6 rounded-xl transition-all"
            )}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              t('enter')
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
