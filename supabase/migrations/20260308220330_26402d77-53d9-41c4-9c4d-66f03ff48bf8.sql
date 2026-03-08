
-- Allow admins to view all user_purchases for analytics
CREATE POLICY "Admins can view all purchases"
ON public.user_purchases
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
