import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Shield, ShieldOff, Users, Loader2, ShoppingBag, Calendar } from 'lucide-react';

interface UserRow {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  purchase_count: number;
  is_admin: boolean;
}

const AdminUserManager: React.FC = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const resp = await fetch(`https://${projectId}.supabase.co/functions/v1/admin-get-users`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list' }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || 'Erro ao buscar usuários');
      setUsers(json.users || []);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const toggleAdmin = async (user: UserRow) => {
    setTogglingId(user.id);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const action = user.is_admin ? 'demote' : 'promote';
      const resp = await fetch(`https://${projectId}.supabase.co/functions/v1/admin-get-users`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, userId: user.id }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || 'Erro');

      toast.success(user.is_admin ? `${user.email} rebaixado` : `${user.email} promovido a admin`);
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao alterar role');
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">{users.length} usuários cadastrados</p>
        <Button size="sm" variant="outline" className="ml-auto h-7 text-xs" onClick={fetchUsers}>
          Atualizar
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
        {users.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">Nenhum usuário encontrado</p>
        )}
        {users.map((user) => (
          <div key={user.id} className="flex items-center gap-3 px-3 py-2.5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-medium text-foreground truncate">{user.email}</p>
                {user.is_admin && (
                  <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-semibold shrink-0">ADMIN</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <ShoppingBag className="h-2.5 w-2.5" /> {user.purchase_count} compras
                </span>
                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <Calendar className="h-2.5 w-2.5" /> {new Date(user.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
            <button
              onClick={() => toggleAdmin(user)}
              disabled={togglingId === user.id}
              className={`p-1.5 rounded-lg transition-colors ${user.is_admin ? 'hover:bg-destructive/10 text-destructive' : 'hover:bg-primary/10 text-muted-foreground hover:text-primary'}`}
              title={user.is_admin ? 'Remover admin' : 'Promover a admin'}
            >
              {togglingId === user.id
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : user.is_admin
                  ? <ShieldOff className="h-3.5 w-3.5" />
                  : <Shield className="h-3.5 w-3.5" />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminUserManager;
