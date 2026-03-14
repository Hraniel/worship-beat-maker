
-- 1. Fix prelaunch_leads: remove the overly permissive SELECT policy and replace with a restricted one
DROP POLICY IF EXISTS "Anyone can view own lead by email" ON public.prelaunch_leads;

CREATE POLICY "Users can view own lead"
ON public.prelaunch_leads
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2. Fix user_purchases: remove the INSERT policy that allows self-granting purchases
DROP POLICY IF EXISTS "Users can insert own purchases" ON public.user_purchases;
