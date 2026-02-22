import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Play, Square, Download, Check, Loader2, Music,
  Drum, Waves, Sparkles, Headphones, Volume2, Layers, AudioWaveform, Lock, ChevronRight
} from 'lucide-react';
import { StorePackData } from '@/hooks/useStorePacks';

const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

async function invokeWithToken(fnName: string, body: object) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) throw new Error('Sessão expirada. Faça login novamente.');
  const res = await fetch(
    `https://${projectId}.supabase.co/functions/v1/${fnName}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify(body),
    }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || json?.message || 'Erro na função');
  return json;
}

const LUCIDE_ICON_MAP: Record<string, React.ReactNode> = {
  drum: <Drum className="h-5 w-5" />,
  waves: <Waves className="h-5 w-5" />,
  music: <Music className="h-5 w-5" />,
  sparkles: <Sparkles className="h-5 w-5" />,
  'audio-waveform': <AudioWaveform className="h-5 w-5" />,
  'volume-2': <Volume2 className="h-5 w-5" />,
  headphones: <Headphones className="h-5 w-5" />,
  layers: <Layers className="h-5 w-5" />,
};

interface PackCardProps {
  pack: StorePackData;
  onPurchased: () => void;
}

const PackCard: React.FC<PackCardProps> = ({ pack, onPurchased }) => {
  const navigate = useNavigate();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);


  const handlePreview = useCallback(async (e: React.MouseEvent, sound: { id: string; preview_path: string | null }) => {
    e.stopPropagation();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (playingId === sound.id) { setPlayingId(null); return; }
    if (!sound.preview_path) return;

    try {
      const { data } = supabase.storage.from('sound-previews').getPublicUrl(sound.preview_path);
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

  const handlePurchase = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setPurchasing(true);
    try {
      if (pack.price_cents === 0) {
        // Pack gratuito: entrega imediata com token explícito
        await invokeWithToken('purchase-pack', { packId: pack.id });
        toast.success(`Pack "${pack.name}" adquirido com sucesso!`);
        onPurchased();
      } else {
        // Pack pago: redirecionar para a página de detalhes onde o Stripe Checkout é feito
        navigate(`/store/${pack.id}`);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao adquirir pack');
    } finally {
      setPurchasing(false);
    }
  };

  const handleCardClick = () => {
    // Only navigate if it's a real DB pack (UUID length)
    if (pack.id.length === 36) {
      navigate(`/store/${pack.id}`);
    }
  };

  // Resolve icon
  const isImageIcon = pack.icon_name?.startsWith('pack-icons/') || pack.icon_name?.startsWith('http');
  const imageIconUrl = isImageIcon
    ? (pack.icon_name.startsWith('http')
        ? pack.icon_name
        : `https://${projectId}.supabase.co/storage/v1/object/public/sound-previews/${pack.icon_name}`)
    : null;
  const lucideIcon = LUCIDE_ICON_MAP[pack.icon_name] || <Music className="h-5 w-5" />;

  // Resolve banner
  const hasBanner = !!pack.banner_url;
  const bannerUrl = hasBanner
    ? (pack.banner_url!.startsWith('http')
        ? pack.banner_url!
        : `https://${projectId}.supabase.co/storage/v1/object/public/sound-previews/${pack.banner_url}`)
    : null;

  return (
    <div
      className="group relative bg-white rounded-2xl border border-gray-200/80 hover:shadow-lg hover:border-gray-300 transition-all duration-200 overflow-hidden cursor-pointer flex flex-col"
      onClick={handleCardClick}
    >
      {/* Banner or color header — square aspect */}
      {hasBanner ? (
        <div className="w-full aspect-[16/9] overflow-hidden">
          <img src={bannerUrl!} alt={pack.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
      ) : (
        <div className={`w-full aspect-[16/9] ${pack.color} flex items-center justify-center`}>
          <div className="text-white opacity-60">{lucideIcon}</div>
        </div>
      )}

      {/* Card body */}
      <div className="p-4 flex flex-col flex-1">
        {pack.tag && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 mb-2 inline-block">
            {pack.tag}
          </span>
        )}

        <h3 className="font-semibold text-sm text-gray-900 mb-1 leading-snug">{pack.name}</h3>
        <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-2">{pack.description}</p>

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

        {/* Action button */}
        <div className="mt-auto">
        {pack.is_available && !pack.purchased && !pack.removedFromLibrary ? (
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
        ) : pack.removedFromLibrary ? (
          <Button
            size="sm"
            onClick={async (e) => {
              e.stopPropagation();
              setPurchasing(true);
              try {
                await invokeWithToken('toggle-pack-library', { packId: pack.id, removed: false });
                onPurchased();
              } catch (err: any) {
                toast.error(err?.message || 'Erro ao restaurar pack');
              } finally {
                setPurchasing(false);
              }
            }}
            disabled={purchasing}
            className="w-full h-8 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {purchasing ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Download className="h-3 w-3 mr-1" />Incluir Grátis</>}
          </Button>
        ) : pack.purchased ? (
          <div className="text-center text-[11px] text-emerald-600 font-medium py-1 flex items-center justify-center gap-1">
            ✓ Disponível nos seus pads
          </div>
        ) : pack.id.length === 36 ? (
          <button
            onClick={handleCardClick}
            className="w-full flex items-center justify-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 py-1 transition-colors"
          >
            Ver detalhes <ChevronRight className="h-3 w-3" />
          </button>
        ) : null}
        </div>
      </div>
    </div>
  );
};

export default PackCard;
