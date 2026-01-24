import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bot, User, Send, Loader2, Plus, Trash2, Paperclip, Copy, Image, FileText, X, MessageSquare, PanelLeftClose, PanelLeft, HardDrive, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { hasDialogAccess, getDialogName } from '@/lib/device';
import { t } from '@/lib/i18n';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { isImageFile, isVideoFile } from '@/lib/fileUtils';

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attached_files: unknown;
  created_at: string;
}

interface AttachedFile {
  id: string;
  name: string;
  content: string;
  type: 'text' | 'image';
  mimeType?: string;
  base64?: string;
}

interface DialogFile {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
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
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp',
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

export default function AIChat() {
  const { dialogId } = useParams<{ dialogId: string }>();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [dialogFiles, setDialogFiles] = useState<DialogFile[]>([]);
  const [dialogName, setDialogName] = useState('');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [dialogFilesMenuOpen, setDialogFilesMenuOpen] = useState(false);
  const [filePreviewUrls, setFilePreviewUrls] = useState<Record<string, string>>({});
  const [, setRefresh] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const forceRefresh = useCallback(() => setRefresh(n => n + 1), []);

  useEffect(() => {
    if (!dialogId) { navigate('/'); return; }
    if (!hasDialogAccess(dialogId)) { toast.error(t('noAccess')); navigate('/'); return; }
    
    const name = getDialogName(dialogId);
    if (name) setDialogName(name);
    
    loadConversations();
    loadDialogFiles();
  }, [dialogId, navigate]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadConversations = async () => {
    if (!dialogId) return;
    const { data } = await supabase
      .from('ai_conversations')
      .select('id, title, updated_at')
      .eq('dialog_id', dialogId)
      .order('updated_at', { ascending: false });
    setConversations(data || []);
  };

  const loadDialogFiles = async () => {
    if (!dialogId) return;
    const { data } = await supabase
      .from('files')
      .select('id, file_name, file_path, file_size')
      .eq('dialog_id', dialogId)
      .order('uploaded_at', { ascending: false });
    setDialogFiles(data || []);
    
    // Load preview URLs for images and videos
    if (data) {
      const previews: Record<string, string> = {};
      for (const file of data) {
        if (isImageFile(file.file_name) || isVideoFile(file.file_name)) {
          const { data: urlData } = await supabase.storage
            .from('dialog-files')
            .createSignedUrl(file.file_path, 3600);
          if (urlData?.signedUrl) {
            previews[file.id] = urlData.signedUrl;
          }
        }
      }
      setFilePreviewUrls(previews);
    }
  };

  const loadMessages = async (conversationId: string) => {
    const { data } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    setMessages((data || []) as Message[]);
  };

  const handleSelectConversation = async (conversationId: string) => {
    setSelectedConversation(conversationId);
    await loadMessages(conversationId);
  };

  const handleNewChat = async () => {
    if (!dialogId) return;
    const { data, error } = await supabase
      .from('ai_conversations')
      .insert({ dialog_id: dialogId, title: t('newChat') })
      .select()
      .single();
    
    if (error) {
      toast.error(t('aiError'));
      return;
    }
    
    setConversations(prev => [data, ...prev]);
    setSelectedConversation(data.id);
    setMessages([]);
  };

  const handleDeleteChat = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(t('deleteChatConfirm'))) return;
    
    await supabase.from('ai_conversations').delete().eq('id', conversationId);
    setConversations(prev => prev.filter(c => c.id !== conversationId));
    if (selectedConversation === conversationId) {
      setSelectedConversation(null);
      setMessages([]);
    }
  };

