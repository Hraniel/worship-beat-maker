import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Rocket, CheckCircle2, Loader2 } from 'lucide-react';
import logoDark from '@/assets/logo-dark.png';

interface PrelaunchCountdownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  launchDate: string;
}

const useCountdown = (targetDate: string) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  return useMemo(() => {
    const diff = new Date(targetDate).getTime() - now;
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    return { days, hours, minutes, seconds, expired: false };
  }, [targetDate, now]);
};

const CountdownUnit = ({ value, label }: { value: number; label: string }) => (
  <div className="flex flex-col items-center">
    <div className="bg-foreground/5 border border-border rounded-xl w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
      <span className="text-2xl sm:text-3xl font-extrabold text-foreground tabular-nums">
        {String(value).padStart(2, '0')}
      </span>
    </div>
    <span className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 uppercase tracking-wider font-medium">{label}</span>
  </div>
);

const PrelaunchCountdownModal: React.FC<PrelaunchCountdownModalProps> = ({ open, onOpenChange, launchDate }) => {
  const countdown = useCountdown(launchDate);
  const [step, setStep] = useState<'countdown' | 'form' | 'success'>('countdown');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', full_name: '', phone: '' });

  useEffect(() => {
    if (open) {
      setStep('countdown');
      setForm({ email: '', full_name: '', phone: '' });
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.full_name || !form.phone) {
      toast.error('Preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      await supabase.from('prelaunch_leads').upsert({
        email: form.email,
        full_name: form.full_name,
        phone: form.phone,
      }, { onConflict: 'email' });

      try {
        await supabase.functions.invoke('prelaunch-add-lead', {
          body: {
            email: form.email,
            full_name: form.full_name,
            phone: form.phone,
          },
        });
      } catch {
        // Silently fail — lead is saved in DB anyway
      }

      setStep('success');
    } catch {
      toast.error('Erro ao realizar pré-cadastro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl border-none bg-background">
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 pt-8 pb-4 text-center">
          <img src={logoDark} alt="Glory Pads" className="h-10 mx-auto mb-4" />
          {step === 'success' ? (
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
          ) : (
            <Rocket className="h-8 w-8 text-primary mx-auto mb-2" />
          )}
        </div>

        <div className="px-6 pb-8">
          {step === 'countdown' && (
            <div className="text-center space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">Estamos quase lá!</h2>
                <p className="text-sm text-muted-foreground mt-1">O Glory Pads está em fase de pré-lançamento. Cadastre-se para ser avisado!</p>
              </div>

              <div className="flex justify-center gap-3">
                <CountdownUnit value={countdown.days} label="Dias" />
                <CountdownUnit value={countdown.hours} label="Horas" />
                <CountdownUnit value={countdown.minutes} label="Min" />
                <CountdownUnit value={countdown.seconds} label="Seg" />
              </div>

              <Button
                size="lg"
                className="w-full text-base py-6 rounded-xl font-bold"
                onClick={() => setStep('form')}
              >
                <Rocket className="mr-2 h-5 w-5" />
                Quero entrar na lista!
              </Button>
            </div>
          )}

          {step === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="text-center mb-2">
                <h2 className="text-lg font-bold text-foreground">Pré-cadastro</h2>
                <p className="text-xs text-muted-foreground">Cadastre-se para ser avisado quando lançarmos!</p>
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="pl-name" className="text-xs">Nome completo</Label>
                  <Input
                    id="pl-name"
                    value={form.full_name}
                    onChange={(e) => setForm(p => ({ ...p, full_name: e.target.value }))}
                    placeholder="Seu nome"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="pl-email" className="text-xs">Email</Label>
                  <Input
                    id="pl-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="seuemail@exemplo.com"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="pl-phone" className="text-xs">Telefone / WhatsApp</Label>
                  <Input
                    id="pl-phone"
                    value={form.phone}
                    onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="+55 11 99999-9999"
                    className="mt-1"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full py-5 rounded-xl font-bold" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Rocket className="mr-2 h-4 w-4" />}
                Garantir minha vaga
              </Button>

              <button type="button" onClick={() => setStep('countdown')} className="text-xs text-muted-foreground hover:text-foreground mx-auto block">
                ← Voltar
              </button>
            </form>
          )}

          {step === 'success' && (
            <div className="text-center space-y-4">
              <h2 className="text-xl font-bold text-foreground">Você está na lista! 🎉</h2>
              <p className="text-sm text-muted-foreground">
                Quando o Glory Pads for lançado, você receberá um email avisando. Fique ligado!
              </p>
              <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
                Entendido!
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrelaunchCountdownModal;
