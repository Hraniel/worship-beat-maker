import React, { useState, useEffect } from 'react';
import logoDark from '@/assets/logo-dark.png';
import logoLight from '@/assets/logo-light.png';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const ResetPassword = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
        setChecking(false);
      }
    });
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsRecovery(true);
    }
    const timeout = setTimeout(() => setChecking(false), 2000);
    return () => { subscription.unsubscribe(); clearTimeout(timeout); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || !confirmPassword.trim()) { toast.error(t('resetPassword.fillAll')); return; }
    if (password.length < 6) { toast.error(t('resetPassword.minLength')); return; }
    if (password !== confirmPassword) { toast.error(t('resetPassword.mismatch')); return; }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) { toast.error(error.message); } else { toast.success(t('resetPassword.success')); navigate('/app'); }
    } finally { setSubmitting(false); }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isRecovery) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <img src={document.documentElement.classList.contains('dark') ? logoLight : logoDark} alt="Glory Pads" className="h-12 w-12 mx-auto" />
          <h1 className="text-xl font-bold text-foreground">{t('resetPassword.invalidLink')}</h1>
          <p className="text-sm text-muted-foreground">{t('resetPassword.invalidLinkDesc')}</p>
          <Button onClick={() => navigate('/auth')} className="w-full">{t('resetPassword.backToLogin')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <img src={document.documentElement.classList.contains('dark') ? logoLight : logoDark} alt="Glory Pads" className="h-12 w-12 mx-auto" />
          <h1 className="text-xl font-bold text-foreground">{t('resetPassword.newPassword')}</h1>
          <p className="text-sm text-muted-foreground">{t('resetPassword.newPasswordDesc')}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input type="password" placeholder={t('resetPassword.newPasswordPlaceholder')} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className="bg-card border-border" />
            <Input type="password" placeholder={t('resetPassword.confirmPasswordPlaceholder')} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" className="bg-card border-border" />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? t('resetPassword.submitting') : t('resetPassword.submit')}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
