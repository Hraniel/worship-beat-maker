import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Send, Loader2, User, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TicketMessage {
  id: string;
  sender_type: 'user' | 'admin';
  message: string;
  created_at: string;
}

interface Props {
  ticketId: string;
  ticketEmail: string;
  ticketName: string;
}

export default function AdminTicketConversation({ ticketId, ticketEmail, ticketName }: Props) {
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
      .channel(`admin_ticket_${ticketId}`)
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

  const sendReply = async () => {
    const text = input.trim();
    if (!text || !user || sending) return;
    setSending(true);
    try {
      const { error } = await supabase.from('ticket_messages').insert({
        ticket_id: ticketId,
        sender_type: 'admin',
        sender_id: user.id,
        message: text,
      } as any);
      if (error) throw error;

      // Update ticket status to in_progress
      await supabase.from('support_tickets').update({ status: 'in_progress' } as any).eq('id', ticketId);

      // Send email notification to user (fire-and-forget)
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (token) {
          const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
          await fetch(`https://${projectId}.supabase.co/functions/v1/send-ticket-email`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({ ticketId, newStatus: 'admin_reply', adminMessage: text }),
          });
        }
      } catch { /* silent */ }

      setInput('');
      toast.success('Resposta enviada!');
    } catch {
      toast.error('Erro ao enviar resposta.');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (d: string) => new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-2 mt-2">
      <div className="bg-muted/30 rounded-lg p-2 max-h-48 overflow-y-auto space-y-2">
        {loading ? (
          <div className="flex justify-center py-2"><Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /></div>
        ) : messages.length === 0 ? (
          <p className="text-[10px] text-muted-foreground text-center py-2">Nenhuma mensagem ainda.</p>
        ) : (
          messages.map(m => (
            <div key={m.id} className={`flex ${m.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg px-2.5 py-1.5 ${
                m.sender_type === 'admin'
                  ? 'bg-primary/10 text-foreground'
                  : 'bg-card border border-border text-foreground'
              }`}>
                <div className="flex items-center gap-1 mb-0.5">
                  {m.sender_type === 'admin' ? <ShieldCheck className="h-2.5 w-2.5 text-primary" /> : <User className="h-2.5 w-2.5 text-muted-foreground" />}
                  <span className="text-[9px] font-semibold text-muted-foreground">
                    {m.sender_type === 'admin' ? 'Admin' : ticketName}
                  </span>
                  <span className="text-[9px] text-muted-foreground/60">{formatTime(m.created_at)}</span>
                </div>
                <p className="text-[11px] whitespace-pre-wrap">{m.message}</p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply input */}
      <form onSubmit={e => { e.preventDefault(); sendReply(); }} className="flex items-end gap-1.5">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
          placeholder="Responder ao usuário..."
          rows={1}
          className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary resize-none max-h-16 overflow-y-auto"
          style={{ minHeight: '32px' }}
        />
        <Button type="submit" size="icon" disabled={sending || !input.trim()} className="h-7 w-7 rounded-lg shrink-0">
          {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
        </Button>
      </form>
    </div>
  );
}
