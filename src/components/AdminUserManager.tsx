import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Shield, ShieldOff, Users, Loader2, ShoppingBag, Calendar, ChevronDown,
  ShieldCheck, Search, Trash2, Mail, Key, Ban, Gift, Clock, Globe, RotateCcw,
  User, Phone, CreditCard, CheckCircle,
} from 'lucide-react';

import { useAdminRole, UserRole } from '@/hooks/useAdminRole';

type AppRole = 'admin' | 'moderator';

interface UserRow {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  purchase_count: number;
  is_admin: boolean;
  is_moderator: boolean;
  is_ceo?: boolean;
  is_banned?: boolean;
  ban_expires_at?: string | null;
  granted_tier?: string | null;
  ip?: string | null;
  full_name?: string | null;
  phone?: string | null;
  cpf?: string | null;
  birthday?: string | null;
  profile_completed?: boolean;
}

const CEO_EMAIL = 'hranielvictor@gmail.com';

const ROLE_HIERARCHY: Record<string, { label: string; color: string; level: number; description: string }> = {
  ceo: { label: 'CEO', color: 'bg-amber-500/20 text-amber-500', level: 3, description: 'Controle absoluto. Não pode ser removido ou rebaixado por nenhum outro cargo.' },
  admin: { label: 'ADMIN', color: 'bg-primary/20 text-primary', level: 2, description: 'Acesso total ao painel admin: gerencia packs, traduções, premiações, tickets, usuários e configurações.' },
  moderator: { label: 'MOD', color: 'bg-blue-500/20 text-blue-400', level: 1, description: 'Acesso à moderação: pode gerenciar tickets, sugestões da comunidade e visualizar usuários.' },
};

const ROLE_OPTIONS: { role: AppRole | null; label: string; description: string }[] = [
  { role: 'admin', label: 'Admin', description: 'Acesso total ao painel' },
  { role: 'moderator', label: 'Moderador', description: 'Acesso de moderação' },
  { role: null, label: 'Remover cargo', description: 'Volta a usuário padrão' },
];

type RoleFilter = 'all' | 'ceo' | 'admin' | 'moderator' | 'user';

const ROLE_CHIPS: { value: RoleFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'ceo', label: 'CEO' },
  { value: 'admin', label: 'Admin' },
  { value: 'moderator', label: 'Moderador' },
  { value: 'user', label: 'Usuário' },
];

// ── Ban Modal ──────────────────────────────────────────────────────────────────
interface BanModalProps {
  user: UserRow;
  onClose: () => void;
  onBan: (userId: string, email: string, type: string, reason: string, days?: number, ip?: string) => Promise<void>;
}

