import React, { useState } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/integrations/supabase/client';
import { TIERS, type TierKey } from '@/lib/tiers';
import { useLandingConfig } from '@/hooks/useLandingConfig';
import { usePaymentMode } from '@/hooks/usePaymentMode';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Check, Crown, Zap, X, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useBodyScroll } from '@/hooks/useBodyScroll';
import { useTranslation } from 'react-i18next';

// ── Cancellation Reason Modal ──────────────────────────────────────────────────
interface CancelModalProps {
  tier: string;
  onConfirm: (reason: string, detail: string) => void;
  onDismiss: () => void;
}

const CancelReasonModal: React.FC<CancelModalProps> = ({ tier, onConfirm, onDismiss }) => {
  const { t } = useTranslation();
  const [selectedReason, setSelectedReason] = useState('');
  const [detail, setDetail] = useState('');
  const [loading, setLoading] = useState(false);

  const CANCEL_REASONS = [
    { key: 'price', label: t('pricing.priceHigh') },
    { key: 'missing_features', label: t('pricing.missingFeatures') },
    { key: 'not_using', label: t('pricing.notUsing') },
    { key: 'found_alternative', label: t('pricing.foundAlternative') },
    { key: 'other', label: t('pricing.otherReason') },
  ];

  const handleConfirm = async () => {
    if (!selectedReason) { toast.error(t('pricing.selectReason')); return; }
    setLoading(true);
    await onConfirm(selectedReason, detail.trim());
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{t('pricing.beforeCancel')}</p>
          <p className="text-xs text-muted-foreground">{t('pricing.cancelReason')}</p>
        </div>

        <div className="space-y-2">
          {CANCEL_REASONS.map(r => (
            <button
              key={r.key}
              onClick={() => setSelectedReason(r.key)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                selectedReason === r.key
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {selectedReason && (
          <textarea
            value={detail}
            onChange={e => setDetail(e.target.value)}
            placeholder={t('pricing.tellUsMore')}
            rows={2}
            className="w-full px-3 py-2 text-xs rounded-lg bg-background border border-input text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          />
        )}

        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="destructive" className="flex-1 h-8 text-xs" onClick={handleConfirm} disabled={loading || !selectedReason}>
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : t('pricing.confirmCancel')}
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={onDismiss}>{t('pricing.goBack')}</Button>
        </div>
      </div>
    </div>
  );
};

const tierOrder: TierKey[] = ['free', 'pro', 'master'];

const Pricing = () => {
  useBodyScroll();
  const { t } = useTranslation();
  const { tier: currentTier, checkSubscription } = useSubscription();
  const { user } = useAuth();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const navigate = useNavigate();
  const { pricing, features, loading } = useLandingConfig();
  const paymentMode = usePaymentMode();

  const handleCheckout = async (tierKey: TierKey) => {
    if (tierKey === 'free') return;
    setLoadingTier(tierKey);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { tier: tierKey },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      console.error(e);
      toast.error(t('pricing.checkoutError'));
    } finally {
      setLoadingTier(null);
    }
  };

  const handleLifetimeCheckout = async () => {
    setLoadingTier('lifetime');
    try {
      const { data, error } = await supabase.functions.invoke('create-lifetime-checkout');
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      console.error(e);
      toast.error(t('pricing.checkoutError'));
    } finally {
      setLoadingTier(null);
    }
  };

  const handleManage = async () => {
    setShowCancelModal(true);
  };

  const handleCancelConfirm = async (reason: string, detail: string) => {
    try {
      if (user) {
        await supabase.from('cancellation_reasons' as any).insert({
          user_id: user.id,
          reason,
          detail: detail || null,
          tier_at_cancellation: currentTier,
        });
      }
    } catch (e) {
      console.error('Failed to save cancellation reason', e);
    }
    setShowCancelModal(false);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      console.error(e);
      toast.error(t('pricing.portalError'));
    }
  };

  const isLifetimeOwner = currentTier === 'lifetime';

  return (
    <div className="min-h-screen bg-background overflow-y-auto" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {showCancelModal && (
        <CancelReasonModal
          tier={currentTier}
          onConfirm={handleCancelConfirm}
          onDismiss={() => setShowCancelModal(false)}
        />
      )}
      <div className="max-w-3xl mx-auto space-y-6 p-4">
        <div className="text-center space-y-2">
          <button onClick={() => { sessionStorage.setItem('open-settings', '1'); navigate('/app'); }} className="text-muted-foreground text-sm hover:text-foreground">
            {t('pricing.backLabel')}
          </button>
          <h1 className="text-2xl font-bold text-foreground">{t('pricing.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('pricing.subtitle')}</p>
        </div>

        {loading || paymentMode.loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : paymentMode.isLifetime ? (
          /* ── LIFETIME MODE ─────────────────────────────────────── */
          <div className="max-w-sm mx-auto">
            {isLifetimeOwner ? (
              <div className="relative rounded-xl border-2 border-primary bg-primary/5 p-6 space-y-4 text-center">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                  {t('pricing.yourPlan')}
                </span>
                <div className="flex items-center justify-center gap-2 text-foreground">
                  <Sparkles className="h-5 w-5 text-amber-400" />
                  <h2 className="text-lg font-bold">{paymentMode.lifetime_name}</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Você já possui acesso completo ao app! 🎉
                </p>
                <Button variant="outline" className="w-full" disabled>
                  {t('pricing.currentPlan')}
                </Button>
              </div>
            ) : (
              <div className="relative rounded-xl border-2 border-primary bg-primary/5 shadow-lg shadow-primary/20 p-6 space-y-5 text-center">
                <div className="flex items-center justify-center gap-2 text-foreground">
                  <Sparkles className="h-5 w-5 text-amber-400" />
                  <h2 className="text-lg font-bold">{paymentMode.lifetime_name}</h2>
                </div>
                <p className="text-3xl font-bold text-foreground">
                  R${paymentMode.lifetime_price_brl.toFixed(2)}
                  <span className="text-sm text-muted-foreground font-normal ml-1">pagamento único</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Desbloqueie todas as funcionalidades do app para sempre.
                </p>

                <ul className="space-y-2 text-sm text-left max-h-52 overflow-y-auto pr-1 scrollbar-thin">
                  {['free', 'pro', 'master'].flatMap(tier =>
                    features
                      .filter(f => f.tier === tier && f.enabled)
                      .sort((a, b) => a.sort_order - b.sort_order)
                  )
                    .filter((f, i, arr) => arr.findIndex(x => x.feature_key === f.feature_key) === i)
                    .filter(f => !/tudo\s+do\s+pro/i.test(f.feature_label))
                    .map((f) => (
                      <li key={f.feature_key} className="flex items-start gap-2 text-foreground">
                        <Check className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: 'hsl(142 70% 50%)' }} />
                        {f.feature_label}
                      </li>
                    ))}
                </ul>

                <Button
                  className="w-full gap-2 font-semibold bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black"
                  onClick={handleLifetimeCheckout}
                  disabled={loadingTier === 'lifetime'}
                >
                  {loadingTier === 'lifetime' ? t('pricing.wait') : paymentMode.lifetime_cta_text}
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* ── SUBSCRIPTION MODE ─────────────────────────────────── */
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {tierOrder.map((tierKey) => {
              const ti = TIERS[tierKey];
              const plan = pricing.find(p => p.tier === tierKey);
              const isCurrent = tierKey === currentTier;
              const icon = tierKey === 'master'
                ? <Crown className="h-5 w-5" />
                : tierKey === 'pro'
                  ? <Zap className="h-5 w-5" />
                  : null;

              const tierFeatures = features
                .filter(f => f.tier === tierKey)
                .sort((a, b) => a.sort_order - b.sort_order);

              const displayPrice = plan ? plan.price_brl : ti.price;
              const displayName = plan ? plan.name : ti.name;
              const displayPeriod = plan ? plan.period : (ti.price > 0 ? '/mês' : '');
              const displayCta = plan ? plan.cta_text : (tierKey === 'free' ? t('pricing.free') : `Assinar ${ti.name}`);

              const isHighlighted = plan?.highlight && !isCurrent;

              return (
                <div
                  key={tierKey}
                  className={`relative rounded-xl border-2 p-4 space-y-4 flex flex-col transition-shadow ${
                    isCurrent
                      ? 'border-primary bg-primary/5'
                      : isHighlighted
                        ? 'border-primary bg-primary/5 shadow-lg shadow-primary/20 scale-[1.02]'
                        : 'border-border bg-card'
                  }`}
                >
                  {isCurrent ? (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                      {t('pricing.yourPlan')}
                    </span>
                  ) : plan?.badge_text ? (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                      {plan.badge_text}
                    </span>
                  ) : null}

                  <div className="text-center space-y-1">
                    <div className="flex items-center justify-center gap-1.5 text-foreground">
                      {icon}
                      <h2 className="text-lg font-bold">{displayName}</h2>
                    </div>
                    <p className="text-2xl font-bold text-foreground">
                      {displayPrice === 0 ? t('pricing.free') : `R$${Number(displayPrice).toFixed(2)}`}
                      {displayPrice > 0 && displayPeriod && (
                        <span className="text-sm text-muted-foreground font-normal">{displayPeriod}</span>
                      )}
                    </p>
                    {tierKey !== 'free' && (
                      <p className="text-xs font-semibold text-primary">{t('pricing.trialBadge', '🎉 3 dias grátis para experimentar!')}</p>
                    )}
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
                      <li className="text-muted-foreground text-xs">—</li>
                    )}
                  </ul>

                  {tierKey === 'free' ? (
                    isCurrent ? (
                      <Button variant="outline" className="w-full" disabled>
                        {t('pricing.currentPlan')}
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full" disabled>
                        {displayCta}
                      </Button>
                    )
                  ) : isCurrent ? (
                    <Button variant="outline" className="w-full" onClick={handleManage}>
                      {t('pricing.manageSubscription')}
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => handleCheckout(tierKey)}
                      disabled={loadingTier === tierKey}
                    >
                      {loadingTier === tierKey ? t('pricing.wait') : displayCta}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {currentTier !== 'free' && !isLifetimeOwner && (
          <p className="text-center text-xs text-muted-foreground">
            {t('pricing.updateHint')}{' '}
            <button onClick={checkSubscription} className="text-primary hover:underline">
              {t('pricing.updateNow')}
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default Pricing;
