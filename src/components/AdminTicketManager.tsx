import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Ticket, Clock, CheckCircle, Loader2, MessageSquare, Phone, Mail, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SupportTicket {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  question: string;
  status: 'received' | 'in_progress' | 'done';
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  user_id: string | null;
}

const statusConfig: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  received: { label: 'Recebido', cls: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Clock className="h-3 w-3" /> },
  in_progress: { label: 'Em Andamento', cls: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Loader2 className="h-3 w-3" /> },
  done: { label: 'Finalizado', cls: 'bg-green-100 text-green-700 border-green-200', icon: <CheckCircle className="h-3 w-3" /> },
};

const AdminTicketManager = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'received' | 'in_progress' | 'done'>('received');
  const [acting, setActing] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState('');

  const fetchTickets = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: true });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setTickets((data || []) as SupportTicket[]);
    } catch {
      toast.error('Erro ao carregar tickets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTickets(); }, [filter]);

  const sendTicketEmail = async (ticketId: string, newStatus: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) return;
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/send-ticket-email`;
      await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ ticketId, newStatus }),
      });
    } catch {
      // Fallback silencioso
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    setActing(id);
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: newStatus } as any)
        .eq('id', id);
      if (error) throw error;
      toast.success(`Ticket atualizado para "${statusConfig[newStatus]?.label}"`);
      // Fire-and-forget email notification
      sendTicketEmail(id, newStatus);
      fetchTickets();
    } catch {
      toast.error('Erro ao atualizar ticket.');
    } finally {
      setActing(null);
    }
  };

  const saveNotes = async (id: string) => {
    setActing(id);
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ admin_notes: notesValue } as any)
        .eq('id', id);
      if (error) throw error;
      toast.success('Notas salvas!');
      setEditingNotes(null);
      fetchTickets();
    } catch {
      toast.error('Erro ao salvar notas.');
    } finally {
      setActing(null);
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Ticket className="h-4 w-4" /> Tickets de Suporte
        </h3>
        <span className="text-xs text-muted-foreground">{tickets.length} ticket(s)</span>
      </div>

      {/* Filters */}
      <div className="flex gap-1 flex-wrap">
        {(['all', 'received', 'in_progress', 'done'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
              filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}>
            {f === 'all' ? 'Todos' : statusConfig[f]?.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : tickets.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-8">Nenhum ticket encontrado.</p>
      ) : (
        <div className="space-y-3">
          {tickets.map((t, i) => (
            <div key={t.id} className="border border-border rounded-xl p-4 bg-card space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-foreground">#{i + 1}</span>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusConfig[t.status]?.cls}`}>
                      {statusConfig[t.status]?.icon} {statusConfig[t.status]?.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{formatDate(t.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* Contact info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <User className="h-3 w-3 shrink-0" />
                  <span className="truncate text-foreground font-medium">{t.full_name}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Mail className="h-3 w-3 shrink-0" />
                  <span className="truncate text-foreground">{t.email}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Phone className="h-3 w-3 shrink-0" />
                  <span className="text-foreground">{t.phone}</span>
                </div>
              </div>

              {/* Question */}
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
                  <MessageSquare className="h-3 w-3" /> Dúvida
                </div>
                <p className="text-xs text-foreground whitespace-pre-wrap">{t.question}</p>
              </div>

              {/* Admin notes */}
              {editingNotes === t.id ? (
                <div className="space-y-2">
                  <textarea
                    value={notesValue}
                    onChange={e => setNotesValue(e.target.value)}
                    className="w-full h-20 px-3 py-2 text-xs rounded-lg bg-white text-black border border-border focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                    placeholder="Notas internas do admin..."
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setEditingNotes(null)}>Cancelar</Button>
                    <Button size="sm" className="text-xs h-7" onClick={() => saveNotes(t.id)} disabled={acting === t.id}>Salvar</Button>
                  </div>
                </div>
              ) : t.admin_notes ? (
                <div className="bg-blue-50 rounded-lg p-3 cursor-pointer" onClick={() => { setEditingNotes(t.id); setNotesValue(t.admin_notes || ''); }}>
                  <p className="text-[10px] text-blue-600 font-semibold mb-1">📝 Notas do Admin (clique para editar)</p>
                  <p className="text-xs text-blue-800 whitespace-pre-wrap">{t.admin_notes}</p>
                </div>
              ) : null}

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                {!t.admin_notes && editingNotes !== t.id && (
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { setEditingNotes(t.id); setNotesValue(''); }}>
                    📝 Adicionar Nota
                  </Button>
                )}
                {t.status === 'received' && (
                  <Button size="sm" className="text-xs h-7 bg-blue-600 hover:bg-blue-700" onClick={() => updateStatus(t.id, 'in_progress')} disabled={acting === t.id}>
                    ▶️ Em Andamento
                  </Button>
                )}
                {t.status === 'in_progress' && (
                  <Button size="sm" className="text-xs h-7 bg-green-600 hover:bg-green-700" onClick={() => updateStatus(t.id, 'done')} disabled={acting === t.id}>
                    ✅ Finalizar
                  </Button>
                )}
                {t.status === 'done' && (
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateStatus(t.id, 'received')} disabled={acting === t.id}>
                    🔄 Reabrir
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminTicketManager;