  const handleAttachFile = async (file: DialogFile) => {
    if (attachedFiles.some(f => f.id === file.id)) {
      toast.info(t('fileAttached'));
      return;
    }

    const category = getFileCategory(file.file_name);
    if (category === 'unsupported') {
      toast.error(t('unsupportedFileType'));
      return;
    }

    setLoadingFileId(file.id);
    try {
      const { data, error } = await supabase.storage.from('dialog-files').download(file.file_path);
      if (error) throw error;

      if (category === 'text') {
        const text = await data.text();
        setAttachedFiles(prev => [...prev, { id: file.id, name: file.file_name, content: text, type: 'text' }]);
      } else {
        const arrayBuffer = await data.arrayBuffer();
        const base64 = arrayBufferToBase64(arrayBuffer);
        const mimeType = getMimeType(file.file_name);
        setAttachedFiles(prev => [...prev, { 
          id: file.id, name: file.file_name, content: `[${category}: ${file.file_name}]`,
          type: 'image', mimeType, base64
        }]);
      }
      toast.success(`${t('fileAttached')}: ${file.file_name}`);
    } catch (err) {
      console.error('Error loading file:', err);
      toast.error(t('downloadFailed'));
    } finally {
      setLoadingFileId(null);
    }
  };

  const handleAttachDialogFile = async (file: DialogFile) => {
    setDialogFilesMenuOpen(false);
    setAttachMenuOpen(false);
    await handleAttachFile(file);
  };

  const handleDeviceFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setAttachMenuOpen(false);
    
    for (const file of Array.from(files)) {
      const category = getFileCategory(file.name);
      if (category === 'unsupported') {
        toast.error(`${t('unsupportedFileType')}: ${file.name}`);
        continue;
      }

      const fileId = `device-${Date.now()}-${file.name}`;
      
      if (category === 'text') {
        const text = await file.text();
        setAttachedFiles(prev => [...prev, { id: fileId, name: file.name, content: text, type: 'text' }]);
      } else {
        const arrayBuffer = await file.arrayBuffer();
        const base64 = arrayBufferToBase64(arrayBuffer);
        const mimeType = file.type || getMimeType(file.name);
        setAttachedFiles(prev => [...prev, { 
          id: fileId, name: file.name, content: `[${category}: ${file.name}]`,
          type: 'image', mimeType, base64
        }]);
      }
      toast.success(`${t('fileAttached')}: ${file.name}`);
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachedFile = (fileId: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleSend = async () => {
    if ((!input.trim() && attachedFiles.length === 0) || isLoading) return;

    // Create conversation if none selected
    let conversationId = selectedConversation;
    if (!conversationId) {
      const { data, error } = await supabase
        .from('ai_conversations')
        .insert({ dialog_id: dialogId, title: input.trim().slice(0, 50) || t('newChat') })
        .select()
        .single();
      
      if (error) {
        toast.error(t('aiError'));
        return;
      }
      conversationId = data.id;
      setConversations(prev => [data, ...prev]);
      setSelectedConversation(conversationId);
    }

    let messageContent = input.trim();
    const textFiles = attachedFiles.filter(f => f.type === 'text');
    const imageFiles = attachedFiles.filter(f => f.type === 'image');

    if (textFiles.length > 0) {
      const fileContents = textFiles.map(f => `--- File: ${f.name} ---\n${f.content}\n--- End ---`).join('\n\n');
      messageContent = messageContent ? `${messageContent}\n\nAttached:\n${fileContents}` : `Analyze:\n${fileContents}`;
    }

    if (imageFiles.length > 0 && !messageContent) {
      messageContent = `Analyze: ${imageFiles.map(f => f.name).join(', ')}`;
    }

    const displayContent = attachedFiles.length > 0 
      ? `${input.trim() || t('analyzeFiles')}\n\n📎 ${attachedFiles.map(f => f.name).join(', ')}`
      : input.trim();

    // Save user message to DB
    const { data: savedUserMsg } = await supabase
      .from('ai_messages')
      .insert({
        conversation_id: conversationId,
        role: 'user',
        content: displayContent,
        attached_files: attachedFiles.map(f => ({ name: f.name }))
      })
      .select()
      .single();

    if (savedUserMsg) {
      setMessages(prev => [...prev, savedUserMsg as Message]);
    }

    const allMessages = [...messages, { role: 'user' as const, content: messageContent }];
    const images = imageFiles.filter(f => f.base64 && f.mimeType).map(f => ({ base64: f.base64!, mimeType: f.mimeType! }));

    setInput('');
    setAttachedFiles([]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { 
          messages: allMessages.map(m => ({ role: m.role, content: m.content })),
          images: images.length > 0 ? images : undefined
        }
      });

      if (error) {
        if (error.message?.includes('429')) toast.error(t('rateLimitExceeded'));
        else if (error.message?.includes('402')) toast.error(t('creditsExhausted'));
        throw error;
      }

      const assistantContent = data.message || 'Sorry, I could not generate a response.';
      
      // Save assistant message to DB
      const { data: savedAssistantMsg } = await supabase
        .from('ai_messages')
        .insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: assistantContent,
          attached_files: []
        })
        .select()
        .single();

