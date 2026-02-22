import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Shield, Trash2, UserX, Clock } from 'lucide-react';

interface Ban {
  id: string;
  user_id: string;
  email: string;
  reason: string | null;
  ban_type: string;
  expires_at: string | null;
  created_at: string;
  ip_address: string | null;
}

const AdminBanManager: React.FC = () => {
  const [bans, setBans] = useState<Ban[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBans = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('user_bans').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setBans((data as Ban[]) ?? []);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBans(); }, []);

  const handleUnban = async (id: string) => {
    if (!confirm('Remover este banimento?')) return;
    try {
      const { error } = await supabase.from('user_bans').delete().eq('id', id);
      if (error) throw error;
      setBans(prev => prev.filter(b => b.id !== id));
      toast.success('Banimento removido');
    } catch (e: any) { toast.error(e.message); }
  };

  const groupStyle = { border: '1px solid hsl(0 0% 100% / 0.08)', background: 'hsl(0 0% 100% / 0.02)' };

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'hsl(262 75% 65%)' }} />
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px]" style={{ color: 'hsl(0 0% 100% / 0.4)' }}>
          Usuários banidos ({bans.length})
        </p>
      </div>

      {bans.length === 0 && (
        <div className="rounded-xl p-8 text-center" style={groupStyle}>
          <Shield className="h-8 w-8 mx-auto mb-2" style={{ color: 'hsl(142 70% 50% / 0.5)' }} />
          <p className="text-xs" style={{ color: 'hsl(0 0% 100% / 0.5)' }}>Nenhum banimento ativo.</p>
        </div>
      )}

      {bans.map(ban => {
        const isExpired = ban.expires_at && new Date(ban.expires_at) < new Date();
        return (
          <div key={ban.id} className="rounded-xl p-3 space-y-1.5" style={groupStyle}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserX className="h-3.5 w-3.5" style={{ color: 'hsl(0 70% 60%)' }} />
                <span className="text-xs font-medium" style={{ color: 'hsl(0 0% 100% / 0.9)' }}>{ban.email}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                  ban.ban_type === 'permanent' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'
                }`}>
                  {ban.ban_type === 'permanent' ? 'Permanente' : 'Temporário'}
                </span>
                {isExpired && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 font-medium">Expirado</span>}
              </div>
              <button onClick={() => handleUnban(ban.id)} className="p-1.5 rounded-lg transition hover:bg-red-500/20"
                style={{ color: 'hsl(0 70% 60%)' }} title="Remover ban">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            {ban.reason && <p className="text-[10px]" style={{ color: 'hsl(0 0% 100% / 0.5)' }}>Motivo: {ban.reason}</p>}
            <div className="flex items-center gap-3 text-[9px]" style={{ color: 'hsl(0 0% 100% / 0.3)' }}>
              <span><Clock className="h-2.5 w-2.5 inline mr-0.5" />{new Date(ban.created_at).toLocaleDateString('pt-BR')}</span>
              {ban.expires_at && <span>Expira: {new Date(ban.expires_at).toLocaleDateString('pt-BR')}</span>}
              {ban.ip_address && <span>IP: {ban.ip_address}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AdminBanManager;
