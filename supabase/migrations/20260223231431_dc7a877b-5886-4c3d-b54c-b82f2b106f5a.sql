
-- Tabela de templates de e-mail editáveis
CREATE TABLE public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL UNIQUE,
  subject text NOT NULL,
  body_html text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email templates"
ON public.email_templates
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger updated_at
CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seeds com templates padrão em português
INSERT INTO public.email_templates (template_key, subject, body_html) VALUES
('ticket_received', 'Recebemos sua solicitação - Glory Pads', '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px"><h2 style="color:#7c3aed">Olá, {{nome}}! 👋</h2><p>Recebemos sua solicitação de suporte e já estamos cuidando dela.</p><div style="background:#f3f4f6;border-radius:8px;padding:16px;margin:16px 0"><p style="margin:0;font-size:14px;color:#6b7280"><strong>Sua dúvida:</strong></p><p style="margin:8px 0 0;font-size:14px">{{pergunta}}</p></div><p style="font-size:14px;color:#6b7280">Status atual: <strong style="color:#f59e0b">{{status}}</strong></p><p style="font-size:14px">Nossa equipe analisará sua solicitação em breve. Você receberá atualizações por e-mail.</p><hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/><p style="font-size:12px;color:#9ca3af">Glory Pads — <a href="{{app_url}}" style="color:#7c3aed">Acessar o app</a></p></div>'),
('ticket_in_progress', 'Seu ticket está sendo analisado - Glory Pads', '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px"><h2 style="color:#7c3aed">Olá, {{nome}}! 🔍</h2><p>Temos uma atualização sobre sua solicitação de suporte.</p><div style="background:#f3f4f6;border-radius:8px;padding:16px;margin:16px 0"><p style="margin:0;font-size:14px;color:#6b7280"><strong>Sua dúvida:</strong></p><p style="margin:8px 0 0;font-size:14px">{{pergunta}}</p></div><p style="font-size:14px;color:#6b7280">Status atual: <strong style="color:#3b82f6">{{status}}</strong></p><p style="font-size:14px">Nossa equipe já está trabalhando na solução do seu problema. Em breve entraremos em contato com a resposta.</p><hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/><p style="font-size:12px;color:#9ca3af">Glory Pads — <a href="{{app_url}}" style="color:#7c3aed">Acessar o app</a></p></div>'),
('ticket_done', 'Seu ticket foi resolvido - Glory Pads', '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px"><h2 style="color:#7c3aed">Olá, {{nome}}! ✅</h2><p>Sua solicitação de suporte foi resolvida!</p><div style="background:#f3f4f6;border-radius:8px;padding:16px;margin:16px 0"><p style="margin:0;font-size:14px;color:#6b7280"><strong>Sua dúvida:</strong></p><p style="margin:8px 0 0;font-size:14px">{{pergunta}}</p></div><p style="font-size:14px;color:#6b7280">Status atual: <strong style="color:#22c55e">{{status}}</strong></p><p style="font-size:14px">Se precisar de mais alguma coisa, estamos aqui para ajudar! Acesse o app e abra um novo ticket quando quiser.</p><a href="{{app_url}}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0;font-weight:bold">Acessar Glory Pads</a><hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/><p style="font-size:12px;color:#9ca3af">Glory Pads — <a href="{{app_url}}" style="color:#7c3aed">Acessar o app</a></p></div>');
