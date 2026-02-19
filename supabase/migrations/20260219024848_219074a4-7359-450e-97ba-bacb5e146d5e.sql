-- Add 'removed' flag to user_purchases so users can remove a pack from their active library
-- but keep their purchase record (allowing free re-add later)
ALTER TABLE public.user_purchases
  ADD COLUMN IF NOT EXISTS removed boolean NOT NULL DEFAULT false;