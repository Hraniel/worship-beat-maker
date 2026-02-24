import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Ticket, Clock, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import TicketConversation from '@/components/TicketConversation';

interface SupportTicket {
  id: string;
  full_name: string;
  question: string;
  status: 'received' | 'in_progress' | 'done';
  created_at: string;
  updated_at: string;
}

export default function MyTickets() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<{ ticket: SupportTicket; index: number } | null>(null);

  const statusConfig: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    received: { label: t('tickets.received'), cls: 'bg-amber-100 text-amber-800', icon: <Clock className="h-3.5 w-3.5" /> },
    in_progress: { label: t('tickets.inProgress'), cls: 'bg-blue-100 text-blue-800', icon: <Loader2 className="h-3.5 w-3.5" /> },
    done: { label: t('tickets.done'), cls: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3.5 w-3.5" /> },
  };

  const fetchTickets = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('support_tickets')
      .select('id, full_name, question, status, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setTickets((data || []) as SupportTicket[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchTickets();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('my_tickets_realtime')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'support_tickets',
      }, () => {
        fetchTickets();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const formatDate = (d: string) => new Date(d).toLocaleString(undefined, { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

  if (selectedTicket) {
    return (
      <div className="min-h-screen bg-background text-foreground" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-lg mx-auto px-4 py-6 h-screen flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <TicketConversation
            ticketId={selectedTicket.ticket.id}
            ticketQuestion={selectedTicket.ticket.question}
            ticketStatus={selectedTicket.ticket.status}
            ticketNumber={tickets.length - selectedTicket.index}
            onBack={() => { setSelectedTicket(null); fetchTickets(); }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center gap-3">
          <Link to="/help" className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-violet-500" />
            <h1 className="text-lg font-bold">{t('tickets.title')}</h1>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <Ticket className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{t('tickets.empty')}</p>
            <p className="text-xs text-muted-foreground">{t('tickets.emptyHint')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((tk, i) => {
              const sc = statusConfig[tk.status];
              return (
                <button
                  key={tk.id}
                  type="button"
                  onClick={() => setSelectedTicket({ ticket: tk, index: i })}
                  className="w-full text-left border border-border rounded-xl p-4 bg-card space-y-2 cursor-pointer hover:border-primary/30 transition-colors active:scale-[0.99]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">{t('tickets.ticketNumber', { number: tickets.length - i })}</span>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${sc?.cls}`}>
                      {sc?.icon} {sc?.label}
                    </span>
                  </div>
                  <p className="text-xs text-foreground whitespace-pre-wrap line-clamp-3">{tk.question}</p>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{t('tickets.openedAt')} {formatDate(tk.created_at)}</span>
                    {tk.status !== 'received' && <span>{t('tickets.updatedAt')} {formatDate(tk.updated_at)}</span>}
                  </div>
                  <p className="text-[10px] text-primary font-medium">{t('tickets.viewConversation')}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}