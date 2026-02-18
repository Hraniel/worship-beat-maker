import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Crown, Zap, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface UpgradeGatePayload {
  gateKey: string;
  gateLabel: string;
  requiredTier: string;
  description?: string | null;
}

interface Props {
  payload: UpgradeGatePayload | null;
  onClose: () => void;
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

const UpgradeGateModal: React.FC<Props> = ({ payload, onClose }) => {
  const navigate = useNavigate();

  if (!payload) return null;

  const meta = TIER_META[payload.requiredTier] ?? TIER_META.pro;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed z-[201] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-sm">
        <div className={`relative rounded-2xl border ${meta.border} bg-card shadow-2xl overflow-hidden`}>

          {/* Top accent bar */}
          <div className={`h-1 w-full ${payload.requiredTier === 'master' ? 'bg-gradient-to-r from-amber-500 to-yellow-400' : 'bg-gradient-to-r from-violet-500 to-fuchsia-500'}`} />

          <div className="p-6 space-y-5">
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Icon + badge */}
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${meta.bg} ${meta.color}`}>
                <Lock className="h-6 w-6" />
              </div>
              <div>
                <span className={`inline-flex items-center gap-1.5 text-sm font-bold px-2.5 py-1 rounded-full ${meta.bg} ${meta.color} border ${meta.border}`}>
                  {meta.icon}
                  Plano {meta.label}
                </span>
              </div>
            </div>

            {/* Title */}
            <div>
              <h2 className="text-base font-bold text-foreground">
                {payload.gateLabel}
              </h2>
              {payload.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {payload.description}
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                Este recurso está disponível a partir do plano{' '}
                <span className={`font-semibold ${meta.color}`}>{meta.label}</span>.
                Faça o upgrade para desbloquear.
              </p>
            </div>

            {/* CTA */}
            <div className="flex flex-col gap-2">
              <Button
                className={`w-full gap-2 font-semibold ${
                  payload.requiredTier === 'master'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black'
                    : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white'
                }`}
                onClick={() => {
                  onClose();
                  navigate('/pricing');
                }}
              >
                Ver planos
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={onClose}>
                Agora não
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UpgradeGateModal;
