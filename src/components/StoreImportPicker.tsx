import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Music, Download, Loader2, Package } from 'lucide-react';
import { toast } from 'sonner';

interface PackSound {
  id: string;
  name: string;
  short_name: string;
  pack_name: string;
  pack_id: string;
}

interface StoreImportPickerProps {
  onSelect: (soundId: string, soundName: string, arrayBuffer: ArrayBuffer) => void;
  onClose: () => void;
}

const StoreImportPicker: React.FC<StoreImportPickerProps> = ({ onSelect, onClose }) => {
  const { user } = useAuth();
  const [sounds, setSounds] = useState<PackSound[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        // Get purchased pack IDs (excluding removed packs)
        const { data: purchases } = await supabase
          .from('user_purchases')
          .select('pack_id')
          .eq('user_id', user.id)
          .eq('removed', false);

        if (!purchases || purchases.length === 0) {
          setSounds([]);
          setLoading(false);
          return;
        }

        const packIds = purchases.map(p => p.pack_id);

        // Get pack names
        const { data: packs } = await supabase
          .from('store_packs')
          .select('id, name')
          .in('id', packIds);

        const packMap = new Map(packs?.map(p => [p.id, p.name]) || []);

        // Get all sounds from purchased packs
        const { data: soundsData } = await supabase
          .from('pack_sounds')
          .select('id, name, short_name, pack_id')
          .in('pack_id', packIds)
          .order('sort_order');

        const result: PackSound[] = (soundsData || []).map(s => ({
          id: s.id,
          name: s.name,
          short_name: s.short_name,
          pack_id: s.pack_id,
          pack_name: packMap.get(s.pack_id) || '',
        }));

        setSounds(result);
      } catch (e) {
        console.error('Error loading store sounds:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleSelect = async (sound: PackSound) => {
    setDownloading(sound.id);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/download-sound`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ soundId: sound.id }),
        }
      );

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData?.error || 'Failed to download sound');
      }

      const contentType = resp.headers.get('Content-Type') || '';
      if (contentType.includes('application/json')) {
        throw new Error('Unexpected response');
      }

      const arrayBuffer = await resp.arrayBuffer();
      const name = decodeURIComponent(resp.headers.get('X-Sound-Name') || sound.name);

      onSelect(sound.id, name, arrayBuffer);
    } catch (e) {
      console.error('Error downloading sound:', e);
      toast.error('Erro ao baixar som da loja');
    } finally {
      setDownloading(null);
    }
  };

  // Group sounds by pack
  const grouped = sounds.reduce<Record<string, PackSound[]>>((acc, s) => {
    if (!acc[s.pack_name]) acc[s.pack_name] = [];
    acc[s.pack_name].push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-2">
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : sounds.length === 0 ? (
        <div className="text-center py-3 space-y-1">
          <Package className="h-5 w-5 text-muted-foreground mx-auto" />
          <p className="text-xs text-muted-foreground">Nenhum pack adquirido</p>
          <p className="text-[10px] text-muted-foreground/70">Visite a Glory Store no Dashboard</p>
        </div>
      ) : (
        <div className="max-h-[240px] overflow-y-auto space-y-3">
          {Object.entries(grouped).map(([packName, packSounds]) => (
            <div key={packName}>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1">{packName}</p>
              <div className="space-y-0.5">
                {packSounds.map(s => (
                  <button
                    key={s.id}
                    disabled={!!downloading}
                    className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-foreground hover:bg-muted rounded-md transition-colors disabled:opacity-50"
                    onClick={() => handleSelect(s)}
                  >
                    <Music className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="truncate flex-1 text-left">{s.name}</span>
                    {downloading === s.id ? (
                      <Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" />
                    ) : (
                      <Download className="h-3 w-3 text-muted-foreground shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StoreImportPicker;
