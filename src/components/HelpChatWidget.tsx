import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

type Msg = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/help-chat`;

const WELCOME: Msg = {
  role: 'assistant',
  content: 'Olá! 👋 Sou o assistente do **Glory Pads**. Posso te ajudar com dúvidas sobre o app, como usar os pads, repertório, MIDI, loja, planos e muito mais.\n\nSe eu não conseguir resolver sua dúvida, posso te encaminhar para nosso **suporte humanizado** criando um ticket! Como posso te ajudar?',
};

export default function HelpChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Msg = { role: 'user', content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setLoading(true);

    try {
      // Get auth token if available
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: history.filter((m) => m !== WELCOME).map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Erro desconhecido' }));
        toast({ title: 'Erro', description: err.error || 'Não foi possível enviar a mensagem.', variant: 'destructive' });
        setLoading(false);
        return;
      }

      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content || 'Desculpe, não consegui gerar uma resposta.';
      setMessages(prev => [...prev, { role: 'assistant', content }]);
    } catch (e) {
      console.error('Chat error:', e);
      toast({ title: 'Erro de conexão', description: 'Verifique sua internet e tente novamente.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full bg-violet-600 text-white shadow-lg hover:bg-violet-700 active:scale-95 transition-all flex items-center justify-center"
        style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-label="Abrir chat de ajuda"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-white sm:inset-auto sm:bottom-20 sm:right-4 sm:w-[400px] sm:h-[560px] sm:rounded-2xl sm:shadow-2xl sm:border border-border overflow-hidden"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-violet-600 text-white shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          <span className="font-semibold text-sm">Assistente Glory Pads</span>
        </div>
        <div className="flex items-center gap-1">
          <Link to="/my-tickets" onClick={() => setOpen(false)} className="hover:bg-white/20 rounded-full p-1.5 transition-colors" title="Meus Tickets">
            <Ticket className="h-4 w-4" />
          </Link>
          <button onClick={() => setOpen(false)} className="hover:bg-white/20 rounded-full p-1 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-3">
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-violet-600 text-white rounded-br-md'
                    : 'bg-violet-100 text-violet-900 rounded-bl-md'
                }`}
              >
                {m.role === 'assistant' ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>ul]:my-1 [&>ol]:my-1">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  m.content
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="px-3 py-2 border-t border-violet-200 shrink-0 bg-white" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          className="flex items-end gap-2"
        >
          <textarea
            ref={inputRef as any}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Digite sua dúvida..."
            disabled={loading}
            rows={1}
            className="flex-1 rounded-2xl border border-input bg-muted/50 px-4 py-2 text-sm text-black placeholder:text-violet-400 outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50 resize-none max-h-24 overflow-y-auto"
            style={{ minHeight: '38px' }}
          />
          <Button
            type="submit"
            size="icon"
            disabled={loading || !input.trim()}
            className="h-9 w-9 rounded-full bg-violet-600 hover:bg-violet-700 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
