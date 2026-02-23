import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Ticket, Clock, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SupportTicket {
  id: string;
  full_name: string;
  question: string;
  status: 'received' | 'in_progress' | 'done';
  created_at: string;
  updated_at: string;
}

const statusConfig: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  received: { label: 'Recebido', cls: 'bg-amber-100 text-amber-800', icon: <Clock className="h-3.5 w-3.5" /> },
  in_progress: { label: 'Em Andamento', cls: 'bg-blue-100 text-blue-800', icon: <Loader2 className="h-3.5 w-3.5" /> },
  done: { label: 'Finalizado', cls: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3.5 w-3.5" /> },
};

export default function MyTickets() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('support_tickets')
        .select('id, full_name, question, status, created_at, updated_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setTickets((data || []) as SupportTicket[]);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const formatDate = (d: string) => new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/help" className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-violet-500" />
            <h1 className="text-lg font-bold">Meus Tickets</h1>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <Ticket className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Nenhum ticket de suporte encontrado.</p>
            <p className="text-xs text-muted-foreground">Abra um ticket pelo assistente de IA na Central de Ajuda.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((t, i) => {
              const sc = statusConfig[t.status];
              return (
                <div key={t.id} className="border border-border rounded-xl p-4 bg-card space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Ticket #{tickets.length - i}</span>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${sc?.cls}`}>
                      {sc?.icon} {sc?.label}
                    </span>
                  </div>
                  <p className="text-xs text-foreground whitespace-pre-wrap line-clamp-3">{t.question}</p>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Aberto em {formatDate(t.created_at)}</span>
                    {t.status !== 'received' && <span>Atualizado em {formatDate(t.updated_at)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
