import React, { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid, PieChart, Pie, Legend,
} from 'recharts';
import {
  TrendingUp, ShoppingBag, DollarSign, Package, Users, CreditCard,
  Zap, Crown, Radio, AlertCircle, MessageSquare,
} from 'lucide-react';

interface Purchase {
  pack_id: string;
  user_id: string;
  purchased_at: string;
}

interface Pack {
  id: string;
  name: string;
  price_cents: number;
}

interface SubscriptionStats {
  pro_count: number;
  master_count: number;
  total_mrr: number;
}

interface CancellationReason {
  id: string;
  reason: string;
  detail: string | null;
  tier_at_cancellation: string | null;
  created_at: string;
}

type Period = 'week' | 'month' | 'year' | 'all';

const COLORS = ['hsl(262,80%,55%)', 'hsl(200,75%,50%)', 'hsl(140,60%,45%)', 'hsl(30,85%,55%)', 'hsl(340,70%,55%)', 'hsl(50,80%,50%)'];

const getPeriodStart = (period: Period): Date | null => {
  if (period === 'all') return null;
  const now = new Date();
  if (period === 'week') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (period === 'month') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (period === 'year') return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  return null;
};

const formatDate = (dateStr: string, period: Period) => {
  const d = new Date(dateStr);
  if (period === 'year') return d.toLocaleDateString('pt-BR', { month: 'short' });
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const AdminAnalytics: React.FC = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [subStats, setSubStats] = useState<SubscriptionStats | null>(null);
  const [subLoading, setSubLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('month');
  const [onlineCount, setOnlineCount] = useState(0);
  const [cancellations, setCancellations] = useState<CancellationReason[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [refreshingOnline, setRefreshingOnline] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [{ data: purchaseData }, { data: packData }, { data: cancelData }] = await Promise.all([
          supabase.from('user_purchases').select('pack_id, user_id, purchased_at'),
          supabase.from('store_packs').select('id, name, price_cents'),
          supabase.from('cancellation_reasons' as any).select('*').order('created_at', { ascending: false }).limit(50),
        ]);
        setPurchases(purchaseData || []);
        setPacks(packData || []);
        setCancellations((cancelData as any[]) || []);
      } catch (e) {
        console.error('Analytics error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Real-time online users via Supabase Presence
  useEffect(() => {
    const channel = supabase.channel('admin-presence-tracker', {
      config: { presence: { key: 'admin-observer' } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        // Count unique users (excluding the admin observer itself)
        const count = Object.keys(state).filter(k => k !== 'admin-observer').length;
        setOnlineCount(count);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ role: 'admin-observer', timestamp: new Date().toISOString() });
        }
      });

    channelRef.current = channel;
    return () => {
      channel.unsubscribe();
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        const token = session?.session?.access_token;
        if (!token) return;
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const resp = await fetch(`https://${projectId}.supabase.co/functions/v1/subscription-stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resp.ok) {
          const json = await resp.json();
          setSubStats(json);
        }
      } catch (e) {
        console.error('Subscription stats error:', e);
      } finally {
        setSubLoading(false);
      }
    })();
  }, []);

  const filteredPurchases = useMemo(() => {
    const start = getPeriodStart(period);
    if (!start) return purchases;
    return purchases.filter(p => new Date(p.purchased_at) >= start);
  }, [purchases, period]);

  const analytics = useMemo(() => {
    const packMap = new Map(packs.map(p => [p.id, p]));
    const purchasesByPack = new Map<string, number>();
    const userSet = new Set<string>();

    filteredPurchases.forEach(p => {
      purchasesByPack.set(p.pack_id, (purchasesByPack.get(p.pack_id) || 0) + 1);
      userSet.add(p.user_id);
    });

    const packStats = packs.map(p => ({
      name: p.name.length > 14 ? p.name.slice(0, 14) + '…' : p.name,
      purchases: purchasesByPack.get(p.id) || 0,
      revenue: (purchasesByPack.get(p.id) || 0) * (p.price_cents / 100),
    })).sort((a, b) => b.purchases - a.purchases);

    const totalPurchases = filteredPurchases.length;
    const totalRevenue = filteredPurchases.reduce((sum, p) => {
      const pack = packMap.get(p.pack_id);
      return sum + (pack?.price_cents || 0) / 100;
    }, 0);

    return { packStats, totalPurchases, totalRevenue, totalBuyers: userSet.size };
  }, [filteredPurchases, packs]);

  const revenueOverTime = useMemo(() => {
    const packMap = new Map(packs.map(p => [p.id, p]));
    const byDate = new Map<string, number>();
    filteredPurchases.forEach(p => {
      const key = formatDate(p.purchased_at, period);
      const price = (packMap.get(p.pack_id)?.price_cents || 0) / 100;
      byDate.set(key, (byDate.get(key) || 0) + price);
    });
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, revenue]) => ({ date, revenue: parseFloat(revenue.toFixed(2)) }));
  }, [filteredPurchases, packs, period]);

  // Cancellation reasons aggregated
  const cancellationStats = useMemo(() => {
    const counts = new Map<string, number>();
    cancellations.forEach(c => {
      counts.set(c.reason, (counts.get(c.reason) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([reason, count]) => ({ reason: reason.length > 20 ? reason.slice(0, 20) + '…' : reason, count }));
  }, [cancellations]);

  const PERIOD_LABELS: Record<Period, string> = {
    week: 'Semana', month: 'Mês', year: 'Ano', all: 'Tudo',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  const kpis = [
    { label: 'Receita', value: `R$ ${analytics.totalRevenue.toFixed(2)}`, icon: DollarSign, color: 'text-emerald-400' },
    { label: 'Compras', value: analytics.totalPurchases, icon: ShoppingBag, color: 'text-blue-400' },
    { label: 'Compradores', value: analytics.totalBuyers, icon: Users, color: 'text-violet-400' },
    { label: 'Packs', value: analytics.packStats.length, icon: Package, color: 'text-orange-400' },
  ];

  const pieData = subStats ? [
    { name: 'Pro', value: subStats.pro_count, fill: 'hsl(262,80%,55%)' },
    { name: 'Master', value: subStats.master_count, fill: 'hsl(40,85%,55%)' },
    { name: 'Free', value: Math.max(0, (analytics.totalBuyers || 1) - subStats.pro_count - subStats.master_count), fill: 'hsl(215,15%,40%)' },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="space-y-4">
      {/* Online users banner */}
      <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5">
        <Radio className="h-4 w-4 text-emerald-400 animate-pulse" />
        <p className="text-xs font-semibold text-emerald-400">
          {onlineCount} usuário{onlineCount !== 1 ? 's' : ''} online agora
        </p>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex gap-1">
            {Array.from({ length: Math.min(onlineCount, 5) }).map((_, i) => (
              <div key={i} className="h-2 w-2 rounded-full bg-emerald-400" />
            ))}
          </div>
          <button
            onClick={() => {
              setRefreshingOnline(true);
              const ch = channelRef.current;
              if (ch) {
                const state = ch.presenceState();
                const count = Object.keys(state).filter(k => k !== 'admin-observer').length;
                setOnlineCount(count);
              }
              setTimeout(() => setRefreshingOnline(false), 600);
            }}
            className="p-1 rounded-md hover:bg-emerald-500/20 transition-colors"
            title="Atualizar contagem"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 text-emerald-400 ${refreshingOnline ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Period filter chips */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide mr-1">Período:</span>
        {(['week', 'month', 'year', 'all'] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors border ${
              period === p
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-2">
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
              <p className="text-lg font-bold text-foreground tabular-nums">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue line chart */}
      {revenueOverTime.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <p className="text-xs font-semibold text-foreground">Receita ao Longo do Tempo</p>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={revenueOverTime} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 6% 18%)" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(215 15% 55%)' }} />
              <YAxis tick={{ fontSize: 9, fill: 'hsl(215 15% 55%)' }} />
              <Tooltip
                contentStyle={{ background: 'hsl(240 8% 10%)', border: '1px solid hsl(240 6% 18%)', borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: 'hsl(210 20% 92%)' }}
                itemStyle={{ color: 'hsl(140,60%,55%)' }}
                formatter={(v: number) => [`R$ ${v.toFixed(2)}`, 'Receita']}
              />
              <Line type="monotone" dataKey="revenue" stroke="hsl(140,60%,45%)" strokeWidth={2} dot={{ r: 3, fill: 'hsl(140,60%,45%)' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Subscriptions Section */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="h-4 w-4 text-primary" />
          <p className="text-xs font-semibold text-foreground">Assinaturas Ativas</p>
        </div>
        {subLoading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
          </div>
        ) : subStats ? (
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-violet-400" />
                  <span className="text-xs text-muted-foreground">Pro</span>
                </div>
                <span className="text-sm font-bold text-foreground tabular-nums">{subStats.pro_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Crown className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-xs text-muted-foreground">Master</span>
                </div>
                <span className="text-sm font-bold text-foreground tabular-nums">{subStats.master_count}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">MRR Estimado</span>
                <span className="text-sm font-bold text-emerald-400 tabular-nums">R$ {subStats.total_mrr.toFixed(2)}</span>
              </div>
            </div>
            {pieData.length > 0 && (
              <ResponsiveContainer width={100} height={100}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={45} innerRadius={25}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: 'hsl(240 8% 10%)', border: '1px solid hsl(240 6% 18%)', borderRadius: 8, fontSize: 10 }}
                    labelStyle={{ color: 'hsl(210 20% 92%)' }}
                    itemStyle={{ color: 'hsl(210 20% 92%)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-2">Dados de assinatura indisponíveis</p>
        )}
      </div>

      {/* Cancellation reasons */}
      {cancellations.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-4 w-4 text-orange-400" />
            <p className="text-xs font-semibold text-foreground">Motivos de Cancelamento</p>
            <span className="ml-auto text-[10px] text-muted-foreground">{cancellations.length} total</span>
          </div>
          {cancellationStats.length > 0 && (
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={cancellationStats} margin={{ top: 2, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="reason" tick={{ fontSize: 8, fill: 'hsl(215 15% 55%)' }} />
                <YAxis tick={{ fontSize: 8, fill: 'hsl(215 15% 55%)' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: 'hsl(240 8% 10%)', border: '1px solid hsl(240 6% 18%)', borderRadius: 8, fontSize: 10 }}
                  labelStyle={{ color: 'hsl(210 20% 92%)' }}
                />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {cancellationStats.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          {/* Recent details */}
          <div className="mt-3 space-y-1.5 max-h-32 overflow-y-auto">
            {cancellations.slice(0, 8).map(c => (
              <div key={c.id} className="flex items-start gap-2">
                <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">{c.reason}</span>
                {c.detail && <span className="text-[10px] text-muted-foreground truncate">{c.detail}</span>}
                <span className="ml-auto text-[9px] text-muted-foreground shrink-0">{new Date(c.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bar chart */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-primary" />
          <p className="text-xs font-semibold text-foreground">Compras por Pack</p>
        </div>
        {analytics.packStats.filter(p => p.purchases > 0).length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Nenhuma compra no período selecionado</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={analytics.packStats} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(215 15% 55%)' }} />
              <YAxis tick={{ fontSize: 9, fill: 'hsl(215 15% 55%)' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: 'hsl(240 8% 10%)', border: '1px solid hsl(240 6% 18%)', borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: 'hsl(210 20% 92%)' }}
                itemStyle={{ color: 'hsl(210 20% 92%)' }}
              />
              <Bar dataKey="purchases" radius={[4, 4, 0, 0]}>
                {analytics.packStats.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Pack ranking */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-2 border-b border-border">
          <p className="text-xs font-semibold text-foreground">Ranking de Packs</p>
        </div>
        <div className="divide-y divide-border">
          {analytics.packStats.map((pack, i) => (
            <div key={pack.name} className="flex items-center gap-3 px-4 py-2.5">
              <span className="text-xs font-bold text-muted-foreground w-5 text-right">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{pack.name}</p>
              </div>
              <span className="text-xs text-muted-foreground">{pack.purchases} compras</span>
              <span className="text-xs font-semibold text-emerald-400 min-w-[60px] text-right">R$ {pack.revenue.toFixed(2)}</span>
            </div>
          ))}
          {analytics.packStats.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhuma compra ainda</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
