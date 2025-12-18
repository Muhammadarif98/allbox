-- Create dialogs table
CREATE TABLE public.dialogs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create dialog_devices table to track device labels
CREATE TABLE public.dialog_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dialog_id UUID NOT NULL REFERENCES public.dialogs(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_label TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(dialog_id, device_id)
);

-- Create files table
CREATE TABLE public.files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dialog_id UUID NOT NULL REFERENCES public.dialogs(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_path TEXT NOT NULL,
  device_label TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.dialogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dialog_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Public access policies for dialogs (password-protected at app level)
CREATE POLICY "Anyone can create dialogs" ON public.dialogs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view dialogs" ON public.dialogs FOR SELECT USING (true);

-- Public access policies for dialog_devices
CREATE POLICY "Anyone can register devices" ON public.dialog_devices FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view dialog devices" ON public.dialog_devices FOR SELECT USING (true);

-- Public access policies for files
CREATE POLICY "Anyone can upload files" ON public.files FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view files" ON public.files FOR SELECT USING (true);
CREATE POLICY "Anyone can delete files" ON public.files FOR DELETE USING (true);

-- Create storage bucket for files
INSERT INTO storage.buckets (id, name, public, file_size_limit) 
VALUES ('dialog-files', 'dialog-files', true, 104857600);

-- Storage policies for the bucket
CREATE POLICY "Anyone can upload files to dialog-files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'dialog-files');
CREATE POLICY "Anyone can view files in dialog-files" ON storage.objects FOR SELECT USING (bucket_id = 'dialog-files');
CREATE POLICY "Anyone can delete files from dialog-files" ON storage.objects FOR DELETE USING (bucket_id = 'dialog-files');

-- Enable realtime for files table (for live updates in dialog)
ALTER PUBLICATION supabase_realtime ADD TABLE public.files;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dialog_devices;