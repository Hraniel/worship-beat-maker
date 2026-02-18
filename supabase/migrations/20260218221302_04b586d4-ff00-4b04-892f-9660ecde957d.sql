-- Create setlist_events table: groups setlists by event date
CREATE TABLE public.setlist_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  event_date date NOT NULL,
  setlist_id uuid REFERENCES public.setlists(id) ON DELETE SET NULL,
  share_token uuid DEFAULT gen_random_uuid() UNIQUE,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.setlist_events ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own events"
  ON public.setlist_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Public events are viewable by anyone"
  ON public.setlist_events FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can create own events"
  ON public.setlist_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own events"
  ON public.setlist_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own events"
  ON public.setlist_events FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE TRIGGER update_setlist_events_updated_at
  BEFORE UPDATE ON public.setlist_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
