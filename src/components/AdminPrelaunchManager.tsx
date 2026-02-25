import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { Rocket, Users, Download, Loader2, Clock, Mail, Phone, User, MessageSquare, Wrench, CalendarIcon, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Lead {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  created_at: string;
}

const AdminPrelaunchManager: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [launchDate, setLaunchDate] = useState('');
  const [launchTime, setLaunchTime] = useState('12:00');
  const [customMessage, setCustomMessage] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
    loadLeads();
  }, []);

  const loadConfig = async () => {
    const { data } = await supabase
      .from('landing_config')
      .select('config_key, config_value')
      .in('config_key', ['prelaunch_enabled', 'prelaunch_date', 'prelaunch_custom_message', 'maintenance_enabled']);

    const map: Record<string, string> = {};
    data?.forEach((r: any) => { map[r.config_key] = r.config_value; });

    setEnabled(map.prelaunch_enabled === 'true');
    setMaintenanceEnabled(map.maintenance_enabled === 'true');
    setCustomMessage(map.prelaunch_custom_message || '');

    if (map.prelaunch_date) {
      const d = new Date(map.prelaunch_date);
      setLaunchDate(map.prelaunch_date);
      setLaunchTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    }

    setLoading(false);
  };

  const loadLeads = async () => {
    const { data } = await supabase
      .from('prelaunch_leads' as any)
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setLeads(data as any);
  };

  const saveConfig = async (key: string, value: string) => {
    setSaving(true);
    const { data: existing } = await supabase
      .from('landing_config')
      .select('id')
      .eq('config_key', key)
      .maybeSingle();

    if (existing) {
      await supabase.from('landing_config').update({ config_value: value }).eq('config_key', key);
    } else {
      await supabase.from('landing_config').insert({ config_key: key, config_value: value });
    }
    setSaving(false);
    toast.success('Salvo!');
  };

  const handleToggle = async (val: boolean) => {
    setEnabled(val);
    await saveConfig('prelaunch_enabled', val ? 'true' : 'false');
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    const [hours, minutes] = launchTime.split(':').map(Number);
    date.setHours(hours, minutes, 0, 0);
    const iso = date.toISOString();
    setLaunchDate(iso);
    saveConfig('prelaunch_date', iso);
  };

  const handleTimeChange = (time: string) => {
    setLaunchTime(time);
    if (!launchDate) return;
    const d = new Date(launchDate);
    const [hours, minutes] = time.split(':').map(Number);
    d.setHours(hours, minutes, 0, 0);
    const iso = d.toISOString();
    setLaunchDate(iso);
    saveConfig('prelaunch_date', iso);
  };

  const handleDeleteLead = async (id: string) => {
    setDeletingId(id);
    await supabase.from('prelaunch_leads' as any).delete().eq('id', id);
    setLeads(prev => prev.filter(l => l.id !== id));
    setDeletingId(null);
    toast.success('Lead removido!');
  };

  const exportCSV = () => {
    const header = 'Nome,Email,Telefone,Data\n';
    const rows = leads.map(l =>
      `"${l.full_name}","${l.email}","${l.phone}","${new Date(l.created_at).toLocaleDateString('pt-BR')}"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prelaunch-leads.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedCalendarDate = launchDate ? new Date(launchDate) : undefined;

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-indigo-400" /></div>;

  return (
    <div className="space-y-6">
      {/* Toggle + Date */}
      <div className="rounded-xl border border-indigo-500/20 bg-slate-900/50 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="h-4 w-4 text-indigo-400" />
            <span className="text-sm font-semibold text-indigo-300">Modo Pré-lançamento</span>
          </div>
          <Switch checked={enabled} onCheckedChange={handleToggle} />
        </div>

        {enabled && (
          <div className="space-y-4 pt-2 border-t border-indigo-500/10">
            {/* Custom message */}
            <div>
              <Label className="text-xs text-gray-400 flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                Mensagem personalizada
              </Label>
              <div className="flex gap-2 mt-1">
                <Textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Ex: Estamos em manutenção, voltamos em breve!"
                  className="flex-1 bg-slate-800 border-indigo-500/20 text-white text-sm min-h-[60px]"
                />
                <Button size="sm" onClick={() => saveConfig('prelaunch_custom_message', customMessage)} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 self-end">
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Salvar'}
                </Button>
              </div>
            </div>

            {/* Date + Time picker */}
            <div>
              <Label className="text-xs text-gray-400">Data e Hora de Lançamento (opcional)</Label>
              <div className="flex gap-2 mt-1 items-center">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal bg-slate-800 border-indigo-500/20 text-white text-sm hover:bg-slate-700",
                        !launchDate && "text-gray-500"
                      )}
                    >
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {selectedCalendarDate
                        ? format(selectedCalendarDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                        : 'Selecione a data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedCalendarDate}
                      onSelect={handleDateSelect}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type="time"
                  value={launchTime}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  className="w-24 bg-slate-800 border-indigo-500/20 text-white text-sm"
                />
              </div>
            </div>

            {launchDate && (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Clock className="h-3 w-3" />
                <span>Lançamento: {new Date(launchDate).toLocaleString('pt-BR')}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Maintenance Mode */}
      <div className="rounded-xl border border-amber-500/20 bg-slate-900/50 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-semibold text-amber-300">Modo Manutenção</span>
          </div>
          <Switch
            checked={maintenanceEnabled}
            onCheckedChange={async (val) => {
              setMaintenanceEnabled(val);
              await saveConfig('maintenance_enabled', val ? 'true' : 'false');
            }}
          />
        </div>
        <p className="text-[10px] text-gray-500">
          Quando ativado: login bloqueado para todos (exceto admins), logout desabilitado, limpeza de cache desabilitada e atualizações não são recebidas. As alterações são aplicadas em tempo real.
        </p>
      </div>

      {/* Leads */}
      <div className="rounded-xl border border-indigo-500/20 bg-slate-900/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-400" />
            <span className="text-sm font-semibold text-indigo-300">
              Leads pré-cadastrados ({leads.length})
            </span>
          </div>
          {leads.length > 0 && (
            <Button size="sm" variant="outline" onClick={exportCSV} className="text-xs border-indigo-500/30 text-indigo-300 hover:bg-indigo-950/50">
              <Download className="h-3 w-3 mr-1" />
              Exportar CSV
            </Button>
          )}
        </div>

        {leads.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-4">Nenhum lead cadastrado ainda.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {leads.map((lead) => (
              <div key={lead.id} className="flex items-center gap-3 bg-slate-800/50 rounded-lg px-3 py-2 text-xs">
                <User className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{lead.full_name}</p>
                  <div className="flex items-center gap-3 text-gray-400">
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{lead.email}</span>
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</span>
                  </div>
                </div>
                <span className="text-gray-500 shrink-0">{new Date(lead.created_at).toLocaleDateString('pt-BR')}</span>
                <button
                  onClick={() => handleDeleteLead(lead.id)}
                  disabled={deletingId === lead.id}
                  className="p-1 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors shrink-0"
                  title="Remover lead"
                >
                  {deletingId === lead.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPrelaunchManager;
