import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStoreConfig } from '@/hooks/useStoreConfig';
import { toast } from 'sonner';
import { Heart, Lightbulb, Plus, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface Suggestion {
  id: string;
  title: string;
  description: string;
  likes_count: number;
  created_at: string;
  user_liked?: boolean;
}

const CommunitySuggestions = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { get: sc, getJSON } = useStoreConfig();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [liking, setLiking] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', description: '' });

  const textColors = getJSON<Record<string, string>>('text_colors', {});

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('community_suggestions')
        .select('id, title, description, likes_count, created_at')
        .eq('status', 'approved')
        .order('likes_count', { ascending: false });

      if (error) throw error;

      let userLikedIds: Set<string> = new Set();
      if (user && data && data.length > 0) {
        const { data: likes } = await supabase
          .from('suggestion_likes')
          .select('suggestion_id')
          .eq('user_id', user.id)
          .in('suggestion_id', data.map(s => s.id));
        if (likes) userLikedIds = new Set(likes.map(l => l.suggestion_id));
      }

      setSuggestions((data || []).map(s => ({ ...s, user_liked: userLikedIds.has(s.id) })));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchSuggestions(); }, [fetchSuggestions]);

  const handleLike = async (suggestion: Suggestion) => {
    if (!user) { toast.info(t('dashboard.loginToLike')); return; }
    if (liking) return;
    setLiking(suggestion.id);

    try {
      if (suggestion.user_liked) {
        await supabase.from('suggestion_likes').delete().eq('suggestion_id', suggestion.id).eq('user_id', user.id);
        setSuggestions(prev => prev.map(s =>
          s.id === suggestion.id ? { ...s, likes_count: Math.max(0, s.likes_count - 1), user_liked: false } : s
        ));
      } else {
        await supabase.from('suggestion_likes').insert({ suggestion_id: suggestion.id, user_id: user.id });
        setSuggestions(prev => prev.map(s =>
          s.id === suggestion.id ? { ...s, likes_count: s.likes_count + 1, user_liked: true } : s
        ));
      }
    } catch {
      toast.error(t('dashboard.likeError'));
    } finally {
      setLiking(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.info(t('dashboard.loginToLike')); return; }
    if (!form.title.trim() || !form.description.trim()) {
      toast.error(t('dashboard.fillTitleDesc'));
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('community_suggestions')
        .insert({ user_id: user.id, title: form.title.trim(), description: form.description.trim(), status: 'pending' });

      if (error) throw error;

      toast.success(t('dashboard.suggestionSent'));
      setForm({ title: '', description: '' });
      setShowForm(false);
    } catch {
      toast.error(t('dashboard.suggestionError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-10 sm:mt-14">
      {/* Section header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-bold" style={{ color: textColors.community_title_color || '#111827' }}>
              {sc('community_title')}
            </h2>
          </div>
          <p className="text-sm max-w-md" style={{ color: textColors.community_subtitle_color || '#6b7280' }}>
            {sc('community_subtitle')}
          </p>
        </div>
        {user && (
          <Button
            size="sm"
            onClick={() => setShowForm(v => !v)}
            className="shrink-0 rounded-xl gap-1.5 text-xs text-white"
            style={{ backgroundColor: textColors.community_button_color || '#111827' }}
          >
            <Plus className="h-3.5 w-3.5" />
            {sc('community_button_label')}
          </Button>
        )}
        {!user && (
          <p className="text-xs text-gray-400 shrink-0 text-right">
            <a href="/auth" className="underline hover:text-gray-600">{t('dashboard.loginToSuggest')}</a>
          </p>
        )}
      </div>

      {/* Suggestion form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden"
          >
            <form onSubmit={handleSubmit}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 text-sm">{t('dashboard.newSuggestion')}</h3>
                <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3">
                <input type="text" placeholder={t('dashboard.suggestionTitle')}
                  value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} maxLength={80}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300" />
                <textarea placeholder={t('dashboard.suggestionDescription')}
                  value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} maxLength={400} rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none" />
              </div>
              <div className="flex justify-end mt-3">
                <Button type="submit" disabled={submitting} size="sm"
                  className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl gap-1.5 text-xs">
                  {submitting ? t('dashboard.sending') : (<><Send className="h-3.5 w-3.5" />{t('dashboard.sendSuggestion')}</>)}
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Suggestions grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-gray-100 bg-gray-50 p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2 w-3/4" />
              <div className="h-3 bg-gray-100 rounded mb-1 w-full" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : suggestions.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Lightbulb className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{sc('community_empty_text')}</p>
        </div>
      ) : (
        <motion.div
          initial="hidden" animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {suggestions.map((s, i) => (
            <motion.div key={s.id}
              variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.4 } } }}
              className="group relative rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-300"
            >
              <button onClick={() => handleLike(s)} disabled={liking === s.id}
                className={`absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${
                  s.user_liked ? 'bg-rose-50 border-rose-200 text-rose-500' : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-rose-200 hover:text-rose-400 hover:bg-rose-50'
                }`}>
                <Heart className={`h-3.5 w-3.5 ${s.user_liked ? 'fill-rose-500 text-rose-500' : ''}`} />
                {s.likes_count}
              </button>
              <div className="pr-16">
                <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-2">{s.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{s.description}</p>
              </div>
              {s.likes_count > 0 && (
                <div className="mt-4 h-0.5 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, s.likes_count * 10)}%` }}
                    transition={{ delay: 0.3 + i * 0.05, duration: 0.6 }}
                    className="h-full bg-rose-400 rounded-full" />
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      )}

      {!user && suggestions.length > 0 && (
        <p className="text-center text-xs text-gray-400 mt-6">
          <a href="/auth" className="underline hover:text-gray-600">{t('dashboard.loginToLikeSuggestions')}</a>
        </p>
      )}
    </div>
  );
};

export default CommunitySuggestions;
