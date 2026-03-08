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
  { key: 'chorus', icon: Music, color: 'bg-purple-500' },
  { key: 'verse', icon: BookOpen, color: 'bg-blue-500' },
  { key: 'bridge', icon: Waypoints, color: 'bg-teal-500' },
  { key: 'down', icon: ChevronDown, color: 'bg-sky-500' },
  { key: 'up', icon: ChevronUp, color: 'bg-orange-500' },
  { key: 'cut', icon: Hand, color: 'bg-red-500' },
  { key: 'worship', icon: Heart, color: 'bg-amber-500' },
];

const LiveCuePanel: React.FC<LiveCuePanelProps> = ({ setlistId, isLeader = true }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [flash, setFlash] = useState<{ label: string; color: string; icon: React.FC<any> } | null>(null);
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
          const IconComp = preset?.icon || Music;
          setFlash({
            label: cue.cue_label || cue.cue_type,
            color: preset?.color || 'bg-primary',
            icon: IconComp,
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
    const preset = CUE_PRESETS.find(p => p.key === cueKey);
    const IconComp = preset?.icon || Music;
    setFlash({ label: cueLabel, color: preset?.color || 'bg-primary', icon: IconComp });
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
            <flash.icon className="h-16 w-16 text-white mx-auto" />
            <p className="text-4xl sm:text-5xl font-black text-white mt-3 drop-shadow-lg">
              {flash.label}
            </p>
          </div>
        </div>
      )}

      {/* Cue trigger button — always visible */}
      {isLeader && (
        <div className="relative">
          <button
            onClick={() => setShowPanel(p => !p)}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
            title={t('performance.liveCues')}
          >
            <Radio className="h-5 w-5" />
          </button>

          {/* Cue selection popup — opens downward */}
          {showPanel && (
            <div className="absolute top-full mt-2 right-0 bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-3 shadow-2xl min-w-[220px] z-50">
              <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wider">
                {t('performance.sendCue')}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {CUE_PRESETS.map((cue) => (
                  <button
                    key={cue.key}
                    onClick={() => sendCue(cue.key, t(`performance.cue_${cue.key}`))}
                    className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-white ${cue.color} hover:brightness-110 transition-all active:scale-95 ${cue.key === 'worship' ? 'col-span-2' : ''}`}
                  >
                    <cue.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{t(`performance.cue_${cue.key}`)}</span>
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
