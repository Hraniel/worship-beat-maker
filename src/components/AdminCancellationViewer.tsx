import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, TrendingDown, Calendar } from 'lucide-react';

interface CancellationReason {
  id: string;
  user_id: string;
  reason: string;
  detail: string | null;
  tier_at_cancellation: string | null;
  created_at: string;
}

const REASON_LABELS: Record<string, string> = {
  too_expensive: '💰 Muito caro',
  not_using: '😴 Não estou usando',
  missing_features: '🔧 Faltam funcionalidades',
  found_alternative: '🔄 Encontrei alternativa',
  temporary: '⏸️ Pausa temporária',
  other: '📝 Outro',
};

const AdminCancellationViewer: React.FC = () => {
  const [reasons, setReasons] = useState<CancellationReason[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.from('cancellation_reasons').select('*').order('created_at', { ascending: false }).limit(100);
        if (error) throw error;
        setReasons((data as CancellationReason[]) ?? []);
      } catch (e: any) { toast.error(e.message); }
      finally { setLoading(false); }
    })();
  }, []);

  const groupStyle = { border: '1px solid hsl(0 0% 100% / 0.08)', background: 'hsl(0 0% 100% / 0.02)' };

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'hsl(262 75% 65%)' }} />
    </div>
  );

  // Stats
  const reasonCounts: Record<string, number> = {};
  reasons.forEach(r => { reasonCounts[r.reason] = (reasonCounts[r.reason] || 0) + 1; });
  const sortedReasons = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-4">
      <p className="text-[11px]" style={{ color: 'hsl(0 0% 100% / 0.4)' }}>
        Motivos de cancelamento ({reasons.length} registros)
      </p>

      {/* Summary */}
      {sortedReasons.length > 0 && (
        <div className="rounded-xl p-4 space-y-2" style={groupStyle}>
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'hsl(262 75% 65%)' }}>📊 Resumo</p>
          <div className="space-y-1.5">
            {sortedReasons.map(([reason, count]) => (
              <div key={reason} className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'hsl(0 0% 100% / 0.7)' }}>
                  {REASON_LABELS[reason] || reason}
                </span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 rounded-full" style={{
                    width: `${Math.max(20, (count / reasons.length) * 150)}px`,
                    background: 'hsl(262 75% 55% / 0.4)',
                  }} />
                  <span className="text-[10px] font-mono" style={{ color: 'hsl(0 0% 100% / 0.5)' }}>{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {reasons.length === 0 && (
        <div className="rounded-xl p-8 text-center" style={groupStyle}>
          <TrendingDown className="h-8 w-8 mx-auto mb-2" style={{ color: 'hsl(142 70% 50% / 0.5)' }} />
          <p className="text-xs" style={{ color: 'hsl(0 0% 100% / 0.5)' }}>Nenhum cancelamento registrado.</p>
        </div>
      )}

      {/* List */}
      {reasons.map(r => (
        <div key={r.id} className="rounded-xl p-3 space-y-1" style={groupStyle}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium" style={{ color: 'hsl(0 0% 100% / 0.8)' }}>
              {REASON_LABELS[r.reason] || r.reason}
            </span>
            {r.tier_at_cancellation && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 font-medium">
                {r.tier_at_cancellation}
              </span>
            )}
          </div>
          {r.detail && <p className="text-[10px]" style={{ color: 'hsl(0 0% 100% / 0.5)' }}>"{r.detail}"</p>}
          <div className="flex items-center gap-2 text-[9px]" style={{ color: 'hsl(0 0% 100% / 0.3)' }}>
            <Calendar className="h-2.5 w-2.5" />
            {new Date(r.created_at).toLocaleDateString('pt-BR')}
            <span className="font-mono">{r.user_id.slice(0, 8)}...</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdminCancellationViewer;
