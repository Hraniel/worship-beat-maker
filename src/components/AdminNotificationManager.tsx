import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Bell, Send, Users, User, Loader2, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Notification {
  id: string;
  title: string;
  message: string;
  target: string;
  target_user_id: string | null;
  channels: string[];
  created_at: string;
}

interface UserOption {
  id: string;
  email: string;
}

const AdminNotificationManager: React.FC = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState<'all' | 'individual'>('all');
  const [targetUserId, setTargetUserId] = useState('');
  const [channels, setChannels] = useState<('in-app' | 'push')[]>(['in-app']);
  const [sending, setSending] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (target === 'individual') fetchUserList();
  }, [target]);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('admin_notifications' as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    setNotifications((data as any[]) || []);
  };

  const fetchUserList = async () => {
    setLoadingUsers(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) return;
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const resp = await fetch(`https://${projectId}.supabase.co/functions/v1/admin-get-users`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list' }),
      });
      const json = await resp.json();
      setUsers((json.users || []).map((u: any) => ({ id: u.id, email: u.email })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUsers(false);
    }
  };

  const toggleChannel = (ch: 'in-app' | 'push') => {
    setChannels(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]);
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) { toast.error('Preencha título e mensagem'); return; }
    if (target === 'individual' && !targetUserId) { toast.error('Selecione um usuário'); return; }
    if (channels.length === 0) { toast.error('Selecione ao menos um canal'); return; }

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Save to DB
      const { error } = await supabase
        .from('admin_notifications' as any)
        .insert({
          title: title.trim(),
          message: message.trim(),
          target: target === 'all' ? 'all' : targetUserId,
          target_user_id: target === 'individual' ? targetUserId : null,
          sent_by: user.id,
          channels,
        });
      if (error) throw error;

      // If push channel, call push notification function
      if (channels.includes('push')) {
        const { data: session } = await supabase.auth.getSession();
        const token = session?.session?.access_token;
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        await fetch(`https://${projectId}.supabase.co/functions/v1/send-push-notification`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'broadcast',
            title: title.trim(),
            message: message.trim(),
          }),
        });
      }

      toast.success('Notificação enviada!');
      setTitle('');
      setMessage('');
      setTargetUserId('');
      fetchNotifications();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao enviar notificação');
    } finally {
      setSending(false);
    }
  };

  const filteredUsers = users.filter(u => u.email.toLowerCase().includes(userSearch.toLowerCase()));

  return (
    <div className="space-y-4">
      {/* Compose form */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Bell className="h-4 w-4 text-primary" />
          <p className="text-xs font-semibold text-foreground">Nova Notificação</p>
        </div>

        {/* Target */}
        <div className="flex gap-2">
          {(['all', 'individual'] as const).map(t => (
            <button key={t} onClick={() => setTarget(t)}
              className={`flex items-center gap-1.5 flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${target === t ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}>
              {t === 'all' ? <Users className="h-3 w-3" /> : <User className="h-3 w-3" />}
              {t === 'all' ? 'Todos' : 'Individual'}
            </button>
          ))}
        </div>

        {/* User selector */}
        {target === 'individual' && (
          <div className="space-y-1.5">
            <input
              placeholder="Buscar usuário..."
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              className="w-full h-8 px-3 text-xs rounded-lg bg-background border border-input text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <div className="max-h-32 overflow-y-auto rounded-lg border border-border divide-y divide-border">
              {loadingUsers ? (
                <div className="flex items-center justify-center py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : filteredUsers.slice(0, 20).map(u => (
                <button key={u.id} onClick={() => { setTargetUserId(u.id); setUserSearch(u.email); }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-left text-xs transition-colors hover:bg-muted ${targetUserId === u.id ? 'bg-primary/10 text-primary' : 'text-foreground'}`}>
                  <span className="truncate">{u.email}</span>
                  {targetUserId === u.id && <Check className="h-3 w-3 shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Channels */}
        <div className="flex gap-2">
          {(['in-app', 'push'] as const).map(ch => (
            <button key={ch} onClick={() => toggleChannel(ch)}
              className={`flex-1 py-1 rounded-lg text-[11px] font-medium border transition-colors ${channels.includes(ch) ? 'bg-primary/20 text-primary border-primary/40' : 'border-border text-muted-foreground hover:bg-muted'}`}>
              {ch === 'in-app' ? '📱 In-app' : '🔔 Push'}
            </button>
          ))}
        </div>

        {/* Title */}
        <input
          placeholder="Título da notificação"
          value={title}
          onChange={e => setTitle(e.target.value)}
          maxLength={100}
          className="w-full h-8 px-3 text-xs rounded-lg bg-background border border-input text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />

        {/* Message */}
        <textarea
          placeholder="Mensagem..."
          value={message}
          onChange={e => setMessage(e.target.value)}
          maxLength={500}
          rows={3}
          className="w-full px-3 py-2 text-xs rounded-lg bg-background border border-input text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
        />

        <Button size="sm" className="w-full h-8 text-xs gap-1.5" onClick={handleSend} disabled={sending}>
          {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          Enviar Notificação
        </Button>
      </div>

      {/* History */}
      {notifications.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">Histórico</p>
            <button
              onClick={handleDeleteAll}
              className="flex items-center gap-1 text-[10px] font-medium text-destructive hover:bg-destructive/10 px-2 py-1 rounded-md transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              Apagar todas
            </button>
          </div>
          <div className="divide-y divide-border">
            {notifications.map(n => (
              <div key={n.id} className="px-4 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium text-foreground truncate">{n.title}</p>
                  <span className="text-[9px] text-muted-foreground shrink-0">
                    {new Date(n.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                <div className="flex gap-1.5 mt-1">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${n.target === 'all' ? 'bg-primary/15 text-primary' : 'bg-blue-500/15 text-blue-400'}`}>
                    {n.target === 'all' ? 'Todos' : 'Individual'}
                  </span>
                  {(n.channels || []).map(ch => (
                    <span key={ch} className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{ch}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNotificationManager;
