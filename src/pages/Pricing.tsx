import React, { useState } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/integrations/supabase/client';
import { TIERS, type TierKey } from '@/lib/tiers';
import { useLandingConfig } from '@/hooks/useLandingConfig';
import { Button } from '@/components/ui/button';
import { Check, Crown, Zap, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const tierOrder: TierKey[] = ['free', 'pro', 'master'];

const Pricing = () => {
  const { tier: currentTier, checkSubscription } = useSubscription();
  const [loadingTier, setLoadingTier] = useState<TierKey | null>(null);
  const navigate = useNavigate();
  const { pricing, features, loading } = useLandingConfig();

  const handleCheckout = async (tierKey: TierKey) => {
    if (tierKey === 'free') return;
    const tierData = TIERS[tierKey];
    if (!('price_id' in tierData)) return;

    setLoadingTier(tierKey);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId: tierData.price_id },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      console.error(e);
      toast.error('Erro ao iniciar checkout');
    } finally {
      setLoadingTier(null);
    }
  };

  const handleManage = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      console.error(e);
      toast.error('Erro ao abrir portal de gerenciamento');
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <button onClick={() => navigate('/app')} className="text-muted-foreground text-sm hover:text-foreground">
            ← Voltar
          </button>
          <h1 className="text-2xl font-bold text-foreground">Planos</h1>
          <p className="text-sm text-muted-foreground">Escolha o plano ideal para você</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {tierOrder.map((tierKey) => {
              const t = TIERS[tierKey];
              const plan = pricing.find(p => p.tier === tierKey);
              const isCurrent = tierKey === currentTier;
              const icon = tierKey === 'master'
                ? <Crown className="h-5 w-5" />
                : tierKey === 'pro'
                  ? <Zap className="h-5 w-5" />
                  : null;

              // Features from DB for this tier, sorted by sort_order, only enabled ones
              const tierFeatures = features
                .filter(f => f.tier === tierKey)
                .sort((a, b) => a.sort_order - b.sort_order);

              const displayPrice = plan ? plan.price_brl : t.price;
              const displayName = plan ? plan.name : t.name;
              const displayPeriod = plan ? plan.period : (t.price > 0 ? '/mês' : '');
              const displayCta = plan ? plan.cta_text : (tierKey === 'free' ? 'Grátis' : `Assinar ${t.name}`);

              return (
                <div
                  key={tierKey}
                  className={`relative rounded-xl border-2 p-4 space-y-4 flex flex-col ${
                    isCurrent ? 'border-primary bg-primary/5' : 'border-border bg-card'
                  }`}
                >
                  {isCurrent && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                      SEU PLANO
                    </span>
                  )}

                  <div className="text-center space-y-1">
                    <div className="flex items-center justify-center gap-1.5 text-foreground">
                      {icon}
                      <h2 className="text-lg font-bold">{displayName}</h2>
                    </div>
                    <p className="text-2xl font-bold text-foreground">
                      {displayPrice === 0 ? 'Grátis' : `R$${Number(displayPrice).toFixed(2)}`}
                      {displayPrice > 0 && displayPeriod && (
                        <span className="text-sm text-muted-foreground font-normal">{displayPeriod}</span>
                      )}
                    </p>
                  </div>

                  <ul className="space-y-2 text-sm flex-1">
                    {tierFeatures.length > 0 ? (
                      tierFeatures.map((f) => (
                        <li
                          key={f.feature_key}
                          className={`flex items-start gap-2 ${f.enabled ? 'text-foreground' : 'text-muted-foreground/50'}`}
                        >
                          {f.enabled
                            ? <Check className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: 'hsl(142 70% 50%)' }} />
                            : <X className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          }
                          {f.feature_label}
                        </li>
                      ))
                    ) : (
                      // Fallback if no features in DB yet
                      <li className="text-muted-foreground text-xs">—</li>
                    )}
                  </ul>

                  {tierKey === 'free' ? (
                    isCurrent ? (
                      <Button variant="outline" className="w-full" disabled>
                        Plano atual
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full" disabled>
                        {displayCta}
                      </Button>
                    )
                  ) : isCurrent ? (
                    <Button variant="outline" className="w-full" onClick={handleManage}>
                      Gerenciar assinatura
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => handleCheckout(tierKey)}
                      disabled={loadingTier === tierKey}
                    >
                      {loadingTier === tierKey ? 'Aguarde...' : displayCta}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {currentTier !== 'free' && (
          <p className="text-center text-xs text-muted-foreground">
            Após assinar, clique em "Atualizar assinatura" para verificar.{' '}
            <button onClick={checkSubscription} className="text-primary hover:underline">
              Atualizar agora
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default Pricing;
