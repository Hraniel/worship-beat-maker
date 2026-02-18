
-- Tabela de sugestões da comunidade
CREATE TABLE public.community_suggestions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  likes_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de curtidas (uma por usuário por sugestão)
CREATE TABLE public.suggestion_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  suggestion_id uuid NOT NULL REFERENCES public.community_suggestions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (suggestion_id, user_id)
);

-- Habilitar RLS
ALTER TABLE public.community_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestion_likes ENABLE ROW LEVEL SECURITY;

-- Policies: community_suggestions
CREATE POLICY "Anyone can view approved suggestions"
  ON public.community_suggestions FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Admins can view all suggestions"
  ON public.community_suggestions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can create suggestions"
  ON public.community_suggestions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update suggestions"
  ON public.community_suggestions FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete suggestions"
  ON public.community_suggestions FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Policies: suggestion_likes
CREATE POLICY "Anyone can view likes"
  ON public.suggestion_likes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can like"
  ON public.suggestion_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own likes"
  ON public.suggestion_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para atualizar likes_count automaticamente
CREATE OR REPLACE FUNCTION public.update_suggestion_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_suggestions
    SET likes_count = likes_count + 1
    WHERE id = NEW.suggestion_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_suggestions
    SET likes_count = GREATEST(0, likes_count - 1)
    WHERE id = OLD.suggestion_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_suggestion_likes
AFTER INSERT OR DELETE ON public.suggestion_likes
FOR EACH ROW EXECUTE FUNCTION public.update_suggestion_likes_count();

-- Trigger updated_at
CREATE TRIGGER update_community_suggestions_updated_at
BEFORE UPDATE ON public.community_suggestions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
