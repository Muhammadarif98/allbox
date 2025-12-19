import { useState, useRef, useEffect } from 'react';
import { Send, Mic, Square, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';

interface MessageInputProps {
  onSendText: (text: string) => Promise<void>;
  onSendVoice: (blob: Blob, duration: number) => Promise<void>;
  disabled?: boolean;
}

export function MessageInput({ onSendText, onSendVoice, disabled }: MessageInputProps) {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [sending, setSending] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const handleSendText = async () => {
    if (!text.trim() || sending) return;
    
    setSending(true);
    try {
      await onSendText(text.trim());
      setText('');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      startTimeRef.current = Date.now();
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        
        stream.getTracks().forEach(track => track.stop());
        
        if (duration >= 1) {
          setSending(true);
          try {
            await onSendVoice(blob, duration);
          } finally {
            setSending(false);
          }
        }
        
        setRecordingDuration(0);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      
      timerRef.current = setInterval(() => {
        setRecordingDuration(Math.round((Date.now() - startTimeRef.current) / 1000));
      }, 100);
      
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    setIsRecording(false);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-card border border-border rounded-xl p-3">
      {isRecording ? (
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-3">
            <div className="w-3 h-3 bg-destructive rounded-full animate-pulse" />
            <span className="text-foreground font-medium">
              {t('recording')} {formatDuration(recordingDuration)}
            </span>
          </div>
          <Button
            onClick={stopRecording}
            size="icon"
            variant="destructive"
            className="rounded-full"
          >
            <Square className="w-4 h-4 fill-current" />
          </Button>
        </div>
      ) : (
        <div className="flex items-end gap-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('typeMessage')}
            disabled={disabled || sending}
            className="min-h-[40px] max-h-[120px] resize-none border-0 bg-transparent focus-visible:ring-0 p-0"
            rows={1}
          />
          
          {text.trim() ? (
            <Button
              onClick={handleSendText}
              disabled={disabled || sending}
              size="icon"
              className="rounded-full bg-accent hover:bg-accent/90 flex-shrink-0"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          ) : (
            <Button
              onClick={startRecording}
              disabled={disabled || sending}
              size="icon"
              variant="secondary"
              className="rounded-full flex-shrink-0"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
