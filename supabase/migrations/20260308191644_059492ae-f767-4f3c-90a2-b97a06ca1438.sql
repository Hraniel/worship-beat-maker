-- Live cues table for real-time signaling between musicians
CREATE TABLE public.live_cues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setlist_id UUID NOT NULL,
  sent_by UUID NOT NULL,
  cue_type TEXT NOT NULL,
  cue_label TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.live_cues ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can insert cues
CREATE POLICY "Authenticated users can send cues"
ON public.live_cues FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sent_by);

-- Policy: anyone can read cues for a setlist they have access to
CREATE POLICY "Users can view cues"
ON public.live_cues FOR SELECT
TO authenticated
USING (true);

-- Policy: users can delete own cues
CREATE POLICY "Users can delete own cues"
ON public.live_cues FOR DELETE
TO authenticated
USING (auth.uid() = sent_by);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_cues;

-- Auto-cleanup: delete cues older than 1 hour (optional, via index for fast deletes)
CREATE INDEX idx_live_cues_created_at ON public.live_cues (created_at);