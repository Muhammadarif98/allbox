import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, Bot, User, Paperclip, Copy, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AttachedFile {
  id: string;
  name: string;
  content: string;
}

interface AIChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files?: Array<{ id: string; file_name: string; file_path: string }>;
  onSendToDialog?: (text: string) => void;
}

export function AIChatModal({ open, onOpenChange, files = [], onSendToDialog }: AIChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleAttachFile = async (file: { id: string; file_name: string; file_path: string }) => {
    // Check if already attached
    if (attachedFiles.some(f => f.id === file.id)) {
      toast.info('File already attached');
      return;
    }

    // Only allow text-based files
    const textExtensions = ['.txt', '.md', '.json', '.csv', '.xml', '.html', '.css', '.js', '.ts', '.tsx', '.jsx', '.py', '.java', '.c', '.cpp', '.h', '.sql', '.yaml', '.yml', '.ini', '.conf', '.log'];
    const ext = file.file_name.toLowerCase().slice(file.file_name.lastIndexOf('.'));
    
    if (!textExtensions.includes(ext)) {
      toast.error('Only text files can be analyzed by AI');
      return;
    }

    setLoadingFileId(file.id);
    try {
      const { data, error } = await supabase.storage.from('dialog-files').download(file.file_path);
      if (error) throw error;
      
      const text = await data.text();
      if (text.length > 50000) {
        toast.error('File is too large for AI analysis (max 50KB text)');
        return;
      }

      setAttachedFiles(prev => [...prev, { id: file.id, name: file.file_name, content: text }]);
      toast.success(`Attached: ${file.file_name}`);
    } catch (err) {
      console.error('Error loading file:', err);
      toast.error('Failed to load file');
    } finally {
      setLoadingFileId(null);
    }
  };

  const removeAttachedFile = (fileId: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleSend = async () => {
    if ((!input.trim() && attachedFiles.length === 0) || isLoading) return;

    let messageContent = input.trim();
    
    // Add file contents to the message
    if (attachedFiles.length > 0) {
      const fileContents = attachedFiles.map(f => `--- File: ${f.name} ---\n${f.content}\n--- End of ${f.name} ---`).join('\n\n');
      messageContent = attachedFiles.length > 0 && messageContent 
        ? `${messageContent}\n\nAttached files:\n${fileContents}`
        : `Please analyze these files:\n${fileContents}`;
    }

    const userMessage: Message = { role: 'user', content: messageContent };
    const displayMessage: Message = { 
      role: 'user', 
      content: attachedFiles.length > 0 
        ? `${input.trim() || 'Analyze files'}\n\n📎 ${attachedFiles.map(f => f.name).join(', ')}`
        : input.trim()
    };
    
    const newMessages = [...messages, userMessage];
    setMessages([...messages, displayMessage]);
    setInput('');
    setAttachedFiles([]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { messages: newMessages }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message || 'Sorry, I could not generate a response.'
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('AI Chat error:', err);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, an error occurred. Please try again.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopyToDialog = (content: string) => {
    if (onSendToDialog) {
      onSendToDialog(content);
      toast.success('Sent to dialog');
      onOpenChange(false);
    }
  };

  const handleCopyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg h-[80vh] max-h-[600px] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-accent" />
            AI Assistant
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable messages area */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-6 py-4"
        >
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Start a conversation with AI</p>
                {files.length > 0 && (
                  <p className="text-sm mt-2">You can attach files from the dialog for analysis</p>
                )}
              </div>
            )}
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-accent" />
                  </div>
                )}
                <div className="flex flex-col gap-1 max-w-[80%]">
                  <div
                    className={`rounded-2xl px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                  </div>
                  {msg.role === 'assistant' && (
                    <div className="flex gap-1 ml-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => handleCopyToClipboard(msg.content)}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
                      </Button>
                      {onSendToDialog && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => handleCopyToDialog(msg.content)}
                        >
                          <Send className="w-3 h-3 mr-1" />
                          Send to dialog
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-accent" />
                </div>
                <div className="bg-muted rounded-2xl px-4 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Attached files preview */}
        {attachedFiles.length > 0 && (
          <div className="px-6 py-2 border-t bg-muted/50 flex flex-wrap gap-2">
            {attachedFiles.map(file => (
              <div key={file.id} className="flex items-center gap-1 bg-background rounded-full px-3 py-1 text-xs">
                <Paperclip className="w-3 h-3" />
                <span className="max-w-[100px] truncate">{file.name}</span>
                <button onClick={() => removeAttachedFile(file.id)} className="hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* File attachment dropdown */}
        {files.length > 0 && (
          <div className="px-6 py-2 border-t">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {files.slice(0, 5).map(file => (
                <Button
                  key={file.id}
                  size="sm"
                  variant="outline"
                  className="shrink-0 text-xs h-7"
                  disabled={loadingFileId === file.id || attachedFiles.some(f => f.id === file.id)}
                  onClick={() => handleAttachFile(file)}
                >
                  {loadingFileId === file.id ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <Paperclip className="w-3 h-3 mr-1" />
                  )}
                  <span className="max-w-[80px] truncate">{file.file_name}</span>
                </Button>
              ))}
              {files.length > 5 && (
                <span className="text-xs text-muted-foreground self-center">+{files.length - 5} more</span>
              )}
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="flex gap-2 px-6 py-4 border-t">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={(!input.trim() && attachedFiles.length === 0) || isLoading} size="icon">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
