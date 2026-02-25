
-- Fix RLS policies: change from RESTRICTIVE to PERMISSIVE for all help center tables
-- The current RESTRICTIVE-only policies block ALL access since PostgreSQL requires at least one PERMISSIVE policy to allow rows

-- help_categories
DROP POLICY IF EXISTS "Admins can manage help categories" ON public.help_categories;
DROP POLICY IF EXISTS "Anyone can view help categories" ON public.help_categories;
CREATE POLICY "Admins can manage help categories" ON public.help_categories FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view help categories" ON public.help_categories FOR SELECT USING (true);

-- help_articles
DROP POLICY IF EXISTS "Admins can manage help articles" ON public.help_articles;
DROP POLICY IF EXISTS "Anyone can view help articles" ON public.help_articles;
CREATE POLICY "Admins can manage help articles" ON public.help_articles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view help articles" ON public.help_articles FOR SELECT USING (true);

-- help_steps
DROP POLICY IF EXISTS "Admins can manage help steps" ON public.help_steps;
DROP POLICY IF EXISTS "Anyone can view help steps" ON public.help_steps;
CREATE POLICY "Admins can manage help steps" ON public.help_steps FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view help steps" ON public.help_steps FOR SELECT USING (true);

-- help_faqs
DROP POLICY IF EXISTS "Admins can manage help faqs" ON public.help_faqs;
DROP POLICY IF EXISTS "Anyone can view help faqs" ON public.help_faqs;
CREATE POLICY "Admins can manage help faqs" ON public.help_faqs FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view help faqs" ON public.help_faqs FOR SELECT USING (true);

-- Add media columns to help_steps
ALTER TABLE public.help_steps ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.help_steps ADD COLUMN IF NOT EXISTS video_url text;
