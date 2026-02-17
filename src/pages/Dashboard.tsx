import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import logoDark from '@/assets/logo-dark.png';
import {
  Crown, Zap, Play, Settings, LogOut, Store, RefreshCw,
  User, Mail, Calendar, Shield, ChevronRight, Loader2, Lock
} from 'lucide-react';

const tierBadge: Record<string, { label: string; icon: React.ReactNode; class: string }> = {
  free: { label: 'Gratuito', icon: null, class: 'bg-muted text-muted-foreground' },
  pro: { label: 'Pro', icon: <Zap className="h-3.5 w-3.5" />, class: 'bg-primary/20 text-primary border border-primary/30' },
  master: { label: 'Master', icon: <Crown className="h-3.5 w-3.5" />, class: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' },
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { tier, subscriptionEnd, loading, checkSubscription } = useSubscription();
  const [portalLoading, setPortalLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const badge = tierBadge[tier];

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
    } catch {
      toast.error('Erro ao abrir portal de assinatura');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await checkSubscription();
    setRefreshing(false);
    toast.success('Status atualizado');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const formattedEnd = subscriptionEnd
    ? new Date(subscriptionEnd).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
            <img src={logoDark} alt="Logo" className="h-7 w-auto" />
            <span className="font-bold text-sm hidden sm:inline">Drum Pads Worship</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${badge.class}`}>
              {badge.icon}
              {badge.label}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSignOut} title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 sm:py-10 space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Olá, {user?.user_metadata?.display_name || user?.email?.split('@')[0]} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie sua conta e acesse o app.</p>
        </div>

        {/* Quick access to app */}
        <button
          onClick={() => navigate('/app')}
          className="w-full group relative overflow-hidden rounded-2xl border-2 border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 sm:p-6 flex items-center gap-4 hover:border-primary/50 transition-all"
        >
          <div className="h-14 w-14 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary/30 transition">
            <Play className="h-7 w-7 text-primary ml-0.5" />
          </div>
          <div className="text-left flex-1">
            <h2 className="text-lg font-bold">Abrir Drum Pads</h2>
            <p className="text-sm text-muted-foreground">Acessar pads, setlists e metrônomo</p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition shrink-0" />
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Subscription card */}
          <div className="rounded-2xl border border-border/50 bg-card/60 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Assinatura
              </h3>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                title="Atualizar status"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-full ${badge.class}`}>
                      {badge.icon}
                      Plano {badge.label}
                    </span>
                  </div>
                  {formattedEnd && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      Renova em {formattedEnd}
                    </p>
                  )}
                </div>

                {tier === 'free' ? (
                  <Button onClick={() => navigate('/pricing')} className="w-full rounded-xl" size="sm">
                    <Zap className="h-4 w-4 mr-1.5" />
                    Fazer upgrade
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button onClick={handleManageSubscription} variant="outline" className="flex-1 rounded-xl" size="sm" disabled={portalLoading}>
                      {portalLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Gerenciar'}
                    </Button>
                    <Button onClick={() => navigate('/pricing')} variant="ghost" className="rounded-xl" size="sm">
                      Planos
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Account card */}
          <div className="rounded-2xl border border-border/50 bg-card/60 p-5 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Conta
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground truncate">{user?.email}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">
                  {user?.user_metadata?.display_name || user?.email?.split('@')[0]}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">
                  Membro desde {user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : '—'}
                </span>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full rounded-xl" onClick={handleSignOut}>
              <LogOut className="h-3.5 w-3.5 mr-1.5" />
              Sair da conta
            </Button>
          </div>
        </div>

        {/* Pad Store - coming soon */}
        <div className="rounded-2xl border border-border/50 bg-card/60 p-5 flex items-center gap-4 opacity-70">
          <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
            <Store className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold flex items-center gap-2">
              Loja de Pads
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/20 text-primary">Em breve</span>
            </h3>
            <p className="text-sm text-muted-foreground">Novos sons e packs estarão disponíveis aqui.</p>
          </div>
          <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
