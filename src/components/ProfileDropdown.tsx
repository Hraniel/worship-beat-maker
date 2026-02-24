import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAdminRole } from '@/hooks/useAdminRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  User, Mail, Calendar, Loader2, ChevronDown, LogOut,
  Zap, Crown, ShieldCheck, Phone, CreditCard, CheckCircle, Edit3,
} from 'lucide-react';

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

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

const tierBadge: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  free: { label: 'Free', icon: null, cls: 'bg-gray-100 text-gray-600' },
  pro: { label: 'Pro', icon: <Zap className="h-3 w-3" />, cls: 'bg-violet-100 text-violet-700' },
  master: { label: 'Master', icon: <Crown className="h-3 w-3" />, cls: 'bg-amber-100 text-amber-700' },
};

interface ProfileData {
  full_name: string;
  cpf: string;
  phone: string;
  birthday: string | null;
  profile_completed: boolean;
}

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const MONTHS = [
  { value: 0, label: 'Janeiro' }, { value: 1, label: 'Fevereiro' }, { value: 2, label: 'Março' },
  { value: 3, label: 'Abril' }, { value: 4, label: 'Maio' }, { value: 5, label: 'Junho' },
  { value: 6, label: 'Julho' }, { value: 7, label: 'Agosto' }, { value: 8, label: 'Setembro' },
  { value: 9, label: 'Outubro' }, { value: 10, label: 'Novembro' }, { value: 11, label: 'Dezembro' },
];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1919 }, (_, i) => currentYear - i);

const inputStyle = "h-8 text-xs bg-white text-black border border-gray-300 focus:border-gray-500 focus:ring-gray-400 placeholder:text-gray-400";
const selectStyle = "h-8 text-xs bg-white text-black border border-gray-300 rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-gray-400 appearance-none cursor-pointer";

