
CREATE TABLE public.prelaunch_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  full_name text NOT NULL,
  phone text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX prelaunch_leads_email_idx ON public.prelaunch_leads (email);

ALTER TABLE public.prelaunch_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage prelaunch leads"
  ON public.prelaunch_leads FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert prelaunch leads"
  ON public.prelaunch_leads FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view own lead by email"
  ON public.prelaunch_leads FOR SELECT
  USING (true);
