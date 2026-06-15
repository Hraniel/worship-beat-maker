
-- 1. live_cues: drop overly broad authenticated SELECT, add owner-scoped SELECT
DROP POLICY IF EXISTS "Users can view cues" ON public.live_cues;
CREATE POLICY "Users can view own cues" ON public.live_cues
  FOR SELECT TO authenticated USING (auth.uid() = sent_by);

-- 2. pack_sounds: restrict file_path / preview_path column-level access to service_role only.
-- The download-sound edge function uses service_role and streams binary content.
REVOKE SELECT (file_path, preview_path) ON public.pack_sounds FROM anon, authenticated, PUBLIC;

-- 3. SECURITY DEFINER trigger functions should not be publicly executable
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_suggestion_likes_count() FROM anon, authenticated, PUBLIC;

-- 4. realtime.messages: restrict broadcast/presence subscriptions to authenticated users,
-- and explicitly deny private ticket/admin topics so an attacker cannot listen on another user's channel.
DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END$$;

DROP POLICY IF EXISTS "authenticated can read public topics" ON realtime.messages;
DROP POLICY IF EXISTS "authenticated can write public topics" ON realtime.messages;

CREATE POLICY "authenticated can read public topics" ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    realtime.topic() !~ '^(ticket_|admin_ticket_|my_tickets)'
  );

CREATE POLICY "authenticated can write public topics" ON realtime.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    realtime.topic() !~ '^(ticket_|admin_ticket_|my_tickets)'
  );
