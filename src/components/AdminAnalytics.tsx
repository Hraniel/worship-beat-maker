import React, { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid, PieChart, Pie, Legend,
} from 'recharts';
import {
  TrendingUp, ShoppingBag, DollarSign, Package, Users, CreditCard,
  Zap, Crown, Radio, AlertCircle, ChevronDown, ChevronUp, RefreshCw,
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

interface OnlineUser {
  user_id: string;
  online_at: string;
  presenceKey: string;
}

interface CancellationReason {
  id: string;
  user_id: string;
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

const REASON_LABELS: Record<string, string> = {
  price: '💸 Preço alto',
  missing_features: '🔧 Falta recursos',
  not_using: '😴 Não usando',
  found_alternative: '🔄 Outra solução',
  other: '✏️ Outro',
};

const AdminAnalytics: React.FC = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [subStats, setSubStats] = useState<SubscriptionStats | null>(null);
  const [subLoading, setSubLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('month');
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [onlineExpanded, setOnlineExpanded] = useState(false);
  const [cancellations, setCancellations] = useState<CancellationReason[]>([]);
  const [userEmailMap, setUserEmailMap] = useState<Map<string, string>>(new Map());
  const [presenceRefreshKey, setPresenceRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [{ data: purchaseData }, { data: packData }, { data: cancelData }] = await Promise.all([
          supabase.from('user_purchases').select('pack_id, user_id, purchased_at'),
          supabase.from('store_packs').select('id, name, price_cents'),
          supabase.from('cancellation_reasons' as any).select('*').order('created_at', { ascending: false }).limit(100),
        ]);
        setPurchases(purchaseData || []);
        setPacks(packData || []);
        const cancelList = (cancelData as unknown as CancellationReason[]) || [];
        setCancellations(cancelList);

        // Fetch user emails for online users & cancellations
        try {
          const { data: session } = await supabase.auth.getSession();
          const token = session?.session?.access_token;
          if (token) {
            const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
            const resp = await fetch(`https://${projectId}.supabase.co/functions/v1/admin-get-users`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (resp.ok) {
              const { users } = await resp.json();
              const emailMap = new Map<string, string>();
              users?.forEach((u: { id: string; email: string }) => emailMap.set(u.id, u.email));
              setUserEmailMap(emailMap);
            }
          }
        } catch (e) {
          console.error('Failed to fetch user emails:', e);
        }
      } catch (e) {
        console.error('Analytics error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Helper: extract OnlineUser list from presenceState (excludes admin observer)
  const extractOnlineUsers = (state: Record<string, unknown[]>): OnlineUser[] => {
    const users: OnlineUser[] = [];
    for (const [key, presences] of Object.entries(state)) {
      const first = presences[0] as { user_id?: string; online_at?: string } | undefined;
      if (first?.user_id && first.user_id !== '__admin_observer__') {
        users.push({ user_id: first.user_id, online_at: first.online_at ?? new Date().toISOString(), presenceKey: key });
      }
    }
    return users;
  };

  // Real-time online users — reads presence from the same channel users join on Dashboard/App
  // presenceRefreshKey triggers a full reconnect when the user clicks refresh
  useEffect(() => {
    setIsRefreshing(true);
    // Must include presence config so Supabase treats this as a presence-capable channel
    const channel = supabase.channel(`glory-pads-online`, {
      config: { presence: { key: 'admin-observer' } },
    });

    const syncUsers = () => {
      const state = channel.presenceState<{ user_id: string; online_at: string }>();
      // Filter out the admin-observer entry itself
      const filtered: Record<string, unknown[]> = {};
      for (const [key, val] of Object.entries(state as Record<string, unknown[]>)) {
        if (key !== 'admin-observer') filtered[key] = val;
      }
      setOnlineUsers(extractOnlineUsers(filtered));
      setIsRefreshing(false);
    };

    channel
      .on('presence', { event: 'sync' }, syncUsers)
      .on('presence', { event: 'join' }, syncUsers)
      .on('presence', { event: 'leave' }, syncUsers)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track as observer (won't count as a real user in the list)
          await channel.track({ user_id: '__admin_observer__', online_at: new Date().toISOString() });
          syncUsers();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsRefreshing(false);
        }
      });

    channelRef.current = channel;
    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [presenceRefreshKey]);

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
      id: p.id,
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
      {/* Online users panel */}
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl overflow-hidden">
        {/* Header row */}
        <div className="flex items-center gap-2 px-4 py-2.5">
          <button
            onClick={() => setOnlineExpanded(v => !v)}
            className="flex-1 flex items-center gap-2 hover:opacity-80 transition-opacity text-left"
          >
            <Radio className="h-4 w-4 text-emerald-400 animate-pulse shrink-0" />
            <p className="text-xs font-semibold text-emerald-400">
              {onlineUsers.length} usuário{onlineUsers.length !== 1 ? 's' : ''} online agora
            </p>
            <div className="flex gap-1 ml-2">
              {onlineUsers.slice(0, 5).map((u) => (
                <div
                  key={u.presenceKey}
                  className="h-5 w-5 rounded-full bg-emerald-600 flex items-center justify-center text-[9px] font-bold text-white border border-emerald-400/40"
                  title={u.user_id}
                >
                  {u.user_id.slice(0, 1).toUpperCase()}
                </div>
              ))}
              {onlineUsers.length > 5 && (
                <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[9px] text-muted-foreground font-medium">
                  +{onlineUsers.length - 5}
                </div>
              )}
            </div>
          </button>
          {/* Refresh button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPresenceRefreshKey(k => k + 1);
            }}
            disabled={isRefreshing}
            className="shrink-0 p-1.5 rounded-lg hover:bg-emerald-500/20 text-emerald-400 transition-colors disabled:opacity-50"
            title="Atualizar usuários online"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setOnlineExpanded(v => !v)}
            className="shrink-0 text-emerald-400 p-1"
          >
            {onlineExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Expanded list */}
        {onlineExpanded && onlineUsers.length > 0 && (
          <div className="border-t border-emerald-500/20 divide-y divide-emerald-500/10 max-h-48 overflow-y-auto">
            {onlineUsers.map((u) => {
              const email = userEmailMap.get(u.user_id);
              const label = email ? email.split('@')[0] : u.user_id.slice(0, 8) + '…';
              const initial = label.slice(0, 1).toUpperCase();
              const sinceMs = Date.now() - new Date(u.online_at).getTime();
              const sinceMin = Math.floor(sinceMs / 60000);
              const sinceLabel = sinceMin < 1 ? 'agora' : sinceMin < 60 ? `${sinceMin}min` : `${Math.floor(sinceMin / 60)}h`;
              return (
                <div key={u.presenceKey} className="flex items-center gap-2.5 px-4 py-2">
                  <div className="h-7 w-7 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{email ?? u.user_id.slice(0, 16) + '…'}</p>
                    <p className="text-[10px] text-muted-foreground">Online há {sinceLabel}</p>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                </div>
              );
            })}
          </div>
        )}

        {onlineExpanded && onlineUsers.length === 0 && (
          <div className="border-t border-emerald-500/20 py-4 text-center">
            <p className="text-xs text-muted-foreground">Nenhum usuário online no momento</p>
          </div>
        )}
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
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <AlertCircle className="h-4 w-4 text-orange-400" />
          <p className="text-xs font-semibold text-foreground">Cancelamentos</p>
          <span className="ml-auto text-[10px] bg-orange-400/10 text-orange-400 px-2 py-0.5 rounded-full font-medium">
            {cancellations.length} registro{cancellations.length !== 1 ? 's' : ''}
          </span>
        </div>

        {cancellations.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">Nenhum cancelamento registrado</p>
        ) : (
          <>
            {/* Aggregated bar chart */}
            {cancellationStats.length > 0 && (
              <div className="px-4 pt-3 pb-1">
                <ResponsiveContainer width="100%" height={110}>
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
              </div>
            )}

            {/* Detail table */}
            <div className="divide-y divide-border max-h-72 overflow-y-auto">
              {cancellations.map(c => {
                const email = userEmailMap.get(c.user_id);
                return (
                  <div key={c.id} className="px-4 py-2.5 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Email */}
                      <span className="text-[11px] font-medium text-foreground truncate max-w-[160px]" title={email}>
                        {email ?? c.user_id.slice(0, 8) + '…'}
                      </span>
                      {/* Tier badge */}
                      {c.tier_at_cancellation && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
                          c.tier_at_cancellation === 'master'
                            ? 'bg-amber-400/15 text-amber-400'
                            : c.tier_at_cancellation === 'pro'
                              ? 'bg-violet-400/15 text-violet-400'
                              : 'bg-muted text-muted-foreground'
                        }`}>
                          {c.tier_at_cancellation.toUpperCase()}
                        </span>
                      )}
                      {/* Reason badge */}
                      <span className="text-[10px] font-medium bg-orange-400/10 text-orange-400 px-1.5 py-0.5 rounded shrink-0">
                        {REASON_LABELS[c.reason] ?? c.reason}
                      </span>
                      <span className="ml-auto text-[9px] text-muted-foreground shrink-0">
                        {new Date(c.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    {c.detail && (
                      <p className="text-[10px] text-muted-foreground pl-0.5 italic">"{c.detail}"</p>
                    )}
                  </div>
                );
              })}
            </div>
          </>
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
            <div key={pack.id} className="flex items-center gap-3 px-4 py-2.5">
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
