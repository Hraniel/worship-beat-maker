import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Shield, ShieldOff, Users, Loader2, ShoppingBag, Calendar, ChevronDown, ShieldCheck, Search } from 'lucide-react';

type AppRole = 'admin' | 'moderator';

interface UserRow {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  purchase_count: number;
  is_admin: boolean;
  is_moderator: boolean;
}

const ROLE_OPTIONS: { role: AppRole | null; label: string; description: string }[] = [
  { role: 'admin', label: 'Admin', description: 'Acesso total ao painel' },
  { role: 'moderator', label: 'Moderador', description: 'Acesso de moderação' },
  { role: null, label: 'Remover cargo', description: 'Volta a usuário padrão' },
];

type RoleFilter = 'all' | 'admin' | 'moderator' | 'user';

const ROLE_CHIPS: { value: RoleFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'admin', label: 'Admin' },
  { value: 'moderator', label: 'Moderador' },
  { value: 'user', label: 'Usuário' },
];

const AdminUserManager: React.FC = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

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

  const assignRole = async (user: UserRow, role: AppRole | null) => {
    setTogglingId(user.id);
    setOpenDropdown(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      let action: string;
      if (role === 'admin') action = 'promote';
      else if (role === 'moderator') action = 'promote-moderator';
      else action = 'remove-roles';

      const resp = await fetch(`https://${projectId}.supabase.co/functions/v1/admin-get-users`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, userId: user.id }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || 'Erro');

      const roleLabel = role === 'admin' ? 'Admin' : role === 'moderator' ? 'Moderador' : 'cargo removido';
      toast.success(`${user.email}: ${roleLabel}`);
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao alterar cargo');
    } finally {
      setTogglingId(null);
    }
  };

  const getCurrentRoleLabel = (user: UserRow) => {
    if (user.is_admin) return 'Admin';
    if (user.is_moderator) return 'Mod';
    return null;
  };

  const filtered = users.filter(u => {
    const matchesEmail = u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole =
      roleFilter === 'all' ||
      (roleFilter === 'admin' && u.is_admin) ||
      (roleFilter === 'moderator' && u.is_moderator) ||
      (roleFilter === 'user' && !u.is_admin && !u.is_moderator);
    return matchesEmail && matchesRole;
  });

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
        <p className="text-xs text-muted-foreground">{filtered.length} de {users.length} usuários</p>
        <Button size="sm" variant="outline" className="ml-auto h-7 text-xs" onClick={fetchUsers}>
          Atualizar
        </Button>
      </div>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Buscar por email..."
          className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Role filter chips */}
      <div className="flex gap-1.5 flex-wrap">
        {ROLE_CHIPS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setRoleFilter(value)}
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium transition-colors border ${
              roleFilter === value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Role legend */}
      <div className="flex gap-3 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-semibold">ADMIN</span>
          <span>Acesso total</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full font-semibold">MOD</span>
          <span>Moderador</span>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">Nenhum usuário encontrado</p>
        )}
        {filtered.map((user) => {
          const roleLabel = getCurrentRoleLabel(user);
          return (
            <div key={user.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-xs font-medium text-foreground truncate">{user.email}</p>
                  {user.is_admin && (
                    <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-semibold shrink-0">ADMIN</span>
                  )}
                  {user.is_moderator && (
                    <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full font-semibold shrink-0">MOD</span>
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

              {/* Role dropdown */}
              <div className="relative">
                <button
                  onClick={() => setOpenDropdown(prev => prev === user.id ? null : user.id)}
                  disabled={togglingId === user.id}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors border ${
                    user.is_admin
                      ? 'border-primary/30 text-primary hover:bg-primary/10'
                      : user.is_moderator
                        ? 'border-blue-500/30 text-blue-400 hover:bg-blue-500/10'
                        : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {togglingId === user.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="h-3 w-3" />
                      {roleLabel || 'Cargo'}
                      <ChevronDown className="h-2.5 w-2.5" />
                    </>
                  )}
                </button>

                {openDropdown === user.id && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
                    <div className="absolute right-0 top-8 z-20 w-44 bg-popover border border-border rounded-xl shadow-xl overflow-hidden">
                      {ROLE_OPTIONS.map(({ role, label, description }) => (
                        <button
                          key={label}
                          onClick={() => assignRole(user, role)}
                          className={`w-full flex flex-col items-start px-3 py-2 text-left transition-colors hover:bg-muted ${
                            (role === 'admin' && user.is_admin) || (role === 'moderator' && user.is_moderator)
                              ? 'bg-muted'
                              : ''
                          }`}
                        >
                          <span className={`text-[11px] font-medium ${
                            role === null ? 'text-destructive' :
                            role === 'admin' ? 'text-primary' :
                            'text-blue-400'
                          }`}>{label}</span>
                          <span className="text-[9px] text-muted-foreground">{description}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminUserManager;
