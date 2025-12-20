-- Add RLS policy to allow updating dialog name
CREATE POLICY "Anyone can update dialog name" 
ON public.dialogs 
FOR UPDATE 
USING (true)
WITH CHECK (true);

-- Add last_activity column to track dialog activity for sorting
ALTER TABLE public.dialogs ADD COLUMN IF NOT EXISTS last_activity_at timestamp with time zone DEFAULT now();

-- Create function to update last activity on dialog when files/messages are added
CREATE OR REPLACE FUNCTION update_dialog_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.dialogs 
  SET last_activity_at = now() 
  WHERE id = NEW.dialog_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for files and messages
DROP TRIGGER IF EXISTS update_dialog_activity_on_file ON public.files;
CREATE TRIGGER update_dialog_activity_on_file
AFTER INSERT ON public.files
FOR EACH ROW
EXECUTE FUNCTION update_dialog_last_activity();

DROP TRIGGER IF EXISTS update_dialog_activity_on_message ON public.messages;
CREATE TRIGGER update_dialog_activity_on_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION update_dialog_last_activity();