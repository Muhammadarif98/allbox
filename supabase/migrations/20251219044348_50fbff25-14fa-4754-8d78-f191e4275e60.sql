-- Create messages table for text and voice messages
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dialog_id UUID NOT NULL REFERENCES public.dialogs(id) ON DELETE CASCADE,
  device_label TEXT NOT NULL,
  content TEXT, -- for text messages
  voice_path TEXT, -- for voice messages stored in storage
  voice_duration INTEGER, -- duration in seconds for voice messages
  message_type TEXT NOT NULL CHECK (message_type IN ('text', 'voice')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view messages" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Anyone can send messages" ON public.messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete messages" ON public.messages FOR DELETE USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;