const BanModal: React.FC<BanModalProps> = ({ user, onClose, onBan }) => {
  const [banType, setBanType] = useState<'permanent' | 'temporary'>('temporary');
  const [days, setDays] = useState(7);
  const [reason, setReason] = useState('');
  const [ip, setIp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) { toast.error('Informe o motivo'); return; }
    setLoading(true);
    await onBan(user.id, user.email, banType, reason.trim(), banType === 'temporary' ? days : undefined, ip.trim() || undefined);
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
        <div className="flex items-center gap-2">
          <Ban className="h-4 w-4 text-destructive" />
          <p className="text-sm font-semibold text-foreground">Banir Usuário</p>
        </div>
        <p className="text-xs text-muted-foreground truncate">{user.email}</p>

        <div className="flex gap-2">
          {(['temporary', 'permanent'] as const).map(t => (
            <button key={t} onClick={() => setBanType(t)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${banType === t ? 'bg-destructive text-destructive-foreground border-destructive' : 'border-border text-muted-foreground hover:bg-muted'}`}>
              {t === 'temporary' ? 'Temporário' : 'Permanente'}
            </button>
          ))}
        </div>

        {banType === 'temporary' && (
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Duração (dias)</label>
            <input type="number" min={1} max={3650} value={days} onChange={e => setDays(Number(e.target.value))}
              className="w-full h-8 px-3 mt-1 text-xs rounded-lg bg-background border border-input text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
        )}

        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Motivo *</label>
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Ex: violação dos termos"
            className="w-full h-8 px-3 mt-1 text-xs rounded-lg bg-background border border-input text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>

        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wide">IP (opcional)</label>
          <input value={ip} onChange={e => setIp(e.target.value)} placeholder="192.168.x.x"
            className="w-full h-8 px-3 mt-1 text-xs rounded-lg bg-background border border-input text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>

        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="destructive" className="flex-1 h-8 text-xs" onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirmar Banimento'}
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={onClose}>Cancelar</Button>
        </div>
      </div>
    </div>
  );
};

// ── Grant Tier Modal ────────────────────────────────────────────────────────────
interface GrantTierModalProps {
  user: UserRow;
  onClose: () => void;
  onGrant: (userId: string, tier: string, note?: string) => Promise<void>;
  onRevoke: (userId: string) => Promise<void>;
}

const GrantTierModal: React.FC<GrantTierModalProps> = ({ user, onClose, onGrant, onRevoke }) => {
  const [tier, setTier] = useState<'pro' | 'master'>('pro');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGrant = async () => {
    setLoading(true);
    await onGrant(user.id, tier, note.trim() || undefined);
    setLoading(false);
    onClose();
  };

  const handleRevoke = async () => {
    setLoading(true);
    await onRevoke(user.id);
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-emerald-400" />
          <p className="text-sm font-semibold text-foreground">Acesso Gratuito</p>
        </div>
        <p className="text-xs text-muted-foreground truncate">{user.email}</p>

        {user.granted_tier && (
          <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
            <span className="text-xs text-emerald-400">Tier concedido: <strong>{user.granted_tier}</strong></span>
            <Button size="sm" variant="ghost" className="h-6 text-[10px] text-destructive hover:bg-destructive/10 px-2" onClick={handleRevoke} disabled={loading}>
              Revogar
            </Button>
          </div>
        )}

        <div className="flex gap-2">
          {(['pro', 'master'] as const).map(t => (
            <button key={t} onClick={() => setTier(t)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${tier === t ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}>
              {t === 'pro' ? '⚡ Pro' : '👑 Master'}
            </button>
          ))}
        </div>

        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Observação (opcional)</label>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Ex: parceiro, colaborador..."
            className="w-full h-8 px-3 mt-1 text-xs rounded-lg bg-background border border-input text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>

        <div className="flex gap-2 pt-1">
          <Button size="sm" className="flex-1 h-8 text-xs" onClick={handleGrant} disabled={loading}>
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Conceder Acesso'}
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={onClose}>Cancelar</Button>
        </div>
      </div>
    </div>
  );
};

// ── Change Credentials Modal ────────────────────────────────────────────────────
interface CredentialsModalProps {
  user: UserRow;
  onClose: () => void;
  onUpdate: (userId: string, email?: string, password?: string) => Promise<void>;
}

const CredentialsModal: React.FC<CredentialsModalProps> = ({ user, onClose, onUpdate }) => {
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    if (!newEmail.trim() && !newPassword.trim()) { toast.error('Preencha email ou senha'); return; }
    setLoading(true);
    await onUpdate(user.id, newEmail.trim() || undefined, newPassword.trim() || undefined);
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
        <div className="flex items-center gap-2">
          <Key className="h-4 w-4 text-blue-400" />
          <p className="text-sm font-semibold text-foreground">Alterar Credenciais</p>
        </div>
        <p className="text-xs text-muted-foreground truncate">{user.email}</p>

        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Novo Email (opcional)</label>
          <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder={user.email}
            className="w-full h-8 px-3 mt-1 text-xs rounded-lg bg-background border border-input text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>

        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Nova Senha (opcional)</label>
          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="mín. 6 caracteres"
            className="w-full h-8 px-3 mt-1 text-xs rounded-lg bg-background border border-input text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>

        <div className="flex gap-2 pt-1">
          <Button size="sm" className="flex-1 h-8 text-xs" onClick={handleUpdate} disabled={loading}>
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Salvar Alterações'}
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={onClose}>Cancelar</Button>
        </div>
      </div>
    </div>
  );
};

// ── Reset Purchase Modal ────────────────────────────────────────────────────────
interface Purchase {
  pack_id: string;
  pack_name: string;
  removed: boolean;
  purchased_at: string;
}

interface ResetPurchaseModalProps {
  user: UserRow;
  onClose: () => void;
  onReset: (userId: string, packId: string, packName: string) => Promise<void>;
  callAdmin: (body: object) => Promise<any>;
}

const ResetPurchaseModal: React.FC<ResetPurchaseModalProps> = ({ user, onClose, onReset, callAdmin }) => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(true);
  const [resettingId, setResettingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await callAdmin({ action: 'get-purchases', userId: user.id });
        setPurchases(data.purchases || []);
      } catch {
        toast.error('Erro ao buscar compras');
      } finally {
        setLoadingPurchases(false);
      }
    })();
  }, [user.id]);

  const handleReset = async (purchase: Purchase) => {
    if (!window.confirm(`Resetar compra de "${purchase.pack_name}"? O usuário voltará a ver o botão de compra.`)) return;
    setResettingId(purchase.pack_id);
    await onReset(user.id, purchase.pack_id, purchase.pack_name);
    setPurchases(prev => prev.filter(p => p.pack_id !== purchase.pack_id));
    setResettingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
        <div className="flex items-center gap-2">
          <RotateCcw className="h-4 w-4 text-amber-400" />
          <p className="text-sm font-semibold text-foreground">Resetar Compra de Pack</p>
        </div>
        <p className="text-xs text-muted-foreground truncate">{user.email}</p>

        {loadingPurchases ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : purchases.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">Nenhuma compra encontrada</p>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {purchases.map(p => (
              <div key={p.pack_id} className="flex items-center justify-between gap-2 bg-muted/50 rounded-lg px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{p.pack_name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(p.purchased_at).toLocaleDateString('pt-BR')}
                    {p.removed && <span className="ml-1.5 text-amber-400 font-medium">· removido</span>}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[10px] px-2 border-amber-500/40 text-amber-400 hover:bg-amber-500/10 shrink-0"
                  onClick={() => handleReset(p)}
                  disabled={resettingId === p.pack_id}
                >
                  {resettingId === p.pack_id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Resetar'}
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="pt-1">
          <Button size="sm" variant="ghost" className="w-full h-8 text-xs" onClick={onClose}>Fechar</Button>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
const AdminUserManager: React.FC = () => {
  const { role: myRole } = useAdminRole();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [banModal, setBanModal] = useState<UserRow | null>(null);
  const [grantModal, setGrantModal] = useState<UserRow | null>(null);
  const [credModal, setCredModal] = useState<UserRow | null>(null);
  const [resetPurchaseModal, setResetPurchaseModal] = useState<UserRow | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const getToken = async () => {
    const { data: session } = await supabase.auth.getSession();
    return session?.session?.access_token;
  };

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
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
  }, [projectId]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const callAdmin = async (body: object) => {
    const token = await getToken();
    if (!token) throw new Error('Not authenticated');
    const resp = await fetch(`https://${projectId}.supabase.co/functions/v1/admin-get-users`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await resp.json();
    if (!resp.ok) throw new Error(json.error || 'Erro');
    return json;
  };

  const assignRole = async (user: UserRow, role: AppRole | null) => {
    setTogglingId(user.id);
    setOpenDropdown(null);
    try {
      let action: string;
      if (role === 'admin') action = 'promote';
      else if (role === 'moderator') action = 'promote-moderator';
      else action = 'remove-roles';
      await callAdmin({ action, userId: user.id });
      const roleLabel = role === 'admin' ? 'Admin' : role === 'moderator' ? 'Moderador' : 'cargo removido';
      toast.success(`${user.email}: ${roleLabel}`);
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao alterar cargo');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteUser = async (user: UserRow) => {
    if (!window.confirm(`Remover permanentemente ${user.email}? Esta ação é irreversível.`)) return;
    setActionLoading(user.id + '-delete');
    try {
      await callAdmin({ action: 'delete-user', userId: user.id });
      toast.success(`Usuário ${user.email} removido`);
      setUsers(prev => prev.filter(u => u.id !== user.id));
    } catch (e: any) {
      toast.error(e.message || 'Erro ao remover usuário');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResendVerification = async (user: UserRow) => {
    setActionLoading(user.id + '-verify');
    try {
      await callAdmin({ action: 'resend-verification', userId: user.id, email: user.email });
      toast.success(`Email de verificação enviado para ${user.email}`);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao enviar email');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBan = async (userId: string, email: string, type: string, reason: string, days?: number, ip?: string) => {
    try {
      await callAdmin({ action: 'ban-user', userId, email, banType: type, reason, days, ip });
      toast.success(`Usuário banido: ${email}`);
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao banir usuário');
    }
  };

  const handleGrantTier = async (userId: string, tier: string, note?: string) => {
    try {
      await callAdmin({ action: 'grant-tier', userId, tier, note });
      toast.success(`Acesso ${tier} concedido!`);
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao conceder acesso');
    }
  };

  const handleRevokeTier = async (userId: string) => {
    try {
      await callAdmin({ action: 'revoke-tier', userId });
      toast.success('Acesso gratuito revogado');
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao revogar acesso');
    }
  };

  const handleUpdateCredentials = async (userId: string, email?: string, password?: string) => {
    try {
      await callAdmin({ action: 'update-credentials', userId, email, password });
      toast.success('Credenciais atualizadas!');
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao atualizar credenciais');
    }
  };

  const handleResetPurchase = async (userId: string, packId: string, packName: string) => {
    try {
      await callAdmin({ action: 'reset-purchase', userId, packId });
      toast.success(`Compra de "${packName}" resetada. Usuário verá o botão de compra novamente.`);
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao resetar compra');
    }
  };

  const getCurrentRoleLabel = (user: UserRow) => {
    if (user.is_ceo) return 'CEO';
    if (user.is_admin) return 'Admin';
    if (user.is_moderator) return 'Mod';
    return null;
  };

  const isCeoUser = (user: UserRow) => user.email === CEO_EMAIL || user.is_ceo;

  const filtered = users.filter(u => {
    const matchesEmail = u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole =
      roleFilter === 'all' ||
      (roleFilter === 'ceo' && u.is_ceo) ||
      (roleFilter === 'admin' && u.is_admin) ||
      (roleFilter === 'moderator' && u.is_moderator) ||
      (roleFilter === 'user' && !u.is_admin && !u.is_moderator && !u.is_ceo);
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
    <>
      {banModal && (
        <BanModal user={banModal} onClose={() => setBanModal(null)} onBan={handleBan} />
      )}
      {grantModal && (
        <GrantTierModal user={grantModal} onClose={() => setGrantModal(null)} onGrant={handleGrantTier} onRevoke={handleRevokeTier} />
      )}
      {credModal && (
        <CredentialsModal user={credModal} onClose={() => setCredModal(null)} onUpdate={handleUpdateCredentials} />
      )}
      {resetPurchaseModal && (
        <ResetPurchaseModal
          user={resetPurchaseModal}
          onClose={() => setResetPurchaseModal(null)}
          onReset={handleResetPurchase}
          callAdmin={callAdmin}
        />
      )}

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

        {/* Role legend with descriptions */}
        <div className="bg-muted/50 border border-border rounded-xl p-3 space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Hierarquia de Cargos</p>
          {Object.entries(ROLE_HIERARCHY).map(([key, { label, color, description }]) => (
            <div key={key} className="flex items-start gap-2">
              <span className={`${color} px-1.5 py-0.5 rounded-full font-semibold text-[9px] shrink-0 mt-0.5`}>{label}</span>
              <span className="text-[10px] text-muted-foreground leading-tight">{description}</span>
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">Nenhum usuário encontrado</p>
          )}
          {filtered.map((user) => {
            const roleLabel = getCurrentRoleLabel(user);
            const isCeo = isCeoUser(user);
            const canManageUser = !isCeo || myRole === 'ceo';
            return (
              <div key={user.id} className="px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs font-medium text-foreground truncate">{user.email}</p>
                      {user.is_ceo && (
                        <span className="text-[9px] bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded-full font-semibold shrink-0">CEO</span>
                      )}
                      {user.is_admin && !user.is_ceo && (
                        <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-semibold shrink-0">ADMIN</span>
                      )}
                      {user.is_moderator && !user.is_ceo && !user.is_admin && (
                        <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full font-semibold shrink-0">MOD</span>
                      )}
                      {user.is_banned && (
                        <span className="text-[9px] bg-destructive/20 text-destructive px-1.5 py-0.5 rounded-full font-semibold shrink-0">BANIDO</span>
                      )}
                      {user.granted_tier && (
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-semibold shrink-0">
                          GRÁTIS·{user.granted_tier}
                        </span>
                      )}
                    </div>
                    {/* Profile info */}
                    {user.full_name && (
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <User className="h-2.5 w-2.5" /> {user.full_name}
                        </span>
                        {user.phone && (
                          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                            <Phone className="h-2.5 w-2.5" /> {user.phone}
                          </span>
                        )}
                        {user.cpf && (
                          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground font-mono">
                            <CreditCard className="h-2.5 w-2.5" /> ***.***.{user.cpf.slice(-5, -2)}-{user.cpf.slice(-2)}
                          </span>
                        )}
                        {user.profile_completed && (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-semibold">
                            <CheckCircle className="h-2 w-2 inline mr-0.5" />COMPLETO
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <ShoppingBag className="h-2.5 w-2.5" /> {user.purchase_count} compras
                      </span>
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <Calendar className="h-2.5 w-2.5" /> {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </span>
                      {user.last_sign_in_at && (
                        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <Clock className="h-2.5 w-2.5" /> {new Date(user.last_sign_in_at).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                      {user.ip && (
                        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground font-mono" title="Último IP de acesso">
                          <Globe className="h-2.5 w-2.5" /> {user.ip}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Role dropdown — only show if user can manage this user */}
                  {canManageUser && !isCeo ? (
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
                          <div className="absolute right-0 z-20 w-44 bg-popover border border-border rounded-xl shadow-xl overflow-hidden"
                            style={{ bottom: 'calc(100% + 4px)' }}>
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
                  ) : isCeo ? (
                    <span className="text-[10px] bg-amber-500/20 text-amber-500 px-2 py-1 rounded-lg font-semibold">CEO</span>
                  ) : null}
                </div>

                {/* Action buttons row — hidden for CEO users (unless you are CEO) */}
                {canManageUser && (
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  <button
                    onClick={() => handleResendVerification(user)}
                    disabled={actionLoading === user.id + '-verify'}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border border-border text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    {actionLoading === user.id + '-verify' ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Mail className="h-2.5 w-2.5" />}
                    Reenviar email
                  </button>
                  <button
                    onClick={() => setCredModal(user)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border border-border text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <Key className="h-2.5 w-2.5" /> Alterar dados
                  </button>
                  <button
                    onClick={() => setGrantModal(user)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                  >
                    <Gift className="h-2.5 w-2.5" /> Acesso grátis
                  </button>
                  {user.purchase_count > 0 && (
                    <button
                      onClick={() => setResetPurchaseModal(user)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors"
                    >
                      <RotateCcw className="h-2.5 w-2.5" /> Resetar compra
                    </button>
                  )}
                  {!isCeo && (
                  <>
                  <button
                    onClick={() => setBanModal(user)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border border-orange-500/30 text-orange-400 hover:bg-orange-500/10 transition-colors"
                  >
                    <Ban className="h-2.5 w-2.5" /> Banir
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user)}
                    disabled={actionLoading === user.id + '-delete'}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === user.id + '-delete' ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Trash2 className="h-2.5 w-2.5" />}
                    Remover
                  </button>
                  </>
                  )}
                </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default AdminUserManager;
