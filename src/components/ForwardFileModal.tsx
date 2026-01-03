import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getStoredDialogs, hasDialogAccess } from '@/lib/device';
import { t } from '@/lib/i18n';
import { Send, FolderOpen } from 'lucide-react';

interface ForwardFileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDialogId: string;
  onForward: (targetDialogId: string) => void;
}

export function ForwardFileModal({ open, onOpenChange, currentDialogId, onForward }: ForwardFileModalProps) {
  const dialogs = getStoredDialogs().filter(d => 
    d.dialogId !== currentDialogId && hasDialogAccess(d.dialogId)
  );

  const handleForward = (dialogId: string) => {
    onForward(dialogId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            {t('forwardFile')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {dialogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{t('noOtherDialogs')}</p>
            </div>
          ) : (
            dialogs.map((dialog) => (
              <Button
                key={dialog.dialogId}
                variant="outline"
                className="w-full justify-start text-left h-auto py-3"
                onClick={() => handleForward(dialog.dialogId)}
              >
                <div>
                  <p className="font-medium">{dialog.name || t('dialog')}</p>
                  <p className="text-xs text-muted-foreground">{dialog.deviceLabel}</p>
                </div>
              </Button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
