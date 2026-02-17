import React, { useState } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/integrations/supabase/client';
import { TIERS, type TierKey } from '@/lib/tiers';
import { Button } from '@/components/ui/button';
import { Check, Crown, Zap, X } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const tierOrder: TierKey[] = ['free', 'pro', 'master'];

const features: { label: string; free: boolean; pro: boolean; master: boolean }[] = [
  { label: 'Pads por setlist', free: true, pro: true, master: true },
  { label: 'Importar sons customizados', free: true, pro: true, master: true },
  { label: 'Continuous Pads', free: true, pro: true, master: true },
  { label: 'Metrônomo e loops', free: true, pro: true, master: true },
  { label: 'Pads ilimitados', free: false, pro: true, master: true },
  { label: 'Imports ilimitados', free: false, pro: true, master: true },
  { label: 'Volume individual por pad', free: false, pro: true, master: true },
  { label: 'Continuous Pads', free: false, pro: true, master: true },
  { label: 'Equalizador (grave/médio/agudo)', free: false, pro: false, master: true },
  { label: 'Reverb e Delay', free: false, pro: false, master: true },
  { label: 'Spotify AI - Pads predefinidos', free: false, pro: false, master: true },
];

const Pricing = () => {
  const { tier: currentTier, checkSubscription } = useSubscription();
  const [loadingTier, setLoadingTier] = useState<TierKey | null>(null);
  const navigate = useNavigate();

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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {tierOrder.map((tierKey) => {
            const t = TIERS[tierKey];
            const isCurrent = tierKey === currentTier;
            const icon = tierKey === 'master' ? <Crown className="h-5 w-5" /> : tierKey === 'pro' ? <Zap className="h-5 w-5" /> : null;

            return (
              <div
                key={tierKey}
                className={`relative rounded-xl border-2 p-4 space-y-4 ${
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
                    <h2 className="text-lg font-bold">{t.name}</h2>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {t.price === 0 ? 'Grátis' : `R$${t.price.toFixed(2)}`}
                    {t.price > 0 && <span className="text-sm text-muted-foreground font-normal">/mês</span>}
                  </p>
                </div>

                <ul className="space-y-2 text-sm">
                  {features.map((f) => {
                    const has = f[tierKey];
                    return (
                      <li key={f.label} className={`flex items-center gap-2 ${has ? 'text-foreground' : 'text-muted-foreground/50'}`}>
                        {has ? <Check className="h-3.5 w-3.5 text-green-500 shrink-0" /> : <X className="h-3.5 w-3.5 shrink-0" />}
                        {f.label}
                        {f.label === 'Pads por setlist' && (
                          <span className="text-muted-foreground ml-auto">
                            {tierKey === 'free' ? '4' : '∞'}
                          </span>
                        )}
                        {f.label === 'Importar sons customizados' && (
                          <span className="text-muted-foreground ml-auto">
                            {tierKey === 'free' ? '3' : '∞'}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {tierKey === 'free' ? (
                  isCurrent ? null : (
                    <Button variant="outline" className="w-full" disabled>
                      Plano atual
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
                    {loadingTier === tierKey ? 'Aguarde...' : `Assinar ${t.name}`}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

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
