import React, { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Play, Square, Download, Check, Loader2, Music,
  Drum, Waves, Sparkles, Headphones, Volume2, Layers, AudioWaveform, Lock
} from 'lucide-react';

const ICON_MAP: Record<string, React.ReactNode> = {
  drum: <Drum className="h-5 w-5" />,
  waves: <Waves className="h-5 w-5" />,
  music: <Music className="h-5 w-5" />,
  sparkles: <Sparkles className="h-5 w-5" />,
  'audio-waveform': <AudioWaveform className="h-5 w-5" />,
  'volume-2': <Volume2 className="h-5 w-5" />,
  headphones: <Headphones className="h-5 w-5" />,
  layers: <Layers className="h-5 w-5" />,
};

interface PackSound {
  id: string;
  name: string;
  short_name: string;
  preview_path: string | null;
  duration_ms: number;
}

interface StorePackData {
  id: string;
  name: string;
  description: string;
  category: string;
  icon_name: string;
  color: string;
  tag: string | null;
  is_available: boolean;
  price_cents: number;
  sounds: PackSound[];
  purchased: boolean;
}

interface PackCardProps {
  pack: StorePackData;
  onPurchased: () => void;
}

const PackCard: React.FC<PackCardProps> = ({ pack, onPurchased }) => {
  const [expanded, setExpanded] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePreview = useCallback(async (sound: PackSound) => {
    // Stop current
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (playingId === sound.id) {
      setPlayingId(null);
      return;
    }

    if (!sound.preview_path) return;

    try {
      const { data } = supabase.storage
        .from('sound-previews')
        .getPublicUrl(sound.preview_path);

      const audio = new Audio(data.publicUrl);
      audio.onended = () => setPlayingId(null);
      audioRef.current = audio;
      setPlayingId(sound.id);
      await audio.play();
    } catch {
      toast.error('Erro ao reproduzir preview');
      setPlayingId(null);
    }
  }, [playingId]);

  const handlePurchase = async () => {
    setPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke('purchase-pack', {
        body: { packId: pack.id },
      });
      if (error) throw error;
      toast.success(`Pack "${pack.name}" adquirido com sucesso!`);
      onPurchased();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao adquirir pack');
    } finally {
      setPurchasing(false);
    }
  };

  const icon = ICON_MAP[pack.icon_name] || <Music className="h-5 w-5" />;

  return (
    <div className="group relative bg-white rounded-2xl border border-gray-200/80 p-4 hover:shadow-lg hover:border-gray-300 transition-all duration-200">
      {pack.tag && (
        <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
          {pack.tag}
        </span>
      )}
      <div className={`h-11 w-11 rounded-xl ${pack.color} flex items-center justify-center mb-3 text-white shadow-sm`}>
        {icon}
      </div>
      <h3 className="font-semibold text-sm text-gray-900 mb-1">{pack.name}</h3>
      <p className="text-xs text-gray-500 leading-relaxed mb-3">{pack.description}</p>

      {/* Sound count + status */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Music className="h-3 w-3 text-gray-400" />
          <span className="text-[11px] text-gray-400 font-medium">{pack.sounds.length} sons</span>
        </div>
        {pack.purchased ? (
          <div className="flex items-center gap-1 text-emerald-600">
            <Check className="h-3 w-3" />
            <span className="text-[11px] font-medium">Adquirido</span>
          </div>
        ) : pack.is_available ? (
          <span className="text-[11px] font-medium text-violet-600">
            {pack.price_cents === 0 ? 'Grátis' : `R$ ${(pack.price_cents / 100).toFixed(2)}`}
          </span>
        ) : (
          <div className="flex items-center gap-1 text-gray-400">
            <Lock className="h-3 w-3" />
            <span className="text-[11px] font-medium">Em breve</span>
          </div>
        )}
      </div>

      {/* Expand sounds */}
      {pack.is_available && pack.sounds.length > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[11px] text-violet-600 font-medium hover:underline mb-2"
        >
          {expanded ? 'Ocultar sons' : 'Ver sons'}
        </button>
      )}

      {expanded && (
        <div className="space-y-1 mb-3 max-h-48 overflow-y-auto">
          {pack.sounds.map(sound => (
            <div
              key={sound.id}
              className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-xs text-gray-700 truncate flex-1">{sound.name}</span>
              {sound.preview_path && (
                <button
                  onClick={() => handlePreview(sound)}
                  className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                >
                  {playingId === sound.id ? (
                    <Square className="h-3 w-3 text-violet-600" />
                  ) : (
                    <Play className="h-3 w-3 text-gray-500" />
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Action button */}
      {pack.is_available && !pack.purchased && (
        <Button
          size="sm"
          onClick={handlePurchase}
          disabled={purchasing}
          className="w-full h-8 text-xs rounded-lg bg-gray-900 hover:bg-gray-800 text-white"
        >
          {purchasing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              <Download className="h-3 w-3 mr-1" />
              {pack.price_cents === 0 ? 'Obter Grátis' : 'Comprar'}
            </>
          )}
        </Button>
      )}

      {pack.purchased && (
        <div className="text-center text-[11px] text-emerald-600 font-medium py-1">
          ✓ Disponível nos seus pads
        </div>
      )}
    </div>
  );
};

export default PackCard;
