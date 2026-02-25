import React, { useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useBodyScroll } from '@/hooks/useBodyScroll';
import { supabase } from '@/integrations/supabase/client';
import { useStorePacks } from '@/hooks/useStorePacks';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

/** Chama uma Edge Function explicitando o token — evita falhas de auth no mobile/PWA */
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
import {
  ArrowLeft, Play, Square, Download, Check, Loader2,
  Music, Drum, Waves, Sparkles, Headphones, Volume2, Layers, AudioWaveform, Lock, Clock, Trash2
} from 'lucide-react';
import logoDark from '@/assets/logo-dark.png';

const LUCIDE_ICON_MAP: Record<string, React.ReactNode> = {
  drum: <Drum className="h-6 w-6" />,
  waves: <Waves className="h-6 w-6" />,
  music: <Music className="h-6 w-6" />,
  sparkles: <Sparkles className="h-6 w-6" />,
  'audio-waveform': <AudioWaveform className="h-6 w-6" />,
  'volume-2': <Volume2 className="h-6 w-6" />,
  headphones: <Headphones className="h-6 w-6" />,
  layers: <Layers className="h-6 w-6" />,
};

const PackDetail: React.FC = () => {
  const { packId } = useParams<{ packId: string }>();
  const navigate = useNavigate();
  useBodyScroll();
  const { packs, loading, refetch } = useStorePacks();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const pack = packs.find(p => p.id === packId);

  const handlePreview = useCallback(async (sound: { id: string; preview_path: string | null }) => {
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
      audio.onerror = () => { setPlayingId(null); toast.error('Erro ao reproduzir'); };
      audioRef.current = audio;
      setPlayingId(sound.id);
      await audio.play();
    } catch {
      toast.error('Erro ao reproduzir preview');
      setPlayingId(null);
    }
  }, [playingId]);

  // Handle return from Stripe for paid packs
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('payment_success');
    const sessionId = params.get('session_id');
    if (success === '1' && sessionId && pack) {
      invokeWithToken('verify-pack-payment', { sessionId })
        .then((data) => {
          if (!data?.success) {
            toast.error('Erro ao confirmar pagamento. Contate o suporte.');
          } else {
            toast.success(`Pack "${pack.name}" adquirido com sucesso!`);
            window.history.replaceState({}, '', `/store/${pack.id}`);
          }
        })
        .catch(() => toast.error('Erro ao confirmar pagamento. Contate o suporte.'));
    }
  }, [pack]);

  const handlePurchase = async () => {
    if (!pack) return;
    // Ensure user is logged in
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      toast.error('Você precisa estar logado para comprar. Faça login primeiro.');
      navigate('/auth');
      return;
    }
    setPurchasing(true);
    try {
      if (pack.price_cents === 0) {
        // Free pack — immediate delivery
        await invokeWithToken('purchase-pack', { packId: pack.id });
        toast.success(`Pack "${pack.name}" adquirido com sucesso!`);
      } else {
        // Paid pack — Stripe Checkout
        const data = await invokeWithToken('create-pack-checkout', { packId: pack.id });
        if (data?.url) window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao adquirir pack');
    } finally {
      setPurchasing(false);
    }
  };

  const [toggling, setToggling] = useState(false);

  const handleToggleRemove = async () => {
    if (!pack) return;
    setToggling(true);
    try {
      const isRemoving = pack.purchased; // currently active → will remove
      await invokeWithToken('toggle-pack-library', { packId: pack.id, removed: isRemoving });
      toast.success(isRemoving ? 'Pack removido da sua biblioteca.' : 'Pack restaurado na sua biblioteca!');
      refetch();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao atualizar biblioteca');
    } finally {
      setToggling(false);
    }
  };

  const handleRestoreFree = async () => {
    if (!pack) return;
    setToggling(true);
    try {
      await invokeWithToken('toggle-pack-library', { packId: pack.id, removed: false });
      toast.success(`Pack "${pack.name}" restaurado na sua biblioteca!`);
      refetch();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao restaurar pack');
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f8fa] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!pack) {
    return (
      <div className="min-h-screen bg-[#f8f8fa] flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">Pack não encontrado.</p>
        <Button onClick={() => navigate('/dashboard')} variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar à Loja
        </Button>
      </div>
    );
  }

  const isImageIcon = pack.icon_name?.startsWith('pack-icons/') || pack.icon_name?.startsWith('http');
  const imageIconUrl = isImageIcon
    ? (pack.icon_name.startsWith('http')
        ? pack.icon_name
        : `https://${projectId}.supabase.co/storage/v1/object/public/sound-previews/${pack.icon_name}`)
    : null;
  const lucideIcon = LUCIDE_ICON_MAP[pack.icon_name] || <Music className="h-6 w-6" />;

  const hasBanner = !!(pack as any).banner_url;
  const bannerUrl = hasBanner
    ? ((pack as any).banner_url.startsWith('http')
        ? (pack as any).banner_url
        : `https://${projectId}.supabase.co/storage/v1/object/public/sound-previews/${(pack as any).banner_url}`)
    : null;

  const priceLabel = pack.price_cents === 0 ? 'Grátis' : `R$ ${(pack.price_cents / 100).toFixed(2)}`;

  return (
    <div className="min-h-screen bg-[#f8f8fa] text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-lg border-b border-gray-200/80 shadow-sm" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm text-gray-600"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Loja</span>
          </button>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <img src={logoDark} alt="Logo" className="h-7 w-auto" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 sm:py-10">

        {/* Pack info */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {pack.tag && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                  {pack.tag}
                </span>
              )}
              <span className="text-xs text-gray-400">{pack.category}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{pack.name}</h1>
            <p className="text-gray-500 leading-relaxed max-w-lg">{pack.description}</p>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <Music className="h-4 w-4 text-gray-400" />
                {pack.sounds.length} {pack.sounds.length === 1 ? 'som' : 'sons'}
              </div>
              {pack.sounds.some(s => s.duration_ms) && (
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Clock className="h-4 w-4 text-gray-400" />
                  {(pack.sounds.reduce((acc, s) => acc + (s.duration_ms || 0), 0) / 1000).toFixed(0)}s total
                </div>
              )}
            </div>
          </div>

          {/* Purchase CTA */}
          <div className="shrink-0 w-full sm:w-56">
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
              {pack.purchased ? (
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center gap-2 text-emerald-600 font-semibold">
                    <Check className="h-5 w-5" />
                    Adquirido
                  </div>
                  <p className="text-xs text-gray-500">Disponível nos seus pads</p>
                  <Button onClick={() => navigate('/app')} size="sm" className="w-full h-9 text-xs rounded-lg bg-gray-900 hover:bg-gray-800 text-white">
                    Abrir App
                  </Button>
                  <button
                    onClick={handleToggleRemove}
                    disabled={toggling}
                    className="w-full text-xs text-gray-400 hover:text-red-500 transition-colors py-1 flex items-center justify-center gap-1"
                  >
                    {toggling ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    Remover da biblioteca
                  </button>
                </div>
              ) : pack.removedFromLibrary ? (
                <div className="space-y-3">
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-700">Pack removido</p>
                    <p className="text-xs text-gray-400 mt-0.5">Você já adquiriu este pack</p>
                  </div>
                  <Button
                    onClick={handleRestoreFree}
                    disabled={toggling}
                    className="w-full h-10 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  >
                    {toggling
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <><Download className="h-4 w-4 mr-1.5" />Incluir Grátis</>
                    }
                  </Button>
                </div>
              ) : pack.is_available ? (
                <div className="space-y-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{priceLabel}</p>
                    {pack.price_cents > 0 && <p className="text-xs text-gray-400">pagamento único</p>}
                  </div>
                  <Button onClick={handlePurchase} disabled={purchasing} className="w-full h-10 rounded-lg bg-gray-900 hover:bg-gray-800 text-white font-semibold">
                    {purchasing
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <><Download className="h-4 w-4 mr-1.5" />{pack.price_cents === 0 ? 'Obter Grátis' : 'Comprar'}</>
                    }
                  </Button>
                </div>
              ) : (
                <div className="text-center space-y-2">
                  <Lock className="h-6 w-6 text-gray-300 mx-auto" />
                  <p className="text-sm font-medium text-gray-500">Em breve</p>
                  <p className="text-xs text-gray-400">Este pack ainda não está disponível</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sounds grid */}
        {pack.sounds.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-3">Sons incluídos</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
              {pack.sounds.map((sound, idx) => (
                <div
                  key={sound.id}
                  className="aspect-square bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center gap-1.5 p-2 hover:bg-gray-50 hover:border-gray-300 transition-colors relative group"
                >
                  {/* Play button overlay */}
                  <button
                    onClick={() => handlePreview(sound)}
                    disabled={!sound.preview_path}
                    className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${
                      sound.preview_path
                        ? 'hover:bg-gray-100 text-gray-400 hover:text-gray-900'
                        : 'text-gray-200 cursor-not-allowed'
                    }`}
                    title={sound.preview_path ? 'Ouvir preview' : 'Sem preview'}
                  >
                    {playingId === sound.id
                      ? <Square className="h-4 w-4 text-violet-600" />
                      : <Play className="h-4 w-4" />}
                  </button>

                  <p className="text-[11px] text-gray-700 font-medium text-center leading-tight truncate w-full px-1">{sound.short_name}</p>

                  {sound.duration_ms > 0 && (
                    <span className="text-[9px] text-gray-400 font-mono">
                      {(sound.duration_ms / 1000).toFixed(1)}s
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PackDetail;
