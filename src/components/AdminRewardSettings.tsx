import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Gift, Loader2, Save } from 'lucide-react';

export default function AdminRewardSettings() {
  const [enabled, setEnabled] = useState(false);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('app_config')
        .select('config_key, config_value')
        .in('config_key', ['profile_completion_reward_enabled', 'profile_completion_reward_days']);
      data?.forEach(c => {
        if (c.config_key === 'profile_completion_reward_enabled') setEnabled(c.config_value === 'true');
        if (c.config_key === 'profile_completion_reward_days') setDays(parseInt(c.config_value) || 7);
      });
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const rows = [
        { config_key: 'profile_completion_reward_enabled', config_value: String(enabled) },
        { config_key: 'profile_completion_reward_days', config_value: String(days) },
      ];
      for (const row of rows) {
        await supabase.from('app_config').upsert(
          { ...row, updated_at: new Date().toISOString() },
          { onConflict: 'config_key' }
        );
      }
      toast.success('Configurações de premiação salvas!');
    } catch {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Gift className="h-4 w-4 text-amber-400" />
        <h3 className="text-sm font-bold text-white">Premiação por Perfil Completo</h3>
      </div>
      <p className="text-xs text-gray-400">
        Quando ativado, usuários Pro/Master que completarem o perfil (nome, CPF, telefone, aniversário) recebem dias extras de acesso gratuito.
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setEnabled(!enabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? 'bg-emerald-500' : 'bg-slate-600'
          }`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`} />
        </button>
        <span className="text-xs text-gray-300">{enabled ? 'Ativado' : 'Desativado'}</span>
      </div>

      {enabled && (
        <div className="space-y-2">
          <label className="text-[10px] text-gray-500 uppercase tracking-wide">Dias de recompensa</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={365}
              value={days}
              onChange={e => setDays(Math.max(1, Math.min(365, Number(e.target.value))))}
              className="w-20 h-8 px-3 text-xs rounded-lg bg-slate-800 border border-slate-600 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <span className="text-xs text-gray-400">dias grátis</span>
          </div>
        </div>
      )}

      <Button
        onClick={handleSave}
        disabled={saving}
        size="sm"
        className="h-8 text-xs bg-indigo-600 hover:bg-indigo-500 text-white"
      >
        {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
        Salvar configurações
      </Button>
    </div>
  );
}
