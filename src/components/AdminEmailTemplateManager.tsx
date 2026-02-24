import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Mail, Loader2, Save, Eye, EyeOff, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

interface EmailTemplate {
  id: string;
  template_key: string;
  subject: string;
  body_html: string;
  enabled: boolean;
  updated_at: string;
}

const TEMPLATE_LABELS: Record<string, string> = {
  ticket_received: '📩 Ticket Recebido',
  ticket_in_progress: '🔄 Em Andamento',
  ticket_done: '✅ Finalizado',
  ticket_admin_reply: '💬 Resposta do Admin',
};

const VARIABLES = [
  { key: '{{nome}}', desc: 'Nome do usuário' },
  { key: '{{status}}', desc: 'Status do ticket' },
  { key: '{{pergunta}}', desc: 'Pergunta do ticket' },
  { key: '{{mensagem}}', desc: 'Mensagem do admin' },
  { key: '{{app_url}}', desc: 'URL do app (configurável abaixo)' },
];

const AdminEmailTemplateManager = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, { subject: string; body_html: string }>>({});

  // App URL config
  const [appUrl, setAppUrl] = useState('');
  const [appUrlOriginal, setAppUrlOriginal] = useState('');
  const [savingUrl, setSavingUrl] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('template_key');
      if (error) throw error;
      setTemplates((data || []) as EmailTemplate[]);
    } catch {
      toast.error('Erro ao carregar templates.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAppUrl = async () => {
    const { data } = await supabase
      .from('landing_config')
      .select('config_value')
      .eq('config_key', 'app_url')
      .maybeSingle();
    const url = data?.config_value || 'https://worship-beat-maker.lovable.app';
    setAppUrl(url);
    setAppUrlOriginal(url);
  };

  useEffect(() => { fetchTemplates(); fetchAppUrl(); }, []);

  const saveAppUrl = async () => {
    if (!appUrl.trim()) return;
    setSavingUrl(true);
    try {
      const { data: existing } = await supabase
        .from('landing_config')
        .select('id')
        .eq('config_key', 'app_url')
        .maybeSingle();

      if (existing) {
        await supabase.from('landing_config').update({ config_value: appUrl.trim() } as any).eq('config_key', 'app_url');
      } else {
        await supabase.from('landing_config').insert({ config_key: 'app_url', config_value: appUrl.trim() } as any);
      }
      setAppUrlOriginal(appUrl.trim());
      toast.success('URL do app salva!');
    } catch {
      toast.error('Erro ao salvar URL.');
    } finally {
      setSavingUrl(false);
    }
  };

  const startEdit = (t: EmailTemplate) => {
    setEdits(prev => ({ ...prev, [t.id]: { subject: t.subject, body_html: t.body_html } }));
    setEditingId(t.id);
  };

  const handleSave = async (id: string) => {
    const edit = edits[id];
    if (!edit) return;
    setSaving(id);
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({ subject: edit.subject, body_html: edit.body_html } as any)
        .eq('id', id);
      if (error) throw error;
      toast.success('Template salvo!');
      setEditingId(null);
      fetchTemplates();
    } catch {
      toast.error('Erro ao salvar template.');
    } finally {
      setSaving(null);
    }
  };

  const toggleEnabled = async (t: EmailTemplate) => {
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({ enabled: !t.enabled } as any)
        .eq('id', t.id);
      if (error) throw error;
      toast.success(t.enabled ? 'Template desativado' : 'Template ativado');
      fetchTemplates();
    } catch {
      toast.error('Erro ao atualizar status.');
    }
  };

  const getPreviewHtml = (t: EmailTemplate) => {
    const edit = edits[t.id];
    const html = edit ? edit.body_html : t.body_html;
    return html
      .replace(/\{\{nome\}\}/g, 'João Silva')
      .replace(/\{\{status\}\}/g, 'Em Andamento')
      .replace(/\{\{pergunta\}\}/g, 'Como importar sons personalizados?')
      .replace(/\{\{mensagem\}\}/g, 'Olá! Já resolvemos seu problema. Atualize o app e tente novamente.')
      .replace(/\{\{app_url\}\}/g, appUrl || 'https://worship-beat-maker.lovable.app');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Mail className="h-4 w-4" /> Templates de E-mail
        </h3>
      </div>

      {/* App URL Config */}
      <div className="border border-border rounded-xl p-4 bg-card space-y-2">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold text-foreground">URL do App (para botões dos e-mails)</span>
        </div>
        <div className="flex gap-2">
          <Input
            value={appUrl}
            onChange={e => setAppUrl(e.target.value)}
            placeholder="https://seuapp.com"
            className="text-xs h-8 flex-1"
          />
          <Button
            size="sm"
            className="text-xs h-8"
            onClick={saveAppUrl}
            disabled={savingUrl || appUrl === appUrlOriginal}
          >
            {savingUrl ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
            Salvar
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Esta URL substitui <code className="bg-muted px-1 rounded">{'{{app_url}}'}</code> em todos os templates. Ex: links de "Meus Tickets".
        </p>
      </div>

      {/* Available variables */}
      <div className="bg-muted/50 rounded-lg p-3">
        <p className="text-[10px] font-semibold text-muted-foreground mb-1.5">Variáveis disponíveis:</p>
        <div className="flex flex-wrap gap-2">
          {VARIABLES.map(v => (
            <code key={v.key} className="text-[10px] bg-background px-1.5 py-0.5 rounded border border-border text-foreground">
              {v.key} <span className="text-muted-foreground">= {v.desc}</span>
            </code>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : templates.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-8">Nenhum template encontrado.</p>
      ) : (
        <div className="space-y-3">
          {templates.map(t => (
            <div key={t.id} className="border border-border rounded-xl p-4 bg-card space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  {TEMPLATE_LABELS[t.template_key] || t.template_key}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">{t.enabled ? 'Ativo' : 'Inativo'}</span>
                  <Switch checked={t.enabled} onCheckedChange={() => toggleEnabled(t)} />
                </div>
              </div>

              {editingId === t.id ? (
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground">Assunto</label>
                    <Input
                      value={edits[t.id]?.subject || ''}
                      onChange={e => setEdits(prev => ({ ...prev, [t.id]: { ...prev[t.id], subject: e.target.value } }))}
                      className="text-xs h-8"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground">Corpo HTML</label>
                    <textarea
                      value={edits[t.id]?.body_html || ''}
                      onChange={e => setEdits(prev => ({ ...prev, [t.id]: { ...prev[t.id], body_html: e.target.value } }))}
                      className="w-full h-40 px-3 py-2 text-xs rounded-lg bg-background text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-ring resize-y font-mono"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setEditingId(null)}>Cancelar</Button>
                    <Button size="sm" className="text-xs h-7" onClick={() => handleSave(t.id)} disabled={saving === t.id}>
                      <Save className="h-3 w-3 mr-1" /> Salvar
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setPreviewId(previewId === t.id ? null : t.id)}>
                      {previewId === t.id ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                      {previewId === t.id ? 'Fechar Preview' : 'Preview'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground"><strong>Assunto:</strong> {t.subject}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => startEdit(t)}>
                      ✏️ Editar
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setPreviewId(previewId === t.id ? null : t.id)}>
                      {previewId === t.id ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                      Preview
                    </Button>
                  </div>
                </div>
              )}

              {/* Preview */}
              {previewId === t.id && (
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="bg-muted px-3 py-1.5">
                    <p className="text-[10px] text-muted-foreground">Preview com dados de exemplo</p>
                  </div>
                  <div
                    className="p-4 bg-white text-black text-xs"
                    dangerouslySetInnerHTML={{ __html: getPreviewHtml(t) }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminEmailTemplateManager;
