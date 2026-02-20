import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { RefreshCw, Users, Globe, Loader2, Search, Clock } from 'lucide-react';

interface UserRow {
  id: string;
  email: string;
}

const AdminCacheManager: React.FC = () => {
  const [globalLoading, setGlobalLoading] = useState(false);
  const [userLoading, setUserLoading] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

  // Load current cache version
  const fetchVersion = useCallback(async () => {
    const { data } = await supabase
      .from('landing_config')
      .select('config_value')
      .eq('config_key', 'app_cache_version')
      .maybeSingle();
    setCurrentVersion(data?.config_value ?? null);
  }, []);

  // Load users
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) return;
      const resp = await fetch(`https://${projectId}.supabase.co/functions/v1/admin-get-users`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list' }),
      });
      const json = await resp.json();
      setUsers((json.users ?? []).map((u: any) => ({ id: u.id, email: u.email })));
    } catch {
      toast.error('Erro ao carregar usuários');
    } finally {
      setUsersLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchVersion();
    fetchUsers();
  }, [fetchVersion, fetchUsers]);

  // ── Global cache bump ──────────────────────────────────────────────────────
  const handleGlobalRefresh = async () => {
    if (!confirm('Forçar atualização de cache para TODOS os usuários?')) return;
    setGlobalLoading(true);
    try {
      const ts = Date.now().toString();
      const existing = await supabase
        .from('landing_config')
        .select('id')
        .eq('config_key', 'app_cache_version')
        .maybeSingle();

      if (existing.data?.id) {
        await supabase
          .from('landing_config')
          .update({ config_value: ts })
          .eq('config_key', 'app_cache_version');
      } else {
        await supabase
          .from('landing_config')
          .insert({ config_key: 'app_cache_version', config_value: ts });
      }

      setCurrentVersion(ts);
      toast.success('Cache global atualizado! Todos os usuários conectados serão recarregados agora.');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao atualizar cache');
    } finally {
      setGlobalLoading(false);
    }
  };

  // ── Per-user cache bump (stores user-specific version key) ────────────────
  const handleUserRefresh = async (user: UserRow) => {
    setUserLoading(user.id);
    try {
      const userKey = `user_cache_version_${user.id}`;
      const ts = Date.now().toString();

      const existing = await supabase
        .from('landing_config')
        .select('id')
        .eq('config_key', userKey)
        .maybeSingle();

      if (existing.data?.id) {
        await supabase
          .from('landing_config')
          .update({ config_value: ts })
          .eq('config_key', userKey);
      } else {
        await supabase
          .from('landing_config')
          .insert({ config_key: userKey, config_value: ts });
      }

      toast.success(`O app de ${user.email} será recarregado agora.`);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao forçar cache do usuário');
    } finally {
      setUserLoading(null);
    }
  };

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formattedVersion = currentVersion
    ? new Date(parseInt(currentVersion)).toLocaleString('pt-BR')
    : 'Nunca definido';

  return (
    <div className="space-y-5">
      {/* Global cache card */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Cache Global</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Força o recarregamento <strong>imediato</strong> do app para <strong>todos os usuários conectados</strong>.
          Usuários offline receberão a atualização na próxima visita.
        </p>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span>Versão atual: <span className="text-foreground font-mono">{formattedVersion}</span></span>
        </div>

        <Button
          onClick={handleGlobalRefresh}
          disabled={globalLoading}
          className="w-full h-9 text-xs"
          variant="destructive"
        >
          {globalLoading
            ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
            : <RefreshCw className="h-3.5 w-3.5 mr-2" />}
          Forçar Atualização Imediata — Todos
        </Button>
      </div>

      {/* Per-user cache card */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Cache por Usuário</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Força o recarregamento imediato do app para um usuário específico que esteja online.
        </p>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-8 pr-3 text-xs rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* User list */}
        {usersLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">Nenhum usuário encontrado</p>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {filteredUsers.map(user => (
              <div
                key={user.id}
                className="flex items-center justify-between gap-3 bg-muted/40 hover:bg-muted/60 transition-colors rounded-lg px-3 py-2"
              >
                <span className="text-xs text-foreground truncate flex-1">{user.email}</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-[10px] shrink-0"
                  onClick={() => handleUserRefresh(user)}
                  disabled={userLoading === user.id}
                >
                  {userLoading === user.id
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <RefreshCw className="h-3 w-3 mr-1" />}
                  {userLoading === user.id ? '' : 'Forçar'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCacheManager;