export default function ProfileDropdown() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { tier, subscriptionEnd } = useSubscription();
  const { isAdmin, role: userRole } = useAdminRole();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDay, setBirthDay] = useState<number | ''>('');
  const [birthMonth, setBirthMonth] = useState<number | ''>('');
  const [birthYear, setBirthYear] = useState<number | ''>('');

  const badge = tierBadge[tier];
  const formattedEnd = subscriptionEnd
    ? new Date(subscriptionEnd).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;

  const roleLabel = userRole === 'ceo' ? 'CEO' : userRole === 'admin' ? 'Administrador' : userRole === 'moderator' ? 'Moderador' : null;

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('full_name, cpf, phone, birthday, profile_completed')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setProfile(data as ProfileData);
          setFullName(data.full_name || '');
          setCpf(data.cpf ? formatCpf(data.cpf) : '');
          setPhone(data.phone ? formatPhone(data.phone) : '');
          if (data.birthday) {
            const d = new Date(data.birthday + 'T12:00:00');
            setBirthDay(d.getDate());
            setBirthMonth(d.getMonth());
            setBirthYear(d.getFullYear());
          }
        }
      });
  }, [user]);

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
    } catch {
      toast.error(t('dashboard.portalError'));
    } finally {
      setPortalLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    if (!fullName.trim()) return toast.error('Preencha seu nome completo');
    if (cpf && !validateCpf(cpf)) return toast.error('CPF inválido');
    if (phone && phone.replace(/\D/g, '').length < 10) return toast.error('Telefone inválido');

    const birthdayDate = (birthDay && birthMonth !== '' && birthYear)
      ? new Date(birthYear as number, birthMonth as number, birthDay as number)
      : null;

    setSaving(true);
    try {
      const updates: Record<string, any> = {
        full_name: fullName.trim(),
        cpf: cpf.replace(/\D/g, '') || null,
        phone: phone.replace(/\D/g, '') || null,
        birthday: birthdayDate ? format(birthdayDate, 'yyyy-MM-dd') : null,
      };

      if (fullName.trim() && cpf && phone && birthdayDate) {
        updates.profile_completed = true;
        updates.profile_completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);
      if (error) throw error;

      setProfile(prev => prev ? { ...prev, ...updates } : prev);
      setEditMode(false);
      toast.success('Perfil atualizado! ✅');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao salvar perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen(prev => !prev)}
        className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
      >
        <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center">
          <User className="h-3.5 w-3.5 text-gray-500" />
        </div>
        <ChevronDown className={`h-3 w-3 text-gray-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setMenuOpen(false); setEditMode(false); }} />
          <div className="absolute right-0 top-10 z-50 w-80 bg-white rounded-xl border border-gray-200 shadow-xl p-4 space-y-3 max-h-[80vh] overflow-y-auto">
            {/* User info */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {profile?.full_name || user?.user_metadata?.display_name || user?.email?.split('@')[0]}
                </p>
                <button
                  onClick={() => setEditMode(v => !v)}
                  className={`p-1 rounded-md transition-colors ${editMode ? 'bg-violet-100 text-violet-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                  title="Editar perfil"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate">{user?.email}</span>
              </div>
              {profile?.phone && !editMode && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Phone className="h-3 w-3 shrink-0" />
                  <span>{formatPhone(profile.phone)}</span>
                </div>
              )}
              {profile?.birthday && !editMode && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Calendar className="h-3 w-3 shrink-0" />
                  <span>{new Date(profile.birthday + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                </div>
              )}
              {profile?.profile_completed && !editMode && (
                <div className="flex items-center gap-1 text-xs text-emerald-600">
                  <CheckCircle className="h-3 w-3" />
                  <span>Perfil completo</span>
                </div>
              )}
              {roleLabel && (
                <div className="flex items-center gap-1.5 text-xs text-amber-600">
                  <ShieldCheck className="h-3 w-3 shrink-0" />
                  <span>{roleLabel}</span>
                </div>
              )}
            </div>

            {/* Edit mode */}
            {editMode && (
              <>
                <div className="h-px bg-gray-100" />
                <div className="space-y-2.5">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-gray-500 uppercase tracking-wide">Nome completo</Label>
                    <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Seu nome completo" className={inputStyle} maxLength={100} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-gray-500 uppercase tracking-wide flex items-center gap-1">
                      <CreditCard className="h-2.5 w-2.5" /> CPF
                    </Label>
                    <Input value={cpf} onChange={e => setCpf(formatCpf(e.target.value))} placeholder="000.000.000-00" className={inputStyle} maxLength={14} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-gray-500 uppercase tracking-wide flex items-center gap-1">
                      <Phone className="h-2.5 w-2.5" /> Telefone
                    </Label>
                    <Input value={phone} onChange={e => setPhone(formatPhone(e.target.value))} placeholder="(00) 00000-0000" className={inputStyle} maxLength={15} type="tel" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-gray-500 uppercase tracking-wide flex items-center gap-1">
                      <Calendar className="h-2.5 w-2.5" /> Data de nascimento
                    </Label>
                    <div className="flex gap-1.5">
                      <select value={birthDay} onChange={e => setBirthDay(e.target.value ? Number(e.target.value) : '')} className={cn(selectStyle, "flex-[1]")}>
                        <option value="">Dia</option>
                        {DAYS.map(d => <option key={d} value={d}>{String(d).padStart(2, '0')}</option>)}
                      </select>
                      <select value={birthMonth} onChange={e => setBirthMonth(e.target.value !== '' ? Number(e.target.value) : '')} className={cn(selectStyle, "flex-[2]")}>
                        <option value="">Mês</option>
                        {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                      <select value={birthYear} onChange={e => setBirthYear(e.target.value ? Number(e.target.value) : '')} className={cn(selectStyle, "flex-[1.2]")}>
                        <option value="">Ano</option>
                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>
                  <Button onClick={handleSaveProfile} disabled={saving} size="sm" className="w-full h-8 text-xs bg-white hover:bg-gray-50 text-black border border-gray-300 rounded-lg">
                    {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                    Salvar perfil
                  </Button>
                </div>
              </>
            )}

            <div className="h-px bg-gray-100" />
            {/* Subscription */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('dashboard.subscription')}</span>
                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>
                  {badge.icon}{badge.label}
                </span>
              </div>
              {formattedEnd && <p className="text-[11px] text-gray-400">{t('dashboard.renewsOn')} {formattedEnd}</p>}
              {tier === 'free' ? (
                <Button onClick={() => { setMenuOpen(false); navigate('/pricing'); }} size="sm" className="w-full h-8 text-xs rounded-lg bg-white hover:bg-gray-50 text-black border border-gray-300">
                  <Zap className="h-3 w-3 mr-1" /> {t('dashboard.upgrade')}
                </Button>
              ) : (
                <Button onClick={handleManageSubscription} size="sm" className="w-full h-8 text-xs rounded-lg bg-white hover:bg-gray-50 text-black border border-gray-300" disabled={portalLoading}>
                  {portalLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : t('dashboard.manageSubscription')}
                </Button>
              )}
            </div>
            <div className="h-px bg-gray-100" />
            <button onClick={handleSignOut}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
              <LogOut className="h-3.5 w-3.5" />
              {t('dashboard.signOut')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
