import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Radio, Music, BookOpen, Waypoints, ChevronDown, ChevronUp, Hand, Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LiveCuePanelProps {
  setlistId: string | null;
  isLeader?: boolean;
}

const CUE_PRESETS = [
  { key: 'chorus', emoji: '🎵', color: 'bg-purple-500' },
  { key: 'verse', emoji: '📖', color: 'bg-blue-500' },
  { key: 'bridge', emoji: '🌉', color: 'bg-teal-500' },
  { key: 'down', emoji: '⬇️', color: 'bg-sky-500' },
  { key: 'up', emoji: '⬆️', color: 'bg-orange-500' },
  { key: 'cut', emoji: '✋', color: 'bg-red-500' },
  { key: 'worship', emoji: '🙏', color: 'bg-amber-500' },
];

const LiveCuePanel: React.FC<LiveCuePanelProps> = ({ setlistId, isLeader = true }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [flash, setFlash] = useState<{ label: string; color: string; emoji: string } | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const flashTimerRef = useRef<number | null>(null);

  // Subscribe to live cues
  useEffect(() => {
    if (!setlistId) return;
    const channel = supabase
      .channel(`live-cues-${setlistId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'live_cues', filter: `setlist_id=eq.${setlistId}` },
        (payload) => {
          const cue = payload.new as any;
          if (cue.sent_by === user?.id) return; // Don't flash own cues
          const preset = CUE_PRESETS.find(p => p.key === cue.cue_type);
          setFlash({
            label: cue.cue_label || cue.cue_type,
            color: preset?.color || 'bg-primary',
            emoji: preset?.emoji || '🎵',
          });
          if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
          flashTimerRef.current = window.setTimeout(() => setFlash(null), 2500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, [setlistId, user?.id]);

  const sendCue = useCallback(async (cueKey: string, cueLabel: string) => {
    if (!setlistId || !user) return;
    await supabase.from('live_cues' as any).insert({
      setlist_id: setlistId,
      sent_by: user.id,
      cue_type: cueKey,
      cue_label: cueLabel,
    } as any);
    // Show own flash too
    const preset = CUE_PRESETS.find(p => p.key === cueKey);
    setFlash({ label: cueLabel, color: preset?.color || 'bg-primary', emoji: preset?.emoji || '🎵' });
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = window.setTimeout(() => setFlash(null), 2000);
    setShowPanel(false);
  }, [setlistId, user]);

  return (
    <>
      {/* Fullscreen flash overlay */}
      {flash && (
        <div className={`fixed inset-0 z-[300] flex items-center justify-center ${flash.color}/30 animate-in fade-in duration-200`}>
          <div className="text-center animate-in zoom-in-50 duration-300">
            <span className="text-6xl">{flash.emoji}</span>
            <p className="text-4xl sm:text-5xl font-black text-white mt-2 drop-shadow-lg">
              {flash.label}
            </p>
          </div>
        </div>
      )}

      {/* Cue trigger button */}
      {isLeader && setlistId && (
        <div className="relative">
          <button
            onClick={() => setShowPanel(p => !p)}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
            title={t('performance.liveCues')}
          >
            <span className="text-lg">📡</span>
          </button>

          {/* Cue selection popup */}
          {showPanel && (
            <div className="absolute bottom-full mb-2 right-0 bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-3 shadow-2xl min-w-[200px] z-50">
              <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wider">
                {t('performance.sendCue')}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {CUE_PRESETS.map((cue) => (
                  <button
                    key={cue.key}
                    onClick={() => sendCue(cue.key, t(`performance.cue_${cue.key}`))}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white ${cue.color} hover:brightness-110 transition-all active:scale-95`}
                  >
                    <span>{cue.emoji}</span>
                    <span>{t(`performance.cue_${cue.key}`)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default LiveCuePanel;
