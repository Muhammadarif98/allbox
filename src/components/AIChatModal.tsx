import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, Bot, User, Paperclip, Copy, X, Image, FileText } from 'lucide-react';
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
  type: 'text' | 'image';
  mimeType?: string;
  base64?: string;
}

interface AIChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files?: Array<{ id: string; file_name: string; file_path: string }>;
  onSendToDialog?: (text: string) => void;
}

// File type detection helpers
const getFileCategory = (fileName: string): 'text' | 'image' | 'document' | 'unsupported' => {
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));
  
  const textExtensions = ['.txt', '.md', '.json', '.csv', '.xml', '.html', '.css', '.js', '.ts', '.tsx', '.jsx', '.py', '.java', '.c', '.cpp', '.h', '.sql', '.yaml', '.yml', '.ini', '.conf', '.log', '.sh', '.bat', '.ps1', '.rb', '.php', '.go', '.rs', '.swift', '.kt'];
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
  const documentExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt', '.ods', '.odp'];
  
  if (textExtensions.includes(ext)) return 'text';
  if (imageExtensions.includes(ext)) return 'image';
  if (documentExtensions.includes(ext)) return 'document';
  return 'unsupported';
};

const getMimeType = (fileName: string): string => {
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.pdf': 'application/pdf',
  };
  return mimeTypes[ext] || 'application/octet-stream';
};

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

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

    const category = getFileCategory(file.file_name);
    
    if (category === 'unsupported') {
      toast.error('This file type is not supported for AI analysis');
      return;
    }

    setLoadingFileId(file.id);
    try {
      const { data, error } = await supabase.storage.from('dialog-files').download(file.file_path);
      if (error) throw error;

      if (category === 'text') {
        const text = await data.text();
        if (text.length > 100000) {
          toast.error('File is too large for AI analysis (max 100KB text)');
          return;
        }
        setAttachedFiles(prev => [...prev, { 
          id: file.id, 
          name: file.file_name, 
          content: text,
          type: 'text'
        }]);
      } else if (category === 'image') {
        const arrayBuffer = await data.arrayBuffer();
        const base64 = arrayBufferToBase64(arrayBuffer);
        const mimeType = getMimeType(file.file_name);
        
        // Check size (max 5MB for images)
        if (arrayBuffer.byteLength > 5 * 1024 * 1024) {
          toast.error('Image is too large for AI analysis (max 5MB)');
          return;
        }
        
        setAttachedFiles(prev => [...prev, { 
          id: file.id, 
          name: file.file_name, 
          content: `[Image: ${file.file_name}]`,
          type: 'image',
          mimeType,
          base64
        }]);
      } else if (category === 'document') {
        // For documents, we'll send them as binary and let AI try to understand
        const arrayBuffer = await data.arrayBuffer();
        const base64 = arrayBufferToBase64(arrayBuffer);
        const mimeType = getMimeType(file.file_name);
        
        // Check size (max 10MB for documents)
        if (arrayBuffer.byteLength > 10 * 1024 * 1024) {
          toast.error('Document is too large for AI analysis (max 10MB)');
          return;
        }
        
        setAttachedFiles(prev => [...prev, { 
          id: file.id, 
          name: file.file_name, 
          content: `[Document: ${file.file_name}]`,
          type: 'image', // Use image type for multimodal API
          mimeType,
          base64
        }]);
      }

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
    const textFiles = attachedFiles.filter(f => f.type === 'text');
    const imageFiles = attachedFiles.filter(f => f.type === 'image');
    
    // Add text file contents to the message
    if (textFiles.length > 0) {
      const fileContents = textFiles.map(f => `--- File: ${f.name} ---\n${f.content}\n--- End of ${f.name} ---`).join('\n\n');
      messageContent = messageContent 
        ? `${messageContent}\n\nAttached files:\n${fileContents}`
        : `Please analyze these files:\n${fileContents}`;
    }

    // Add image descriptions to message
    if (imageFiles.length > 0 && !messageContent) {
      messageContent = `Please analyze ${imageFiles.length === 1 ? 'this image' : 'these images'}: ${imageFiles.map(f => f.name).join(', ')}`;
    }

    const userMessage: Message = { role: 'user', content: messageContent };
    const displayContent = attachedFiles.length > 0 
      ? `${input.trim() || 'Analyze files'}\n\n📎 ${attachedFiles.map(f => f.name).join(', ')}`
      : input.trim();
    const displayMessage: Message = { role: 'user', content: displayContent };
    
    const newMessages = [...messages, userMessage];
    setMessages([...messages, displayMessage]);
    setInput('');
    
    // Prepare images for API
    const images = imageFiles
      .filter(f => f.base64 && f.mimeType)
      .map(f => ({ base64: f.base64!, mimeType: f.mimeType! }));
    
    setAttachedFiles([]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { 
          messages: newMessages,
          images: images.length > 0 ? images : undefined
        }
      });

      if (error) {
        // Handle rate limit and payment errors
        if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
          toast.error('Rate limit exceeded. Please wait and try again.');
        } else if (error.message?.includes('402') || error.message?.includes('Payment')) {
          toast.error('AI credits exhausted. Please add funds.');
        }
        throw error;
      }

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

  const getFileIcon = (fileName: string) => {
    const category = getFileCategory(fileName);
    if (category === 'image') return <Image className="w-3 h-3" />;
    return <FileText className="w-3 h-3" />;
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
                  <div className="text-sm mt-2 space-y-1">
                    <p>Attach files from the dialog for analysis:</p>
                    <p className="text-xs opacity-75">📷 Images (OCR, description) • 📄 PDF/Word/Excel • 📝 Text/Code</p>
                  </div>
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
                {getFileIcon(file.name)}
                <span className="max-w-[100px] truncate">{file.name}</span>
                <button onClick={() => removeAttachedFile(file.id)} className="hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* File attachment buttons */}
        {files.length > 0 && (
          <div className="px-6 py-2 border-t">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {files.slice(0, 8).map(file => {
                const category = getFileCategory(file.file_name);
                const isDisabled = loadingFileId === file.id || 
                  attachedFiles.some(f => f.id === file.id) || 
                  category === 'unsupported';
                
                return (
                  <Button
                    key={file.id}
                    size="sm"
                    variant="outline"
                    className="shrink-0 text-xs h-7"
                    disabled={isDisabled}
                    onClick={() => handleAttachFile(file)}
                    title={category === 'unsupported' ? 'Unsupported file type' : file.file_name}
                  >
                    {loadingFileId === file.id ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    ) : (
                      <>
                        {category === 'image' ? <Image className="w-3 h-3 mr-1" /> : <Paperclip className="w-3 h-3 mr-1" />}
                      </>
                    )}
                    <span className="max-w-[80px] truncate">{file.file_name}</span>
                  </Button>
                );
              })}
              {files.length > 8 && (
                <span className="text-xs text-muted-foreground self-center">+{files.length - 8} more</span>
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
