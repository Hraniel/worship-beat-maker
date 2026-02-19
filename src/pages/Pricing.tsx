import React, { useState } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/integrations/supabase/client';
import { TIERS, type TierKey } from '@/lib/tiers';
import { useLandingConfig } from '@/hooks/useLandingConfig';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Check, Crown, Zap, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useBodyScroll } from '@/hooks/useBodyScroll';

// ── Cancellation Reason Modal ──────────────────────────────────────────────────
const CANCEL_REASONS = [
  { key: 'price', label: '💸 Preço muito alto' },
  { key: 'missing_features', label: '🔧 Falta de recursos' },
  { key: 'not_using', label: '😴 Não estou usando' },
  { key: 'found_alternative', label: '🔄 Encontrei outra solução' },
  { key: 'other', label: '✏️ Outro motivo' },
];

interface CancelModalProps {
  tier: string;
  onConfirm: (reason: string, detail: string) => void;
  onDismiss: () => void;
}

const CancelReasonModal: React.FC<CancelModalProps> = ({ tier, onConfirm, onDismiss }) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [detail, setDetail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!selectedReason) { toast.error('Selecione um motivo'); return; }
    setLoading(true);
    await onConfirm(selectedReason, detail.trim());
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">Antes de cancelar...</p>
          <p className="text-xs text-muted-foreground">Qual o principal motivo do cancelamento?</p>
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
            placeholder="Detalhes opcionais..."
            rows={2}
            className="w-full px-3 py-2 text-xs rounded-lg bg-background border border-input text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          />
        )}

        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="destructive" className="flex-1 h-8 text-xs" onClick={handleConfirm} disabled={loading || !selectedReason}>
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirmar cancelamento'}
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={onDismiss}>Voltar</Button>
        </div>
      </div>
    </div>
  );
};

const tierOrder: TierKey[] = ['free', 'pro', 'master'];

const Pricing = () => {
  useBodyScroll();
  const { tier: currentTier, checkSubscription } = useSubscription();
  const { user } = useAuth();
  const [loadingTier, setLoadingTier] = useState<TierKey | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const navigate = useNavigate();
  const { pricing, features, loading } = useLandingConfig();

  const handleCheckout = async (tierKey: TierKey) => {
    if (tierKey === 'free') return;

    setLoadingTier(tierKey);
    try {
      // Send tier name — create-checkout will resolve the price_id from DB
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { tier: tierKey },
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
    // Show cancel reason modal first (only redirect after user submits reason)
    setShowCancelModal(true);
  };

  const handleCancelConfirm = async (reason: string, detail: string) => {
    // Save cancellation reason
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

    // Now redirect to customer portal
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
      {showCancelModal && (
        <CancelReasonModal
          tier={currentTier}
          onConfirm={handleCancelConfirm}
          onDismiss={() => setShowCancelModal(false)}
        />
      )}
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

              const tierFeatures = features
                .filter(f => f.tier === tierKey)
                .sort((a, b) => a.sort_order - b.sort_order);

              const displayPrice = plan ? plan.price_brl : t.price;
              const displayName = plan ? plan.name : t.name;
              const displayPeriod = plan ? plan.period : (t.price > 0 ? '/mês' : '');
              const displayCta = plan ? plan.cta_text : (tierKey === 'free' ? 'Grátis' : `Assinar ${t.name}`);

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
                      SEU PLANO
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
