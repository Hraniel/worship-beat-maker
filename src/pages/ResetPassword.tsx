import React, { useState, useEffect } from 'react';
import logoDark from '@/assets/logo-dark.png';
import logoLight from '@/assets/logo-light.png';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
        setChecking(false);
      }
    });

    // Check if we already have a session with recovery type from URL hash
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsRecovery(true);
    }
    
    // Give time for the auth state change to fire
    const timeout = setTimeout(() => setChecking(false), 2000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password.trim() || !confirmPassword.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Senha alterada com sucesso!');
        navigate('/app');
      }
    } finally {
      setSubmitting(false);
    }
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
          <img
            src={document.documentElement.classList.contains('dark') ? logoLight : logoDark}
            alt="Glory Pads"
            className="h-12 w-12 mx-auto"
          />
          <h1 className="text-xl font-bold text-foreground">Link inválido</h1>
          <p className="text-sm text-muted-foreground">
            Este link de recuperação é inválido ou expirou. Solicite um novo link.
          </p>
          <Button onClick={() => navigate('/auth')} className="w-full">
            Voltar para login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <img
            src={document.documentElement.classList.contains('dark') ? logoLight : logoDark}
            alt="Glory Pads"
            className="h-12 w-12 mx-auto"
          />
          <h1 className="text-xl font-bold text-foreground">Nova senha</h1>
          <p className="text-sm text-muted-foreground">
            Digite sua nova senha abaixo.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Nova senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="bg-card border-border"
            />
            <Input
              type="password"
              placeholder="Confirmar nova senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              className="bg-card border-border"
            />
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Aguarde...' : 'Alterar senha'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
