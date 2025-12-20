import { useState } from 'react';
import { Edit3, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { getDeviceName, setDeviceName } from '@/lib/device';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DeviceNameEditorProps {
  onUpdate?: () => void;
  className?: string;
}

export function DeviceNameEditor({ onUpdate, className }: DeviceNameEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(getDeviceName() || '');

  const handleSave = () => {
    if (name.trim()) {
      setDeviceName(name.trim());
      toast.success(t('deviceNameUpdated'));
      onUpdate?.();
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setName(getDeviceName() || '');
    setIsEditing(false);
  };

  const currentName = getDeviceName();

  return (
    <div className={cn("bg-card rounded-xl border border-border p-4", className)}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground mb-1">{t('deviceName')}</p>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('deviceNamePlaceholder')}
                className="flex-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') handleCancel();
                }}
              />
              <Button size="icon" variant="ghost" onClick={handleSave}>
                <Check className="w-4 h-4 text-green-500" />
              </Button>
              <Button size="icon" variant="ghost" onClick={handleCancel}>
                <X className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
          ) : (
            <p className="font-medium text-foreground truncate">
              {currentName || t('deviceNamePlaceholder')}
            </p>
          )}
        </div>
        {!isEditing && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsEditing(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Edit3 className="w-4 h-4 mr-1" />
            {t('editDeviceName')}
          </Button>
        )}
      </div>
    </div>
  );
}