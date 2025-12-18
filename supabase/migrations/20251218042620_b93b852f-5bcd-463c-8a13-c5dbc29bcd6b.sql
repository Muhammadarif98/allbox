-- Add name column to dialogs table
ALTER TABLE public.dialogs ADD COLUMN name TEXT NOT NULL DEFAULT 'Shared Space';