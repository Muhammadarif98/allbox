import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { AlertCircle } from 'lucide-react';

interface PasswordUnavailableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dialogName: string;
}

export function PasswordUnavailableModal({ 
  open, 
  onOpenChange, 
  dialogName
}: PasswordUnavailableModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            {t('passwordUnavailable')}
          </DialogTitle>
          <DialogDescription>
            {t('passwordUnavailableDesc')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('passwordNotSaved')}
          </p>
          
          <Button 
            onClick={() => onOpenChange(false)} 
            className="w-full"
            variant="outline"
          >
            {t('ok')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
