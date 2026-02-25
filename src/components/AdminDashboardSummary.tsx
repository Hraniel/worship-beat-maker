import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Package, Users, DollarSign, TrendingDown, Radio, Loader2 } from 'lucide-react';

interface SummaryData {
  totalPacks: number;
  onlineUsers: number;
  mrr: number;
  recentCancellations: number;
}

const AdminDashboardSummary: React.FC = () => {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const load = async () => {
      try {
        // Parallel queries
        const [packsRes, cancelRes] = await Promise.all([
          supabase.from('store_packs').select('id', { count: 'exact', head: true }),
          supabase.from('cancellation_reasons' as any).select('id', { count: 'exact', head: true })
            .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
        ]);

        // MRR from subscription-stats edge function
        let mrr = 0;
        try {
          const { data, error } = await supabase.functions.invoke('subscription-stats');
          if (!error && data?.total_mrr) {
            mrr = data.total_mrr;
          }
        } catch {}

        // Online users via presence - use same channel name as app
        channel = supabase.channel('glory-pads-online', {
          config: { presence: { key: '__summary__' } },
        });

        let onlineCount = 0;

        channel
          .on('presence', { event: 'sync' }, () => {
            const state = channel!.presenceState();
            onlineCount = Object.keys(state).filter(k => k !== '__summary__').length;
            setData(prev => prev ? { ...prev, onlineUsers: onlineCount } : prev);
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              await channel!.track({ user_id: '__summary__', online_at: new Date().toISOString() });
            }
          });

        setData({
          totalPacks: packsRes.count ?? 0,
          onlineUsers: onlineCount,
          mrr,
          recentCancellations: cancelRes.count ?? 0,
        });
      } catch (e) {
        console.error('Dashboard summary error:', e);
      } finally {
        setLoading(false);
      }
    };

    load();

    return () => {
      if (channel) {
        channel.untrack();
        supabase.removeChannel(channel);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  const cards = [
    { label: 'Packs', value: data.totalPacks, icon: Package, color: 'text-violet-400', bg: 'bg-violet-500/10' },
    { label: 'Online', value: data.onlineUsers, icon: Radio, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'MRR', value: `R$ ${data.mrr.toFixed(2)}`, icon: DollarSign, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Cancel. (30d)', value: data.recentCancellations, icon: TrendingDown, color: 'text-rose-400', bg: 'bg-rose-500/10' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
      {cards.map(({ label, value, icon: Icon, color, bg }) => (
        <div key={label} className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-card/50 px-3 py-2.5">
          <div className={`p-1.5 rounded-lg ${bg}`}>
            <Icon className={`h-3.5 w-3.5 ${color}`} />
          </div>
          <div>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="text-sm font-bold text-foreground tabular-nums">{value}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdminDashboardSummary;
