
-- Add locale column to profiles for language preference sync
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'pt-BR';
