import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Radio, Music, BookOpen, Waypoints, ChevronDown, ChevronUp, Hand, Heart, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getCueLabel, loadPerformanceSettings, type CueKey } from '@/lib/performance-settings';
import type { SetlistSong } from '@/lib/sounds';

interface LiveCuePanelProps {
  setlistId: string | null;
  isLeader?: boolean;
  songs?: SetlistSong[];
  currentSongId?: string | null;
}

const CUE_PRESETS: Array<{ key: CueKey; icon: React.FC<any>; color: string }> = [
  { key: 'chorus', icon: Music, color: 'bg-purple-500' },
  { key: 'verse', icon: BookOpen, color: 'bg-blue-500' },
  { key: 'bridge', icon: Waypoints, color: 'bg-teal-500' },
  { key: 'down', icon: ChevronDown, color: 'bg-sky-500' },
  { key: 'up', icon: ChevronUp, color: 'bg-orange-500' },
  { key: 'cut', icon: Hand, color: 'bg-red-500' },
  { key: 'worship', icon: Heart, color: 'bg-amber-500' },
];

const LiveCuePanel: React.FC<LiveCuePanelProps> = ({ setlistId, isLeader = true, songs = [], currentSongId }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [flash, setFlash] = useState<{ label: string; color: string; icon: React.FC<any> } | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [showSongPicker, setShowSongPicker] = useState(false);
  const [targetSongId, setTargetSongId] = useState<string | null>(null);
  const [settings, setSettings] = useState(loadPerformanceSettings);
  const flashTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const sync = () => setSettings(loadPerformanceSettings());
    window.addEventListener('storage', sync);
    window.addEventListener('glory-performance-settings-updated', sync as EventListener);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('glory-performance-settings-updated', sync as EventListener);
    };
  }, []);

  const broadcastChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Subscribe to broadcast channel (for sending and receiving cues)
  useEffect(() => {
    if (!setlistId) return;

    const channel = supabase
      .channel(`live-cues-${setlistId}`)
      .on('broadcast', { event: 'cue' }, (payload) => {
        const { cue_type, cue_label, sent_by } = payload.payload || {};
        if (sent_by === user?.id) return;

        const preset = CUE_PRESETS.find((p) => p.key === cue_type);
        const IconComp = preset?.icon || Music;
        setFlash({
          label: cue_label || cue_type,
          color: preset?.color || 'bg-primary',
          icon: IconComp,
        });

        if (settings.vibrateOnCue && typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(120);
        }

        if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
        flashTimerRef.current = window.setTimeout(() => setFlash(null), settings.cueDisplaySeconds * 1000);
      })
      .subscribe();

    broadcastChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      broadcastChannelRef.current = null;
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, [setlistId, user?.id, settings.cueDisplaySeconds, settings.vibrateOnCue]);

  const sendCue = useCallback(
    async (cueKey: CueKey) => {
      if (!setlistId || !user) return;

      const translated = t(`performance.cue_${cueKey}`);
      const cueLabel = getCueLabel(cueKey, translated, settings);

      // Use current song if no target selected
      const songToHighlight = targetSongId || currentSongId || null;
      const songName = songToHighlight ? songs.find(s => s.id === songToHighlight)?.name : null;

      // Write to DB for history
      await supabase.from('live_cues' as any).insert({
        setlist_id: setlistId,
        sent_by: user.id,
        cue_type: cueKey,
        cue_label: cueLabel,
      } as any);

      // Broadcast via the subscribed channel (works for anon subscribers)
      broadcastChannelRef.current?.send({
        type: 'broadcast',
        event: 'cue',
        payload: { 
          cue_type: cueKey, 
          cue_label: cueLabel, 
          sent_by: user.id,
          target_song_id: songToHighlight,
          target_song_name: songName,
        },
      });

      const preset = CUE_PRESETS.find((p) => p.key === cueKey);
      const IconComp = preset?.icon || Music;
      setFlash({ label: cueLabel, color: preset?.color || 'bg-primary', icon: IconComp });

      if (settings.vibrateOnCue && typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(80);
      }

      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      flashTimerRef.current = window.setTimeout(() => setFlash(null), settings.cueDisplaySeconds * 1000);

      // Clear target after send
      setTargetSongId(null);

      if (!settings.quickCueButtonsVisible && !settings.keepPanelOpenAfterSend) {
        setShowPanel(false);
      }
    },
    [setlistId, user, t, settings, targetSongId, currentSongId, songs],
  );

  const panelVisible = settings.quickCueButtonsVisible || showPanel;
  const targetSong = targetSongId ? songs.find(s => s.id === targetSongId) : null;

  return (
    <>
      {flash && (
        <div className="fixed inset-x-0 top-16 z-[250] flex justify-center pointer-events-none animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`${flash.color} rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-3 max-w-xs pointer-events-auto`}>
            <flash.icon className="h-8 w-8 text-white shrink-0 animate-[pulse_1s_ease-in-out_infinite]" />
            <p className="text-xl font-black text-white drop-shadow-lg truncate">{flash.label}</p>
          </div>
        </div>
      )}

      {isLeader && (
        <>
          {!settings.quickCueButtonsVisible && (
            <div className="relative">
              <button
                onClick={() => setShowPanel((p) => !p)}
                className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
                title={t('performance.liveCues')}
              >
                <Radio className="h-5 w-5" />
              </button>

              {showPanel && (
                <div className="absolute top-full mt-2 right-0 bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-3 shadow-2xl min-w-[240px] z-50">
                  <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wider">
                    {t('performance.sendCue')}
                  </p>

                  {songs.length > 0 && (
                    <div className="mb-3">
                      <button
                        onClick={() => setShowSongPicker(p => !p)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all border ${
                          targetSongId 
                            ? 'bg-primary/20 border-primary/30 text-primary' 
                            : 'bg-muted/30 border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Target className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate flex-1 text-left">
                          {targetSong ? targetSong.name : t('performance.targetSong')}
                        </span>
                      </button>

                      {showSongPicker && (
                        <div className="mt-2 bg-muted/50 rounded-lg p-2 space-y-1 max-h-40 overflow-y-auto">
                          <button
                            onClick={() => { setTargetSongId(null); setShowSongPicker(false); }}
                            className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                              !targetSongId ? 'bg-primary/20 text-primary' : 'hover:bg-muted text-foreground'
                            }`}
                          >
                            {t('performance.clearEvent')}
                          </button>
                          {songs.map(song => (
                            <button
                              key={song.id}
                              onClick={() => { setTargetSongId(song.id); setShowSongPicker(false); }}
                              className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors truncate ${
                                targetSongId === song.id ? 'bg-primary/20 text-primary' : 'hover:bg-muted text-foreground'
                              }`}
                            >
                              {song.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-1.5">
                    {CUE_PRESETS.map((cue) => {
                      const cueLabel = getCueLabel(cue.key, t(`performance.cue_${cue.key}`), settings);
                      return (
                        <button
                          key={cue.key}
                          onClick={() => sendCue(cue.key)}
                          className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-white ${cue.color} hover:brightness-110 transition-all active:scale-95 ${cue.key === 'worship' ? 'col-span-2' : ''}`}
                        >
                          <cue.icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{cueLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Inline quick buttons — rendered outside dropdown, positioned by parent */}
          {settings.quickCueButtonsVisible && (
            <div className="inline-flex items-center gap-1.5">
              {songs.length > 0 && (
                <button
                  onClick={() => setShowSongPicker(p => !p)}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${
                    targetSongId
                      ? 'bg-primary/20 border-primary/30 text-primary'
                      : 'bg-white/10 border-white/10 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Target className="h-3 w-3 shrink-0" />
                  <span className="truncate max-w-[80px]">{targetSong ? targetSong.name : t('performance.targetSong')}</span>
                </button>
              )}
              {CUE_PRESETS.map((cue) => {
                const cueLabel = getCueLabel(cue.key, t(`performance.cue_${cue.key}`), settings);
                return (
                  <button
                    key={cue.key}
                    onClick={() => sendCue(cue.key)}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-bold text-white ${cue.color} hover:brightness-110 transition-all active:scale-95`}
                    title={cueLabel}
                  >
                    <cue.icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="hidden sm:inline truncate max-w-[60px]">{cueLabel}</span>
                  </button>
                );
              })}

              {/* Song picker popover for quick mode */}
              {showSongPicker && (
                <div className="absolute top-full mt-2 right-0 bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-2 shadow-2xl min-w-[180px] z-50 max-h-48 overflow-y-auto">
                  <button
                    onClick={() => { setTargetSongId(null); setShowSongPicker(false); }}
                    className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                      !targetSongId ? 'bg-primary/20 text-primary' : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    {t('performance.clearEvent')}
                  </button>
                  {songs.map(song => (
                    <button
                      key={song.id}
                      onClick={() => { setTargetSongId(song.id); setShowSongPicker(false); }}
                      className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors truncate ${
                        targetSongId === song.id ? 'bg-primary/20 text-primary' : 'hover:bg-muted text-foreground'
                      }`}
                    >
                      {song.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
};

export default LiveCuePanel;
