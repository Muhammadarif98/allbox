import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Send } from 'lucide-react';
import { t } from '@/lib/i18n';
import { getStoredDialogs } from '@/lib/device';

interface ForwardMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDialogId: string;
  onForward: (targetDialogId: string) => Promise<void>;
}

export function ForwardMessageModal({ 
  open, 
  onOpenChange, 
  currentDialogId,
  onForward 
}: ForwardMessageModalProps) {
  const [forwarding, setForwarding] = useState(false);
  const [selectedDialog, setSelectedDialog] = useState<string | null>(null);
  
  const dialogs = getStoredDialogs().filter(d => d.dialogId !== currentDialogId);
  
  const handleForward = async () => {
    if (!selectedDialog) return;
    setForwarding(true);
    try {
      await onForward(selectedDialog);
      onOpenChange(false);
      setSelectedDialog(null);
    } finally {
      setForwarding(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">{t('forwardTo')}</DialogTitle>
        </DialogHeader>
        
        {dialogs.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">{t('noDialogsToForward')}</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {dialogs.map((dialog) => (
              <button
                key={dialog.dialogId}
                onClick={() => setSelectedDialog(dialog.dialogId)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedDialog === dialog.dialogId 
                    ? 'border-accent bg-accent/10' 
                    : 'border-border hover:border-secondary/50'
                }`}
              >
                <p className="font-medium text-foreground">{dialog.name || t('dialog')}</p>
                <p className="text-sm text-muted-foreground">{dialog.deviceLabel}</p>
              </button>
            ))}
          </div>
        )}
        
        {dialogs.length > 0 && (
          <Button 
            onClick={handleForward} 
            disabled={!selectedDialog || forwarding}
            className="w-full"
          >
            {forwarding ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            {t('forward')}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
