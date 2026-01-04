-- Add password column to store the actual password for download
ALTER TABLE public.dialogs ADD COLUMN password text;

-- Update RLS policy to allow reading password
DROP POLICY IF EXISTS "Anyone can view dialogs" ON public.dialogs;
CREATE POLICY "Anyone can view dialogs" 
ON public.dialogs 
FOR SELECT 
USING (true);