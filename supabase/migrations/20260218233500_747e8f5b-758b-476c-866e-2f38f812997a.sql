
-- Table for cancellation reasons (when user cancels subscription)
CREATE TABLE IF NOT EXISTS public.cancellation_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reason text NOT NULL,
  detail text,
  tier_at_cancellation text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.cancellation_reasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own cancellation reasons"
  ON public.cancellation_reasons FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all cancellation reasons"
  ON public.cancellation_reasons FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Table for user bans
CREATE TABLE IF NOT EXISTS public.user_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  ip_address text,
  reason text,
  banned_by uuid NOT NULL,
  ban_type text NOT NULL DEFAULT 'permanent', -- 'permanent' | 'temporary'
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage bans"
  ON public.user_bans FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Table for granted free tiers (admin grant)
CREATE TABLE IF NOT EXISTS public.granted_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  tier text NOT NULL DEFAULT 'pro', -- 'pro' | 'master'
  granted_by uuid NOT NULL,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone
);

ALTER TABLE public.granted_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own granted tier"
  ON public.granted_tiers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage granted tiers"
  ON public.granted_tiers FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Table for in-app notifications
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  target text NOT NULL DEFAULT 'all', -- 'all' | specific user_id
  target_user_id uuid,
  sent_by uuid NOT NULL,
  channels text[] NOT NULL DEFAULT ARRAY['in-app'],
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notifications"
  ON public.admin_notifications FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Table for user notification reads (to track what users have seen)
CREATE TABLE IF NOT EXISTS public.user_notification_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.admin_notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (notification_id, user_id)
);

ALTER TABLE public.user_notification_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own reads"
  ON public.user_notification_reads FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to view notifications targeted to them or all
CREATE POLICY "Users can view relevant notifications"
  ON public.admin_notifications FOR SELECT
  USING (
    target = 'all' OR target_user_id = auth.uid()
  );
