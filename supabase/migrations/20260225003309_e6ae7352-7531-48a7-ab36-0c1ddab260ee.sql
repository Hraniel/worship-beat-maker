
-- Prelaunch whitelist table
CREATE TABLE public.prelaunch_whitelist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  added_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.prelaunch_whitelist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage whitelist" ON public.prelaunch_whitelist
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own whitelist status" ON public.prelaunch_whitelist
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
