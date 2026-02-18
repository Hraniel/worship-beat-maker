
-- 1. Add publish_at to store_packs for scheduled publishing
ALTER TABLE public.store_packs ADD COLUMN IF NOT EXISTS publish_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Add share_token and is_public to setlists for shareable links
ALTER TABLE public.setlists ADD COLUMN IF NOT EXISTS share_token UUID DEFAULT gen_random_uuid();
ALTER TABLE public.setlists ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Create index for fast share_token lookups
CREATE INDEX IF NOT EXISTS idx_setlists_share_token ON public.setlists(share_token);

-- 3. Push subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own push subscriptions"
ON public.push_subscriptions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow public read for shared setlists (via edge function using service role)
-- RLS policy to allow reading public setlists by share token
CREATE POLICY "Public setlists are readable by anyone"
ON public.setlists
FOR SELECT
USING (is_public = true);
