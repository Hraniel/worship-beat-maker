import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Gift, CheckCircle, Loader2, Calendar, Phone, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// Format phone: (XX) XXXXX-XXXX
function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

// Format CPF: XXX.XXX.XXX-XX
function formatCpf(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function validateCpf(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  if (rest !== parseInt(digits[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  return rest === parseInt(digits[10]);
}

export default function ProfileCompletion() {
  const { user } = useAuth();
  const { tier } = useSubscription();
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState<Date | undefined>();
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState<boolean | null>(null);
  const [rewardEnabled, setRewardEnabled] = useState(false);
  const [rewardDays, setRewardDays] = useState(7);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Check if profile already completed
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, cpf, phone, birthday, profile_completed')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (profile) {
        setCompleted(!!profile.profile_completed);
        if (profile.full_name) setFullName(profile.full_name);
        if (profile.cpf) setCpf(formatCpf(profile.cpf));
        if (profile.phone) setPhone(formatPhone(profile.phone));
        if (profile.birthday) setBirthday(new Date(profile.birthday + 'T12:00:00'));
      } else {
        setCompleted(false);
      }

      // Check reward config
      const { data: configs } = await supabase
        .from('app_config')
        .select('config_key, config_value')
        .in('config_key', ['profile_completion_reward_enabled', 'profile_completion_reward_days']);
      
      configs?.forEach(c => {
        if (c.config_key === 'profile_completion_reward_enabled') setRewardEnabled(c.config_value === 'true');
        if (c.config_key === 'profile_completion_reward_days') setRewardDays(parseInt(c.config_value) || 7);
      });
    })();
  }, [user]);

  if (completed === null || completed === true) return null;

  const isEligibleForReward = rewardEnabled && (tier === 'pro' || tier === 'master');

  const handleSave = async () => {
    if (!user) return;
    if (!fullName.trim()) return toast.error('Preencha seu nome completo');
    if (!validateCpf(cpf)) return toast.error('CPF inválido');
    if (phone.replace(/\D/g, '').length < 10) return toast.error('Telefone inválido');
    if (!birthday) return toast.error('Selecione sua data de aniversário');

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          cpf: cpf.replace(/\D/g, ''),
          phone: phone.replace(/\D/g, ''),
          birthday: format(birthday, 'yyyy-MM-dd'),
          profile_completed: true,
          profile_completed_at: new Date().toISOString(),
        } as any)
        .eq('user_id', user.id);

      if (error) throw error;

      // If eligible for reward, extend granted_tier
      if (isEligibleForReward) {
        const { data: existingGrant } = await supabase
          .from('granted_tiers')
          .select('id, expires_at')
          .eq('user_id', user.id)
          .maybeSingle();

        const now = new Date();
        const baseDate = existingGrant?.expires_at ? new Date(existingGrant.expires_at) : now;
        const newExpiry = new Date(Math.max(baseDate.getTime(), now.getTime()) + rewardDays * 24 * 60 * 60 * 1000);

        if (existingGrant) {
          await supabase
            .from('granted_tiers')
            .update({ expires_at: newExpiry.toISOString() } as any)
            .eq('id', existingGrant.id);
        }
        // Note: if no existing grant, the reward only applies to users who already have a subscription
        // The admin can manually grant via the panel
      }

      setCompleted(true);
      toast.success(isEligibleForReward
        ? `Perfil completo! 🎉 Você ganhou +${rewardDays} dias grátis!`
        : 'Perfil completo! ✅');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar perfil');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-6 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <User className="h-5 w-5 text-violet-600" />
        <h3 className="text-sm font-bold text-gray-900">Complete seu perfil</h3>
        {isEligibleForReward && (
          <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
            <Gift className="h-3 w-3" /> +{rewardDays} dias grátis
          </span>
        )}
      </div>

      {isEligibleForReward && (
        <p className="text-xs text-violet-600 mb-4">
          Complete seu cadastro e ganhe <strong>+{rewardDays} dias</strong> de acesso {tier === 'master' ? 'Master' : 'Pro'} grátis!
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-600">Nome completo</Label>
          <Input
            placeholder="Seu nome completo"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            maxLength={100}
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-gray-600 flex items-center gap-1">
            <CreditCard className="h-3 w-3" /> CPF
          </Label>
          <Input
            placeholder="000.000.000-00"
            value={cpf}
            onChange={e => setCpf(formatCpf(e.target.value))}
            maxLength={14}
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-gray-600 flex items-center gap-1">
            <Phone className="h-3 w-3" /> Telefone
          </Label>
          <Input
            placeholder="(00) 00000-0000"
            value={phone}
            onChange={e => setPhone(formatPhone(e.target.value))}
            maxLength={15}
            className="h-9 text-sm"
            type="tel"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-gray-600 flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Data de aniversário
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full h-9 justify-start text-left text-sm font-normal",
                  !birthday && "text-muted-foreground"
                )}
              >
                {birthday ? format(birthday, "dd/MM/yyyy") : <span>Selecione a data</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={birthday}
                onSelect={setBirthday}
                disabled={(date) => date > new Date() || date < new Date("1920-01-01")}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
                captionLayout="dropdown-buttons"
                fromYear={1920}
                toYear={new Date().getFullYear()}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="mt-4 w-full sm:w-auto bg-violet-600 hover:bg-violet-700 text-white h-9 text-sm rounded-lg"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
        Salvar perfil
      </Button>
    </div>
  );
}