      if (savedAssistantMsg) {
        setMessages(prev => [...prev, savedAssistantMsg as Message]);
      }

      // Update conversation title if it's the first message
      if (messages.length === 0 && input.trim()) {
        await supabase
          .from('ai_conversations')
          .update({ title: input.trim().slice(0, 50) })
          .eq('id', conversationId);
        loadConversations();
      }
    } catch (err) {
      console.error('AI Chat error:', err);
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

  const handleCopyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success(t('copiedToClipboard'));
  };

  const handleSendToDialog = async (content: string) => {
    if (!dialogId) return;
    const { error } = await supabase.from('messages').insert({
      dialog_id: dialogId,
      device_label: 'AI Assistant',
      content: content,
      message_type: 'text'
    });
    if (error) toast.error(t('messageFailed'));
    else toast.success(t('sentToDialog'));
  };

  const getFileIcon = (fileName: string) => {
    const category = getFileCategory(fileName);
    if (category === 'image') return <Image className="w-3 h-3" />;
    return <FileText className="w-3 h-3" />;
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 border-b flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/dialog/${dialogId}`)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-accent" />
            <span className="font-display font-semibold">{t('aiAssistant')}</span>
            {dialogName && <span className="text-muted-foreground text-sm">• {dialogName}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeSwitcher onChange={forceRefresh} />
          <LanguageSwitcher onChange={forceRefresh} />
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className={cn(
          "border-r bg-card flex flex-col transition-all duration-300 ease-in-out overflow-hidden",
          sidebarOpen ? "w-64" : "w-0"
        )}>
          <div className={cn(
            "flex flex-col h-full transition-opacity duration-200",
            sidebarOpen ? "opacity-100" : "opacity-0"
          )}>
            <div className="p-3 border-b flex items-center gap-2">
              <Button onClick={handleNewChat} className="flex-1" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                {t('newChat')}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="shrink-0">
                <PanelLeftClose className="w-4 h-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {conversations.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-4">{t('noChats')}</p>
                )}
                {conversations.map(conv => (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg cursor-pointer group",
                      selectedConversation === conv.id 
                        ? "bg-accent/20 text-accent-foreground" 
                        : "hover:bg-muted"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MessageSquare className="w-4 h-4 shrink-0" />
                      <span className="text-sm truncate">{conv.title}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={(e) => handleDeleteChat(conv.id, e)}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Toggle button when sidebar is closed */}
        {!sidebarOpen && (
          <div className="border-r flex items-start pt-3 px-2">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
              <PanelLeft className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Main chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.length === 0 && !selectedConversation && (
                <div className="text-center text-muted-foreground py-16">
                  <Bot className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">{t('startConversation')}</p>
                  {dialogFiles.length > 0 && (
                    <div className="text-sm space-y-1">
                      <p>{t('attachFilesHint')}</p>
                      <p className="text-xs opacity-75">{t('supportedFormats')}</p>
                    </div>
                  )}
                </div>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn("flex gap-3", msg.role === 'user' ? "justify-end" : "justify-start")}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-accent" />
                    </div>
                  )}
                  <div className="flex flex-col gap-1 max-w-[80%]">
                    <div className={cn(
                      "rounded-2xl px-4 py-3",
                      msg.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    )}>
                      <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                    </div>
                    {msg.role === 'assistant' && (
                      <div className="flex gap-1 ml-1">
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => handleCopyToClipboard(msg.content)}>
                          <Copy className="w-3 h-3 mr-1" />{t('copy')}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => handleSendToDialog(msg.content)}>
                          <Send className="w-3 h-3 mr-1" />{t('sendToDialog')}
                        </Button>
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
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Attached files preview */}
          {attachedFiles.length > 0 && (
            <div className="px-4 py-2 border-t bg-muted/50">
              <div className="max-w-3xl mx-auto flex flex-wrap gap-2">
                {attachedFiles.map(file => (
                  <div key={file.id} className="flex items-center gap-1 bg-background rounded-full px-3 py-1 text-xs">
                    {getFileIcon(file.name)}
                    <span className="max-w-[150px] truncate">{file.name}</span>
                    <button onClick={() => removeAttachedFile(file.id)} className="hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input area */}
          <div className="p-4 border-t">
            <div className="max-w-3xl mx-auto flex gap-2">
              {/* Hidden file input for device files */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleDeviceFileSelect}
                className="hidden"
                multiple
                accept=".txt,.md,.json,.csv,.xml,.html,.css,.js,.ts,.tsx,.jsx,.py,.java,.c,.cpp,.h,.sql,.yaml,.yml,.ini,.conf,.log,.sh,.bat,.ps1,.rb,.php,.go,.rs,.swift,.kt,.jpg,.jpeg,.png,.gif,.webp,.bmp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp"
              />
              
              {/* Attach button with popover */}
              <Popover open={attachMenuOpen} onOpenChange={setAttachMenuOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className="shrink-0">
                    <Paperclip className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" align="start">
                  <div className="space-y-1">
                    {/* From device option */}
                    <button
                      onClick={() => {
                        fileInputRef.current?.click();
                        setAttachMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-left"
                    >
                      <HardDrive className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{t('fromDevice')}</span>
                    </button>
                    
                    {/* From dialog option with submenu */}
                    <Popover open={dialogFilesMenuOpen} onOpenChange={setDialogFilesMenuOpen}>
                      <PopoverTrigger asChild>
                        <button
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-left"
                        >
                          <FolderOpen className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{t('fromDialog')}</span>
                          <span className="ml-auto text-xs text-muted-foreground">
                            {dialogFiles.length}
                          </span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-2" side="right" align="start">
                        <ScrollArea className="max-h-80">
                          {dialogFiles.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              {t('noDialogFiles')}
                            </p>
                          ) : (
                            <div className="space-y-1">
                              {dialogFiles.map(file => {
                                const category = getFileCategory(file.file_name);
                                const isAttached = attachedFiles.some(f => f.id === file.id);
                                const isDisabled = loadingFileId === file.id || isAttached || category === 'unsupported';
                                const previewUrl = filePreviewUrls[file.id];
                                
                                return (
                                  <button
                                    key={file.id}
                                    onClick={() => handleAttachDialogFile(file)}
                                    disabled={isDisabled}
                                    className={cn(
                                      "w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-colors text-left",
                                      isDisabled 
                                        ? "opacity-50 cursor-not-allowed" 
                                        : "hover:bg-muted cursor-pointer"
                                    )}
                                  >
                                    {/* Preview thumbnail */}
                                    <div className="w-10 h-10 rounded-md overflow-hidden bg-muted flex items-center justify-center shrink-0">
                                      {loadingFileId === file.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : previewUrl && isImageFile(file.file_name) ? (
                                        <img 
                                          src={previewUrl} 
                                          alt={file.file_name}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : previewUrl && isVideoFile(file.file_name) ? (
                                        <video 
                                          src={previewUrl}
                                          className="w-full h-full object-cover"
                                          muted
                                        />
                                      ) : category === 'image' ? (
                                        <Image className="w-4 h-4 text-muted-foreground" />
                                      ) : (
                                        <FileText className="w-4 h-4 text-muted-foreground" />
                                      )}
                                    </div>
                                    
                                    {/* File info */}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm truncate">{file.file_name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {(file.file_size / 1024).toFixed(1)} KB
                                        {isAttached && ' • ✓'}
                                      </p>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </ScrollArea>
                      </PopoverContent>
                    </Popover>
                  </div>
                </PopoverContent>
              </Popover>

              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('typeMessage')}
                disabled={isLoading}
                className="flex-1"
              />
              <Button onClick={handleSend} disabled={(!input.trim() && attachedFiles.length === 0) || isLoading} size="icon">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
