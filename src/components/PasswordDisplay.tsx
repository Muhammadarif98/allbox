import { AlertTriangle, Copy, Check, Download } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface PasswordDisplayProps {
  password: string;
  dialogName?: string;
  onConfirm: () => void;
}

export function PasswordDisplay({ password, dialogName, onConfirm }: PasswordDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const content = `${dialogName || 'Dialog'}\n\n${t('dialogCode')}: ${password}\n\nKeep this file safe!`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${dialogName || 'dialog'}-password.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 animate-fade-in">
      <div className="max-w-md w-full bg-card rounded-2xl p-8 shadow-soft text-center space-y-6">
        {/* Warning Icon */}
        <div className="w-16 h-16 mx-auto bg-accent/20 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-accent" />
        </div>

        {/* Dialog Name */}
        {dialogName && (
          <p className="text-xl font-display font-bold text-accent">
            "{dialogName}"
          </p>
        )}

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-2xl font-display font-bold text-foreground">
            {t('savePassword')}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t('saveWarning', { onlyTime: t('onlyTime') })}
          </p>
        </div>

        {/* 4-digit code label */}
        <p className="text-sm text-muted-foreground font-medium">
          {t('dialogCode')}:
        </p>

        {/* Password Display - SHOW ACTUAL DIGITS */}
        <div className="relative">
          <div className="flex justify-center gap-3">
            {password.split('').map((digit, i) => (
              <div
                key={i}
                className={cn(
                  "w-16 h-20 flex items-center justify-center",
                  "bg-background border-2 border-accent rounded-xl",
                  "text-4xl font-display font-bold text-accent",
                  "shadow-glow animate-pulse-glow"
                )}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                {digit}
              </div>
            ))}
          </div>
          
          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className={cn(
              "absolute -right-2 -top-2 p-2 rounded-full transition-all",
              "bg-secondary hover:bg-secondary/80",
              copied ? "text-green-500" : "text-secondary-foreground"
            )}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* Warning Message */}
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
          <p className="text-sm text-destructive font-medium">
            ⚠️ {t('passwordWarning')}
          </p>
        </div>

        {/* Download Password Button */}
        <Button
          onClick={handleDownload}
          variant="outline"
          className="w-full"
        >
          <Download className="w-4 h-4 mr-2" />
          {t('downloadPassword')}
        </Button>

        {/* Confirm Button */}
        <Button
          onClick={onConfirm}
          size="lg"
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-lg py-6 rounded-xl transition-all hover:shadow-glow"
        >
          {t('savedIt')}
        </Button>
      </div>
    </div>
  );
}
