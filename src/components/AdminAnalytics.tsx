import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, ShoppingBag, DollarSign, Package, Users } from 'lucide-react';

interface AnalyticsData {
  totalRevenue: number;
  totalPurchases: number;
  totalUsers: number;
  packStats: { name: string; purchases: number; revenue: number }[];
}

const COLORS = ['hsl(262,80%,55%)', 'hsl(200,75%,50%)', 'hsl(140,60%,45%)', 'hsl(30,85%,55%)', 'hsl(340,70%,55%)', 'hsl(50,80%,50%)'];

const AdminAnalytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [{ data: purchases }, { data: packs }, { data: roles }] = await Promise.all([
          supabase.from('user_purchases').select('pack_id, user_id'),
          supabase.from('store_packs').select('id, name, price_cents'),
          supabase.from('user_roles').select('user_id'),
        ]);

        const packMap = new Map((packs || []).map(p => [p.id, p]));
        const purchasesByPack = new Map<string, number>();
        const userSet = new Set<string>();

        (purchases || []).forEach(p => {
          purchasesByPack.set(p.pack_id, (purchasesByPack.get(p.pack_id) || 0) + 1);
          userSet.add(p.user_id);
        });

        const packStats = (packs || []).map(p => ({
          name: p.name.length > 14 ? p.name.slice(0, 14) + '…' : p.name,
          purchases: purchasesByPack.get(p.id) || 0,
          revenue: (purchasesByPack.get(p.id) || 0) * (p.price_cents / 100),
        })).sort((a, b) => b.purchases - a.purchases);

        const totalPurchases = purchases?.length || 0;
        const totalRevenue = Array.from(purchasesByPack.entries()).reduce((sum, [packId, count]) => {
          const pack = packMap.get(packId);
          return sum + count * (pack?.price_cents || 0) / 100;
        }, 0);

        setData({
          totalRevenue,
          totalPurchases,
          totalUsers: userSet.size,
          packStats,
        });
      } catch (e) {
        console.error('Analytics error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  if (!data) return <p className="text-sm text-muted-foreground text-center py-8">Erro ao carregar analytics</p>;

  const kpis = [
    { label: 'Receita Total', value: `R$ ${data.totalRevenue.toFixed(2)}`, icon: DollarSign, color: 'text-green-400' },
    { label: 'Compras', value: data.totalPurchases, icon: ShoppingBag, color: 'text-blue-400' },
    { label: 'Compradores', value: data.totalUsers, icon: Users, color: 'text-purple-400' },
    { label: 'Packs', value: data.packStats.length, icon: Package, color: 'text-orange-400' },
  ];

  return (
    <div className="space-y-4">
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

      {/* Bar chart */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-primary" />
          <p className="text-xs font-semibold text-foreground">Compras por Pack</p>
        </div>
        {data.packStats.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Nenhuma compra registrada ainda</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.packStats} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(215 15% 55%)' }} />
              <YAxis tick={{ fontSize: 9, fill: 'hsl(215 15% 55%)' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: 'hsl(240 8% 10%)', border: '1px solid hsl(240 6% 18%)', borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: 'hsl(210 20% 92%)' }}
                itemStyle={{ color: 'hsl(210 20% 92%)' }}
              />
              <Bar dataKey="purchases" radius={[4, 4, 0, 0]}>
                {data.packStats.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Pack table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-2 border-b border-border">
          <p className="text-xs font-semibold text-foreground">Ranking de Packs</p>
        </div>
        <div className="divide-y divide-border">
          {data.packStats.map((pack, i) => (
            <div key={pack.name} className="flex items-center gap-3 px-4 py-2.5">
              <span className="text-xs font-bold text-muted-foreground w-5 text-right">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{pack.name}</p>
              </div>
              <span className="text-xs text-muted-foreground">{pack.purchases} compras</span>
              <span className="text-xs font-semibold text-green-400 min-w-[60px] text-right">R$ {pack.revenue.toFixed(2)}</span>
            </div>
          ))}
          {data.packStats.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhuma compra ainda</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
