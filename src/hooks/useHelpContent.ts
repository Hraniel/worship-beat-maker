import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface HelpStep {
  id: string;
  title: string;
  description: string;
  sort_order: number;
  image_url: string | null;
  video_url: string | null;
}

export interface HelpArticle {
  id: string;
  category_id: string;
  title: string;
  icon_name: string;
  purpose: string;
  sort_order: number;
  enabled: boolean;
  steps: HelpStep[];
}

export interface HelpCategory {
  id: string;
  label: string;
  description: string;
  icon_name: string;
  sort_order: number;
  enabled: boolean;
  articles: HelpArticle[];
}

export interface HelpFaq {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  enabled: boolean;
}

export function useHelpContent() {
  const [categories, setCategories] = useState<HelpCategory[]>([]);
  const [faqs, setFaqs] = useState<HelpFaq[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const [catRes, artRes, stepRes, faqRes] = await Promise.all([
        supabase.from('help_categories').select('*').eq('enabled', true).order('sort_order'),
        supabase.from('help_articles').select('*').eq('enabled', true).order('sort_order'),
        supabase.from('help_steps').select('*').order('sort_order'),
        supabase.from('help_faqs').select('*').eq('enabled', true).order('sort_order'),
      ]);

      const rawCats = (catRes.data as any[]) || [];
      const rawArts = (artRes.data as any[]) || [];
      const rawSteps = (stepRes.data as any[]) || [];

      // Group steps by article
      const stepsByArticle: Record<string, HelpStep[]> = {};
      rawSteps.forEach(s => {
        if (!stepsByArticle[s.article_id]) stepsByArticle[s.article_id] = [];
        stepsByArticle[s.article_id].push(s);
      });

      // Attach steps to articles
      const articlesWithSteps: HelpArticle[] = rawArts.map(a => ({
        ...a,
        steps: (stepsByArticle[a.id] || []).sort((x: HelpStep, y: HelpStep) => x.sort_order - y.sort_order),
      }));

      // Group articles by category
      const artsByCat: Record<string, HelpArticle[]> = {};
      articlesWithSteps.forEach(a => {
        if (!artsByCat[a.category_id]) artsByCat[a.category_id] = [];
        artsByCat[a.category_id].push(a);
      });

      const fullCats: HelpCategory[] = rawCats.map(c => ({
        ...c,
        articles: (artsByCat[c.id] || []).sort((x: HelpArticle, y: HelpArticle) => x.sort_order - y.sort_order),
      }));

      setCategories(fullCats);
      setFaqs((faqRes.data as any[]) || []);
      setLoading(false);
    }
    fetch();
  }, []);

  return { categories, faqs, loading };
}
