DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'live_cues'
      AND policyname = 'Public can view cues for public shared items'
  ) THEN
    CREATE POLICY "Public can view cues for public shared items"
    ON public.live_cues
    FOR SELECT
    TO public
    USING (
      EXISTS (
        SELECT 1
        FROM public.setlists s
        WHERE s.id = live_cues.setlist_id
          AND s.is_public = true
      )
      OR EXISTS (
        SELECT 1
        FROM public.setlist_events e
        WHERE e.id = live_cues.setlist_id
          AND e.is_public = true
      )
      OR EXISTS (
        SELECT 1
        FROM public.setlist_events e2
        WHERE e2.setlist_id = live_cues.setlist_id
          AND e2.is_public = true
      )
    );
  END IF;
END $$;