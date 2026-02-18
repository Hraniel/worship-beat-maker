import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid, PieChart, Pie, Legend,
} from 'recharts';
import { TrendingUp, ShoppingBag, DollarSign, Package, Users, CreditCard, Zap, Crown } from 'lucide-react';

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

  useEffect(() => {
    (async () => {
      try {
        const [{ data: purchaseData }, { data: packData }] = await Promise.all([
          supabase.from('user_purchases').select('pack_id, user_id, purchased_at'),
          supabase.from('store_packs').select('id, name, price_cents'),
        ]);
        setPurchases(purchaseData || []);
        setPacks(packData || []);
      } catch (e) {
        console.error('Analytics error:', e);
      } finally {
        setLoading(false);
      }
    })();
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

  // Revenue over time for line chart
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
