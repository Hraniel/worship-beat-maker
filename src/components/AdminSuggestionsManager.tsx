import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Check, X, Clock, Lightbulb, Heart, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Suggestion {
  id: string;
  title: string;
  description: string;
  likes_count: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  user_id: string;
}

const statusLabels: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pendente', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  approved: { label: 'Aprovada', cls: 'bg-green-100 text-green-700 border-green-200' },
  rejected: { label: 'Rejeitada', cls: 'bg-red-100 text-red-700 border-red-200' },
};

const AdminSuggestionsManager = () => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [acting, setActing] = useState<string | null>(null);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('community_suggestions')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setSuggestions((data || []) as Suggestion[]);
    } catch {
      toast.error('Erro ao carregar sugestões.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSuggestions(); }, [filter]);

  const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
    setActing(id);
    try {
      const { error } = await supabase
        .from('community_suggestions')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
      toast.success(status === 'approved' ? 'Sugestão aprovada!' : 'Sugestão rejeitada.');
      setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    } catch {
      toast.error('Erro ao atualizar status.');
    } finally {
      setActing(null);
    }
  };

  const deleteSuggestion = async (id: string) => {
    if (!confirm('Excluir esta sugestão permanentemente?')) return;
    setActing(id);
    try {
      const { error } = await supabase.from('community_suggestions').delete().eq('id', id);
      if (error) throw error;
      setSuggestions(prev => prev.filter(s => s.id !== id));
      toast.success('Sugestão excluída.');
    } catch {
      toast.error('Erro ao excluir.');
    } finally {
      setActing(null);
    }
  };

  const pending = suggestions.filter(s => s.status === 'pending').length;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="h-4 w-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-white">Sugestões da Comunidade</h3>
        {pending > 0 && (
          <span className="bg-amber-500/20 text-amber-400 text-xs font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
            {pending} pendentes
          </span>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
              filter === f
                ? 'bg-white/15 border-white/30 text-white'
                : 'border-white/10 text-white/50 hover:text-white/80 hover:border-white/20'
            }`}
          >
            {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendentes' : f === 'approved' ? 'Aprovadas' : 'Rejeitadas'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-white/40 text-sm py-4">Carregando…</div>
      ) : suggestions.length === 0 ? (
        <div className="text-white/30 text-sm py-4 text-center">
          Nenhuma sugestão{filter !== 'all' ? ` ${filter === 'pending' ? 'pendente' : filter === 'approved' ? 'aprovada' : 'rejeitada'}` : ''}.
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map(s => {
            const statusStyle = statusLabels[s.status];
            return (
              <div key={s.id}
                className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="text-sm font-semibold text-white truncate">{s.title}</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusStyle.cls}`}>
                        {statusStyle.label}
                      </span>
                    </div>
                    <p className="text-xs text-white/50 leading-relaxed">{s.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-white/30">
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {s.likes_count} curtidas
                      </span>
                      <span>
                        {new Date(s.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteSuggestion(s.id)}
                    disabled={acting === s.id}
                    className="shrink-0 text-white/25 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {s.status === 'pending' && (
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      disabled={acting === s.id}
                      onClick={() => updateStatus(s.id, 'approved')}
                      className="h-7 px-3 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg gap-1"
                    >
                      <Check className="h-3 w-3" /> Aprovar
                    </Button>
                    <Button
                      size="sm"
                      disabled={acting === s.id}
                      onClick={() => updateStatus(s.id, 'rejected')}
                      variant="outline"
                      className="h-7 px-3 text-xs border-red-500/40 text-red-400 hover:bg-red-500/10 rounded-lg gap-1"
                    >
                      <X className="h-3 w-3" /> Rejeitar
                    </Button>
                  </div>
                )}
                {s.status === 'approved' && (
                  <Button
                    size="sm"
                    disabled={acting === s.id}
                    onClick={() => updateStatus(s.id, 'rejected')}
                    variant="outline"
                    className="mt-2 h-7 px-3 text-xs border-white/15 text-white/40 hover:bg-white/8 rounded-lg gap-1"
                  >
                    <X className="h-3 w-3" /> Remover da comunidade
                  </Button>
                )}
                {s.status === 'rejected' && (
                  <Button
                    size="sm"
                    disabled={acting === s.id}
                    onClick={() => updateStatus(s.id, 'approved')}
                    className="mt-2 h-7 px-3 text-xs bg-green-600/80 hover:bg-green-600 text-white rounded-lg gap-1"
                  >
                    <Check className="h-3 w-3" /> Aprovar mesmo assim
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminSuggestionsManager;
