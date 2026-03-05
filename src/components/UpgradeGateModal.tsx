import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Lock, Crown, Zap, ArrowRight, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePaymentMode } from '@/hooks/usePaymentMode';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNewUserUnlock } from '@/hooks/useNewUserUnlock';

export interface UpgradeGatePayload {
  gateKey: string;
  gateLabel: string;
  requiredTier: string;
  description?: string | null;
}

interface Props {
  payload: UpgradeGatePayload | null;
  onClose: () => void;
  onNavigateToPricing?: () => void;
}

const TIER_META: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string; border: string }> = {
  pro: {
    label: 'Pro',
    icon: <Zap className="h-5 w-5" />,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
  },
  master: {
    label: 'Master',
    icon: <Crown className="h-5 w-5" />,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
};

const UpgradeGateModal: React.FC<Props> = ({ payload, onClose, onNavigateToPricing }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const paymentMode = usePaymentMode();
  const [loading, setLoading] = React.useState(false);

  if (!payload) return null;

  const meta = TIER_META[payload.requiredTier] ?? TIER_META.pro;

  const handleLifetimeCheckout = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-lifetime-checkout');
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      console.error(e);
      toast.error('Erro ao iniciar pagamento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="fixed z-[201] inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div className={`pointer-events-auto relative w-[90vw] max-w-sm rounded-2xl glass-card ${paymentMode.isLifetime ? 'border-amber-500/30' : meta.border} overflow-hidden`}>

          <div className={`h-1 w-full ${paymentMode.isLifetime ? 'bg-gradient-to-r from-amber-500 to-yellow-400' : payload.requiredTier === 'master' ? 'bg-gradient-to-r from-amber-500 to-yellow-400' : 'bg-gradient-to-r from-violet-500 to-fuchsia-500'}`} />

          <div className="p-6 space-y-5">
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${paymentMode.isLifetime ? 'bg-amber-500/10 text-amber-400' : `${meta.bg} ${meta.color}`}`}>
                <Lock className="h-6 w-6" />
              </div>
              <div>
                {paymentMode.isLifetime ? (
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    <Sparkles className="h-4 w-4" />
                    {paymentMode.lifetime_name}
                  </span>
                ) : (
                  <span className={`inline-flex items-center gap-1.5 text-sm font-bold px-2.5 py-1 rounded-full ${meta.bg} ${meta.color} border ${meta.border}`}>
                    {meta.icon}
                    {t('upgradeGate.plan')} {meta.label}
                  </span>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-base font-bold text-foreground">
                {payload.gateLabel}
              </h2>
              {payload.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {payload.description}
                </p>
              )}
              {paymentMode.isLifetime ? (
                <p className="text-sm text-muted-foreground mt-2">
                  Desbloqueie com uma compra única de <strong className="text-foreground">R${paymentMode.lifetime_price_brl.toFixed(2)}</strong>
                </p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mt-2">
                    {t('upgradeGate.availableFrom', { plan: meta.label })}
                  </p>
                  <p className="text-xs font-semibold text-primary mt-1">
                    🎉 {t('upgradeGate.trialHint', 'Experimente 3 dias grátis!')}
                  </p>
                </>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {paymentMode.isLifetime ? (
                <Button
                  className="w-full gap-2 font-semibold bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black"
                  onClick={handleLifetimeCheckout}
                  disabled={loading}
                >
                  {loading ? t('pricing.wait') : paymentMode.lifetime_cta_text}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  className={`w-full gap-2 font-semibold ${
                    payload.requiredTier === 'master'
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black'
                      : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white'
                  }`}
                  onClick={() => {
                    onClose();
                    if (onNavigateToPricing) {
                      onNavigateToPricing();
                    } else {
                      navigate('/pricing');
                    }
                  }}
                >
                  {t('upgradeGate.viewPlans')}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={onClose}>
                {t('upgradeGate.notNow')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UpgradeGateModal;
