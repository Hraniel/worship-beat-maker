import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Send, Loader2, ArrowLeft, Clock, CheckCircle, User, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TicketMessage {
  id: string;
  sender_type: 'user' | 'admin';
  message: string;
  created_at: string;
}

interface TicketConversationProps {
  ticketId: string;
  ticketQuestion: string;
  ticketStatus: string;
  ticketNumber: number;
  onBack: () => void;
}

const statusConfig: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  received: { label: 'Recebido', cls: 'bg-amber-100 text-amber-800', icon: <Clock className="h-3 w-3" /> },
  in_progress: { label: 'Em Andamento', cls: 'bg-blue-100 text-blue-800', icon: <Loader2 className="h-3 w-3" /> },
  done: { label: 'Finalizado', cls: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3" /> },
};

export default function TicketConversation({ ticketId, ticketQuestion, ticketStatus, ticketNumber, onBack }: TicketConversationProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('ticket_messages')
      .select('id, sender_type, message, created_at')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    setMessages((data || []) as TicketMessage[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel(`ticket_${ticketId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ticket_messages',
        filter: `ticket_id=eq.${ticketId}`,
      }, (payload: any) => {
        setMessages(prev => [...prev, payload.new as TicketMessage]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [ticketId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !user || sending) return;

    setSending(true);
    try {
      const { error } = await supabase.from('ticket_messages').insert({
        ticket_id: ticketId,
        sender_type: 'user',
        sender_id: user.id,
        message: text,
      } as any);
      if (error) throw error;

      // Reopen ticket if it was in_progress (done tickets are closed permanently)
      if (ticketStatus === 'in_progress') {
        await supabase.from('support_tickets').update({ status: 'received' } as any).eq('id', ticketId);
      }

      setInput('');
    } catch {
      toast.error('Erro ao enviar mensagem.');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (d: string) => new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const sc = statusConfig[ticketStatus];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 pb-3 border-b border-border shrink-0">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">Ticket #{ticketNumber}</span>
            {sc && (
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${sc.cls}`}>
                {sc.icon} {sc.label}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-3 space-y-3 min-h-0">
        {/* Original question */}
        <div className="flex justify-end">
          <div className="max-w-[85%] bg-violet-600 text-white rounded-2xl rounded-br-md px-3 py-2">
            <p className="text-xs whitespace-pre-wrap">{ticketQuestion}</p>
            <p className="text-[9px] text-white/60 mt-1">Pergunta original</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Aguardando resposta do suporte...</p>
        ) : (
          messages.map(m => (
            <div key={m.id} className={`flex ${m.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                m.sender_type === 'user'
                  ? 'bg-violet-600 text-white rounded-br-md'
                  : 'bg-muted text-foreground rounded-bl-md'
              }`}>
                <div className="flex items-center gap-1 mb-0.5">
                  {m.sender_type === 'admin' ? (
                    <ShieldCheck className="h-3 w-3 text-primary" />
                  ) : (
                    <User className="h-3 w-3 opacity-60" />
                  )}
                  <span className={`text-[9px] font-semibold ${m.sender_type === 'user' ? 'text-white/70' : 'text-muted-foreground'}`}>
                    {m.sender_type === 'admin' ? 'Suporte' : 'Você'}
                  </span>
                  <span className={`text-[9px] ${m.sender_type === 'user' ? 'text-white/50' : 'text-muted-foreground/60'}`}>
                    {formatTime(m.created_at)}
                  </span>
                </div>
                <p className="text-xs whitespace-pre-wrap">{m.message}</p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {ticketStatus !== 'done' ? (
        <div className="pt-2 border-t border-border shrink-0">
          <form onSubmit={e => { e.preventDefault(); sendMessage(); }} className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Digite sua resposta..."
              rows={1}
              className="flex-1 rounded-xl border border-input bg-muted/50 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary resize-none max-h-20 overflow-y-auto"
              style={{ minHeight: '36px' }}
            />
            <Button type="submit" size="icon" disabled={sending || !input.trim()} className="h-8 w-8 rounded-full shrink-0">
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </Button>
          </form>
        </div>
      ) : (
        <div className="pt-2 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">Este ticket foi finalizado.</p>
        </div>
      )}
    </div>
  );
}
