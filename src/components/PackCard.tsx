import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Download, Check, Loader2, Music,
  Drum, Waves, Sparkles, Headphones, Volume2, Layers, AudioWaveform, Lock
} from 'lucide-react';
import { StorePackData } from '@/hooks/useStorePacks';

const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

async function invokeWithToken(fnName: string, body: object, t: (key: string) => string) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) throw new Error(t('packCard.sessionExpired'));
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
  if (!res.ok) throw new Error(json?.error || json?.message || t('packCard.functionError'));
  return json;
}

const LUCIDE_ICON_MAP: Record<string, React.ReactNode> = {
  drum: <Drum className="h-8 w-8" />,
  waves: <Waves className="h-8 w-8" />,
  music: <Music className="h-8 w-8" />,
  sparkles: <Sparkles className="h-8 w-8" />,
  'audio-waveform': <AudioWaveform className="h-8 w-8" />,
  'volume-2': <Volume2 className="h-8 w-8" />,
  headphones: <Headphones className="h-8 w-8" />,
  layers: <Layers className="h-8 w-8" />,
};

interface PackCardProps {
  pack: StorePackData;
  onPurchased: () => void;
}

const PackCard: React.FC<PackCardProps> = ({ pack, onPurchased }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [purchasing, setPurchasing] = useState(false);

  const handlePurchase = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setPurchasing(true);
    try {
      if (pack.price_cents === 0) {
        await invokeWithToken('purchase-pack', { packId: pack.id }, t);
        toast.success(t('packCard.purchaseSuccess', { name: pack.name }));
        onPurchased();
      } else {
        navigate(`/store/${pack.id}`);
      }
    } catch (err: any) {
      toast.error(err?.message || t('packCard.purchaseError'));
    } finally {
      setPurchasing(false);
    }
  };

  const handleCardClick = () => {
    if (pack.id.length === 36) {
      navigate(`/store/${pack.id}`);
    }
  };

  // Resolve banner for background
  const hasBanner = !!pack.banner_url;
  const bannerUrl = hasBanner
    ? (pack.banner_url!.startsWith('http')
        ? pack.banner_url!
        : `https://${projectId}.supabase.co/storage/v1/object/public/sound-previews/${pack.banner_url}`)
    : null;

  // Resolve icon image
  const isImageIcon = pack.icon_name?.startsWith('pack-icons/') || pack.icon_name?.startsWith('http');
  const imageIconUrl = isImageIcon
    ? (pack.icon_name.startsWith('http')
        ? pack.icon_name
        : `https://${projectId}.supabase.co/storage/v1/object/public/sound-previews/${pack.icon_name}`)
    : null;
  const lucideIcon = LUCIDE_ICON_MAP[pack.icon_name] || <Music className="h-8 w-8" />;

  // Card display title/subtitle (from admin customization or defaults)
  const cardTitle = pack.card_title || pack.name;
  const cardSubtitle = pack.card_subtitle || null;

  return (
    <div
      className="group relative aspect-square rounded-2xl border border-gray-200/80 hover:border-gray-300 hover:shadow-lg transition-all duration-200 overflow-hidden cursor-pointer"
      onClick={handleCardClick}
    >
      {/* Background: banner image or gradient color */}
      {bannerUrl ? (
        <img
          src={bannerUrl}
          alt={pack.name}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      ) : imageIconUrl ? (
        <img
          src={imageIconUrl}
          alt={pack.name}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      ) : (
        <div className={`absolute inset-0 ${pack.color} flex items-center justify-center`}>
          <div className="text-white/40">{lucideIcon}</div>
        </div>
      )}

      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

      {/* Tag badge */}
      {pack.tag && (
        <div className="absolute top-2.5 left-2.5 z-10">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 text-violet-700 backdrop-blur-sm">
            {pack.tag}
          </span>
        </div>
      )}

      {/* Status badge */}
      <div className="absolute top-2.5 right-2.5 z-10">
        {pack.purchased ? (
          <div className="flex items-center gap-1 bg-emerald-500/90 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
            <Check className="h-3 w-3" />
            <span className="text-[10px] font-medium">{t('packCard.purchased')}</span>
          </div>
        ) : !pack.is_available ? (
          <div className="flex items-center gap-1 bg-black/50 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
            <Lock className="h-3 w-3" />
            <span className="text-[10px] font-medium">{t('packCard.comingSoon')}</span>
          </div>
        ) : null}
      </div>

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
        <h3 className="font-bold text-sm text-white leading-snug truncate">{cardTitle}</h3>
        {cardSubtitle && (
          <p className="text-[11px] text-white/70 mt-0.5 truncate">{cardSubtitle}</p>
        )}

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1.5">
            <Music className="h-3 w-3 text-white/60" />
            <span className="text-[11px] text-white/60 font-medium">{pack.sounds.length} {t('packCard.sounds')}</span>
          </div>
          {!pack.purchased && pack.is_available && (
            <span className="text-[11px] font-bold text-white">
              {pack.price_cents === 0 ? t('packCard.free') : `R$ ${(pack.price_cents / 100).toFixed(2)}`}
            </span>
          )}
        </div>

        {/* Action button */}
        {pack.is_available && !pack.purchased && !pack.removedFromLibrary ? (
          <Button
            size="sm"
            onClick={handlePurchase}
            disabled={purchasing}
            className="w-full h-8 text-xs rounded-lg bg-white/95 hover:bg-white text-gray-900 font-semibold mt-2 backdrop-blur-sm"
          >
            {purchasing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <Download className="h-3 w-3 mr-1" />
                {pack.price_cents === 0 ? t('packCard.getFree') : t('packCard.buy')}
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
                await invokeWithToken('toggle-pack-library', { packId: pack.id, removed: false }, t);
                onPurchased();
              } catch (err: any) {
                toast.error(err?.message || t('packCard.restoreError'));
              } finally {
                setPurchasing(false);
              }
            }}
            disabled={purchasing}
            className="w-full h-8 text-xs rounded-lg bg-emerald-500/90 hover:bg-emerald-500 text-white font-semibold mt-2 backdrop-blur-sm"
          >
            {purchasing ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Download className="h-3 w-3 mr-1" />{t('packCard.includeFree')}</>}
          </Button>
        ) : null}
      </div>
    </div>
  );
};

export default PackCard;
