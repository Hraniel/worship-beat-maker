import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type UserRole = 'ceo' | 'admin' | 'moderator' | null;

export function useAdminRole() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setRole(null);
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();
        
        const r = data?.role as string | undefined;
        if (r === 'ceo') {
          setIsAdmin(true);
          setRole('ceo');
        } else if (r === 'admin') {
          setIsAdmin(true);
          setRole('admin');
        } else if (r === 'moderator') {
          setIsAdmin(true);
          setRole('moderator');
        } else {
          setIsAdmin(false);
          setRole(null);
        }
      } catch {
        setIsAdmin(false);
        setRole(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  return { isAdmin, role, loading };
}
