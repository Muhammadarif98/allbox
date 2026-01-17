import { useRef, KeyboardEvent, ClipboardEvent, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  length?: 4 | 6; // Support both 4 and 6 digit codes
}

export function PasswordInput({ 
  value, 
  onChange, 
  onComplete, 
  disabled, 
  error, 
  length = 6 
}: PasswordInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [focused, setFocused] = useState(false);
  const indices = Array.from({ length }, (_, i) => i);

  const handleChange = (index: number, digit: string) => {
    if (!/^\d*$/.test(digit)) return;
    
    const newValue = value.split('');
    newValue[index] = digit.slice(-1);
    const joined = newValue.join('').slice(0, length);
    onChange(joined);

    // Auto-focus next input
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Trigger complete when all digits entered
    if (joined.length === length && onComplete) {
      onComplete(joined);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    onChange(pasted);
    if (pasted.length === length && onComplete) {
      onComplete(pasted);
    }
    // Focus last filled or next empty
    const focusIndex = Math.min(pasted.length, length - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center">
      {indices.map((index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[index] || ''}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          className={cn(
            "w-12 h-16 sm:w-14 sm:h-18 text-center text-2xl sm:text-3xl font-display font-bold rounded-xl",
            "bg-card border-2 transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background",
            "placeholder:text-muted-foreground/30",
            error 
              ? "border-destructive text-destructive animate-pulse" 
              : focused 
                ? "border-accent text-accent" 
                : "border-border text-foreground",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          placeholder="•"
        />
      ))}
    </div>
  );
}

// Flexible input that supports both 4 and 6 digit codes for entering existing dialogs
interface FlexiblePasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
}

export function FlexiblePasswordInput({ 
  value, 
  onChange, 
  onComplete, 
  disabled, 
  error 
}: FlexiblePasswordInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.replace(/\D/g, '').slice(0, 6);
    onChange(newValue);
    
    // Trigger complete for both 4 and 6 digit codes
    if ((newValue.length === 4 || newValue.length === 6) && onComplete) {
      onComplete(newValue);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && (value.length === 4 || value.length === 6) && onComplete) {
      onComplete(value);
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        maxLength={6}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={disabled}
        className={cn(
          "w-full h-16 text-center text-3xl font-display font-bold rounded-xl tracking-[0.5em]",
          "bg-card border-2 transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background",
          "placeholder:text-muted-foreground/30 placeholder:tracking-normal",
          error 
            ? "border-destructive text-destructive animate-pulse" 
            : focused 
              ? "border-accent text-accent" 
              : "border-border text-foreground",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        placeholder="••••••"
      />
      <p className="text-xs text-muted-foreground text-center">
        {value.length}/6
      </p>
    </div>
  );
}
