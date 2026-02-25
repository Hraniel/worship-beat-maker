import React, { useState, useEffect, useRef } from 'react';
import {
  ListMusic, Plus, Trash2, GripVertical, Share2, Link2, Eye, EyeOff,
  Loader2, Calendar, ChevronDown, ChevronUp, Edit2, Check, X, Music, Sparkles, ChevronRight, PlayCircle,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription
} from '@/components/ui/sheet';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';
import type { SetlistSong } from '@/lib/sounds';
import { useSetlistEvents, type SetlistEvent, type EventSong } from '@/hooks/useSetlistEvents';

interface SetlistManagerProps {
  songs: SetlistSong[];
  currentSongId: string | null;
  onSaveSong: (name: string, bpm?: number, key?: string, timeSignature?: string) => void;
  onLoadSong: (song: SetlistSong) => void;
  onDeleteSong: (id: string) => void;
  onReorder?: (ids: string[]) => void;
  setlists?: { id: string; name: string; songs: SetlistSong[] }[];
  activeSetlistId?: string | null;
  onOpenMusicAI?: () => void;
  forceOpen?: boolean;
  onForceOpenChange?: () => void;
  selectedEventId?: string | null;
  onSelectEvent?: (eventId: string | null) => void;
  externalEvents?: ReturnType<typeof useSetlistEvents>;
  onOpenSavedSongs?: () => void;
}

interface SortableItemProps {
  song: SetlistSong;
  isActive: boolean;
  onLoad: () => void;
  onDelete: () => void;
}

const SortableItem: React.FC<SortableItemProps> = ({ song, isActive, onLoad, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: song.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style}
      className={`flex items-center gap-1 p-2 rounded-md cursor-pointer transition-colors ${isActive ? 'bg-primary/20 border border-primary/30' : 'hover:bg-muted'}`}
      onClick={onLoad}>
      <button className="touch-none p-0.5 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing shrink-0"
        {...attributes} {...listeners} onClick={(e) => e.stopPropagation()}>
        <GripVertical className="h-4 w-4" />
      </button>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate text-foreground">{song.name}</p>
        <p className="text-[10px] text-muted-foreground">{song.bpm} BPM · {song.timeSignature}</p>
      </div>
      {song.key && (
        <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0">
          {song.key}
        </span>
      )}
      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}>
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
};

// ── Sortable event song item ─────────────────────────────────────────────────
interface SortableEventSongProps {
  song: EventSong;
  index: number;
  onRemove: () => void;
  onClick?: () => void;
}

const SortableEventSong: React.FC<SortableEventSongProps> = ({ song, index, onRemove, onClick }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: song.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 px-3 py-1.5 group cursor-pointer hover:bg-muted/50 transition-colors" onClick={onClick}>
      <button className="touch-none p-0.5 text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing shrink-0"
        {...attributes} {...listeners}>
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <span className="text-[10px] font-bold text-muted-foreground/40 w-4 text-center shrink-0">{index + 1}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{song.name}</p>
        <p className="text-[9px] text-muted-foreground">{song.bpm} BPM · {song.timeSignature}</p>
      </div>
      {song.key && (
        <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0">
          {song.key}
        </span>
      )}
      <button onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 rounded flex items-center justify-center hover:bg-destructive/10 shrink-0">
        <X className="h-3 w-3 text-destructive" />
      </button>
    </div>
  );
};

// ── Event card ───────────────────────────────────────────────────────────────
interface EventCardProps {
  event: SetlistEvent;
  allSongs: SetlistSong[];
  onTogglePublic: (id: string, pub: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, name: string, date: string) => void;
  onAddSong: (eventId: string, song: EventSong) => void;
  onRemoveSong: (eventId: string, songId: string) => void;
  onReorderSongs: (eventId: string, songs: EventSong[]) => void;
  onSaveSong: (name: string, bpm?: number, key?: string, timeSignature?: string) => void;
  onLoadSong: (song: SetlistSong) => void;
  onOpenMusicAI?: () => void;
  onSelectEvent?: (eventId: string) => void;
  isSelected?: boolean;
  onOpenSavedSongs?: () => void;
  onCloseAndOpenSavedSongs?: (eventId: string) => void;
}

const EventCard: React.FC<EventCardProps & { expandTrigger?: number }> = ({
  event, allSongs, onTogglePublic, onDelete, onEdit, onAddSong, onRemoveSong, onReorderSongs, onSaveSong, onLoadSong, onOpenMusicAI, onSelectEvent, isSelected, onOpenSavedSongs, onCloseAndOpenSavedSongs, expandTrigger,
}) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(isSelected ?? false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(event.name);
  const [editDate, setEditDate] = useState(event.event_date);
  const [toggling, setToggling] = useState(false);
  const [showActivateConfirm, setShowActivateConfirm] = useState(false);
  const [showAddSong, setShowAddSong] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState('');
  const [showNewSong, setShowNewSong] = useState(false);
  const [newSongName, setNewSongName] = useState('');
  const [newSongBpm, setNewSongBpm] = useState('120');
  const [newSongKey, setNewSongKey] = useState('');
  const [newSongTimeSignature, setNewSongTimeSignature] = useState('4/4');

  useEffect(() => {
    if (isSelected && expandTrigger) setExpanded(true);
  }, [expandTrigger]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const copyLink = () => {
    const url = `${window.location.origin}/s/${event.share_token}`;
    navigator.clipboard.writeText(url).then(() => toast.success(t('setlist.linkCopied'))).catch(() => toast.error(t('setlist.copyError')));
  };

  const handleToggle = async () => {
    setToggling(true);
    await onTogglePublic(event.id, !event.is_public);
    setToggling(false);
  };

  const saveEdit = () => {
    onEdit(event.id, editName.trim() || event.name, editDate || event.event_date);
    setEditing(false);
  };

  const formatDate = (d: string) => {
    try { return new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' }); }
    catch { return d; }
  };

  const handleAddSong = () => {
    if (!selectedSongId) return;
    const song = allSongs.find(s => s.id === selectedSongId);
    if (!song) return;
    if (event.songs_data.some(es => es.id === song.id)) {
      toast.error(t('setlist.songAlreadyInEvent'));
      return;
    }
    const eventSong: EventSong = {
      id: song.id,
      name: song.name,
      bpm: song.bpm,
      timeSignature: song.timeSignature,
      key: song.key,
    };
    onAddSong(event.id, eventSong);
    setSelectedSongId('');
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = event.songs_data.findIndex(s => s.id === active.id);
    const newIndex = event.songs_data.findIndex(s => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorderSongs(event.id, arrayMove(event.songs_data, oldIndex, newIndex));
  };

  const availableSongs = allSongs.filter(s => !event.songs_data.some(es => es.id === s.id));

  return (
    <div className={`bg-muted/30 border rounded-lg overflow-hidden ${isSelected ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border'}`}>
      {/* Header */}
      <div className="px-3 py-2.5">
        {editing ? (
          <div className="flex flex-col gap-1.5" onClick={e => e.stopPropagation()}>
            <input value={editName} onChange={e => setEditName(e.target.value)}
              className="w-full h-7 px-2 text-xs rounded bg-background border border-input text-foreground focus:outline-none" />
            <div className="flex gap-1.5">
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex-1 h-7 px-2 flex items-center gap-1.5 text-xs rounded bg-background border border-input text-foreground hover:bg-muted transition-colors">
                    <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                    {editDate ? format(parseISO(editDate), 'dd/MM/yyyy') : t('setlist.selectDate')}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[200]" align="start" side="bottom" sideOffset={4} collisionPadding={12} avoidCollisions={true}>
                  <CalendarUI
                    mode="single"
                    selected={editDate ? parseISO(editDate) : undefined}
                    onSelect={d => d && setEditDate(format(d, 'yyyy-MM-dd'))}
                    className="p-3 pointer-events-auto"
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <button onClick={saveEdit} className="h-7 w-7 rounded flex items-center justify-center bg-primary/10 hover:bg-primary/20 shrink-0">
                <Check className="h-3 w-3 text-primary" />
              </button>
              <button onClick={() => setEditing(false)} className="h-7 w-7 rounded flex items-center justify-center hover:bg-muted shrink-0">
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => {
            if (isSelected) {
              // Deselecting — no confirmation needed
              onSelectEvent?.(null);
              setExpanded(p => !p);
            } else {
              // Activating — show confirmation popup
              setShowActivateConfirm(true);
            }
          }}>
            <button onClick={(e) => { e.stopPropagation(); setExpanded(p => !p); }} className="p-0.5 text-muted-foreground hover:text-foreground shrink-0">
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{event.name}</p>
              <p className="text-[10px] text-muted-foreground">{formatDate(event.event_date)} · {event.songs_data.length} {t('setlist.songs')}</p>
            </div>
            {isSelected && (
              <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0">{t('setlist.active')}</span>
            )}
            <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
              <button onClick={() => setEditing(true)} className="h-6 w-6 rounded flex items-center justify-center hover:bg-muted">
                <Edit2 className="h-3 w-3 text-muted-foreground" />
              </button>
              <button onClick={() => onDelete(event.id)} className="h-6 w-6 rounded flex items-center justify-center hover:bg-destructive/10">
                <Trash2 className="h-3 w-3 text-destructive" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Share section */}
      <div className="px-3 pb-2 border-t border-border/40">
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1.5">
            <Share2 className="h-3 w-3 text-muted-foreground" />
            <p className="text-[10px] font-medium text-foreground">{t('setlist.share')}</p>
          </div>
          {toggling ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : (
            <button onClick={handleToggle}
              className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${event.is_public ? 'bg-primary/20 text-primary hover:bg-primary/30' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
              {event.is_public ? <Eye className="h-2.5 w-2.5" /> : <EyeOff className="h-2.5 w-2.5" />}
              {event.is_public ? t('setlist.public') : t('setlist.private')}
            </button>
          )}
        </div>
        {event.is_public && (
          <button onClick={copyLink}
            className="w-full flex items-center gap-2 text-xs bg-background border border-border rounded-md px-2 py-1.5 hover:bg-muted transition-colors text-left mt-1.5">
            <Link2 className="h-3 w-3 text-primary shrink-0" />
            <span className="truncate text-muted-foreground">{window.location.origin}/s/{event.share_token?.slice(0, 8)}…</span>
            <span className="ml-auto text-primary font-medium shrink-0">{t('setlist.copy')}</span>
          </button>
        )}
      </div>

      {/* Songs list (expanded) */}
      {expanded && (
        <div className="border-t border-border/40">
          {event.songs_data.length === 0 ? (
            <p className="text-[11px] text-muted-foreground text-center py-3">{t('setlist.noSongsAdded')}</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={event.songs_data.map(s => s.id)} strategy={verticalListSortingStrategy}>
                <div className="divide-y divide-border/30">
                  {event.songs_data.map((song, idx) => (
                    <SortableEventSong
                      key={song.id}
                      song={song}
                      index={idx}
                      onRemove={() => onRemoveSong(event.id, song.id)}
                      onClick={() => {
                        onSelectEvent?.(event.id);
                        const setlistSong: SetlistSong = {
                          id: song.id,
                          name: song.name,
                          bpm: song.bpm,
                          timeSignature: song.timeSignature,
                          key: song.key || null,
                          pads: [],
                          padVolumes: {},
                          padNames: {},
                          padPans: {},
                          padEffects: {},
                          customSounds: {},
                        };
                        const fullSong = allSongs.find(s => s.id === song.id);
                        onLoadSong(fullSong || setlistSong);
                      }}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* Add song row */}
          <div className="px-3 py-2 border-t border-border/40">
            {showNewSong ? (
              <div className="flex flex-col gap-2 mb-2">
                <p className="text-[10px] font-semibold text-muted-foreground">{t('setlist.createNewSong')}</p>
                <Input
                  placeholder={t('setlist.songNamePlaceholder')}
                  value={newSongName}
                  onChange={e => setNewSongName(e.target.value)}
                  className="h-7 text-xs bg-background"
                />
                <div className="flex gap-1.5">
                  <div className="flex-1">
                    <label className="text-[9px] text-muted-foreground mb-0.5 block">BPM</label>
                    <Input
                      type="number"
                      placeholder="120"
                      value={newSongBpm}
                      onChange={e => setNewSongBpm(e.target.value)}
                      className="h-7 text-xs bg-background"
                      min={40}
                      max={240}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[9px] text-muted-foreground mb-0.5 block">{t('setlist.key')}</label>
                    <select
                      value={newSongKey}
                      onChange={e => setNewSongKey(e.target.value)}
                      className="w-full h-7 px-2 text-xs rounded-md bg-background border border-input text-foreground focus:outline-none"
                    >
                      <option value="">—</option>
                      {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
                        'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm'].map(k => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-[9px] text-muted-foreground mb-0.5 block">{t('setlist.timeSignature')}</label>
                    <select
                      value={newSongTimeSignature}
                      onChange={e => setNewSongTimeSignature(e.target.value)}
                      className="w-full h-7 px-2 text-xs rounded-md bg-background border border-input text-foreground focus:outline-none"
                    >
                      {['2/4', '3/4', '4/4', '6/8'].map(ts => (
                        <option key={ts} value={ts}>{ts}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => {
                      if (newSongName.trim()) {
                        const bpmVal = Math.max(40, Math.min(240, parseInt(newSongBpm) || 120));
                        onSaveSong(newSongName.trim(), bpmVal, newSongKey || undefined, newSongTimeSignature);
                        setNewSongName('');
                        setNewSongBpm('120');
                        setNewSongKey('');
                        setNewSongTimeSignature('4/4');
                        setShowNewSong(false);
                      }
                    }}
                    disabled={!newSongName.trim()}
                    className="flex-1 h-7 px-2.5 text-xs rounded-md bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors">
                    {t('common.save')}
                  </button>
                  {onOpenMusicAI && (
                    <button
                      onClick={() => {
                        setShowNewSong(false);
                        onOpenMusicAI();
                      }}
                      className="flex-1 h-7 px-2.5 text-xs rounded-md bg-accent text-accent-foreground hover:bg-accent/80 transition-colors flex items-center justify-center gap-1">
                      <Sparkles className="h-3 w-3" /> Music AI
                    </button>
                  )}
                  <button
                    onClick={() => { setShowNewSong(false); setNewSongName(''); setNewSongBpm('120'); setNewSongKey(''); setNewSongTimeSignature('4/4'); }}
                    className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted">
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              </div>
            ) : showAddSong ? (
              <div className="flex flex-col gap-1.5">
                <select
                  value={selectedSongId}
                  onChange={e => setSelectedSongId(e.target.value)}
                  className="w-full h-7 px-2 text-xs rounded-md bg-background border border-input text-foreground focus:outline-none">
                  <option value="">{t('setlist.selectSong')}</option>
                  {availableSongs.length === 0
                    ? <option disabled value="">{t('setlist.noSongsAvailable')}</option>
                    : availableSongs.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.bpm} BPM{s.key ? ` · ${s.key}` : ''})</option>
                    ))
                  }
                </select>
                <div className="flex gap-1.5">
                  <button
                    onClick={handleAddSong}
                    disabled={!selectedSongId}
                    className="flex-1 h-7 px-2.5 text-xs rounded-md bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors">
                    {t('setlist.add')}
                  </button>
                  <button
                    onClick={() => { setShowAddSong(false); setSelectedSongId(''); }}
                    className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted shrink-0">
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-1.5">
                <button
                  onClick={() => {
                    onCloseAndOpenSavedSongs?.(event.id);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 h-7 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors border border-dashed border-border/60">
                  <Plus className="h-3 w-3" /> {t('setlist.addExisting')}
                </button>
                <button
                  onClick={() => setShowNewSong(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 h-7 text-[11px] text-primary hover:text-primary hover:bg-primary/10 rounded-md transition-colors border border-dashed border-primary/30">
                  <Music className="h-3 w-3" /> {t('setlist.createSong')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Activate event confirmation dialog */}
      <AlertDialog open={showActivateConfirm} onOpenChange={setShowActivateConfirm}>
        <AlertDialogContent className="max-w-xs rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-base">
              <PlayCircle className="h-5 w-5 text-primary" />
              {t('setlist.activateEvent')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              {t('setlist.activateEventConfirm', { name: event.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction className="text-xs" onClick={() => {
              onSelectEvent?.(event.id);
              setExpanded(true);
            }}>
              {t('setlist.openEvent')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ── Create event form (simplified) ───────────────────────────────────────────
interface CreateEventFormProps {
  onSubmit: (name: string, date: string) => void;
  onCancel: () => void;
}

const CreateEventForm: React.FC<CreateEventFormProps> = ({ onSubmit, onCancel }) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  return (
    <div className="bg-muted/30 border border-primary/20 rounded-lg p-3 space-y-2.5">
      <p className="text-xs font-semibold text-foreground">{t('setlist.newEvent')}</p>
      <Input
        placeholder={t('setlist.eventNamePlaceholder')}
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && name.trim() && onSubmit(name.trim(), date)}
        className="h-8 text-xs bg-background" />
      <input
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
        className="w-full h-8 px-3 text-xs rounded-md bg-background border border-input text-foreground focus:outline-none" />
      <div className="flex gap-2">
        <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => onSubmit(name.trim(), date)} disabled={!name.trim()}>
          <Plus className="h-3.5 w-3.5 mr-1" /> {t('setlist.create')}
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancel}>{t('common.cancel')}</Button>
      </div>
    </div>
  );
};

const SetlistManager: React.FC<SetlistManagerProps> = ({
  songs, currentSongId, onSaveSong, onLoadSong, onDeleteSong, onReorder, onOpenMusicAI,
  forceOpen, onForceOpenChange, selectedEventId, onSelectEvent, externalEvents, onOpenSavedSongs,
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [expandCounter, setExpandCounter] = useState(0);
  const wasOpenBeforeSavedSongs = useRef(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const internalEvents = useSetlistEvents();
  const { events, createEvent, updateEvent, deleteEvent, togglePublic, addSongToEvent, removeSongFromEvent, reorderEventSongs } = externalEvents || internalEvents;

  useEffect(() => {
    if (forceOpen) {
      setOpen(true);
      setExpandCounter(c => c + 1);
      onForceOpenChange?.();
    }
  }, [forceOpen]);

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (v) setExpandCounter(c => c + 1);
  };

  const handleCreateEvent = async (name: string, date: string) => {
    const ev = await createEvent(name, date);
    if (ev) setShowCreateEvent(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <ListMusic className="h-4 w-4" />
          {t('setlist.title')}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="bg-card border-border flex flex-col overflow-hidden">
        <SheetHeader>
          <SheetTitle className="text-foreground">{t('setlist.title')}</SheetTitle>
          <SheetDescription className="text-muted-foreground">
            {t('setlist.description')}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-4 flex-1 overflow-y-auto pb-4" style={{ overscrollBehavior: 'contain' }}>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                {t('setlist.scheduledEvents')}
              </p>
              <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 gap-1" onClick={() => setShowCreateEvent(p => !p)}>
                <Plus className="h-3 w-3" /> {t('setlist.newEvent')}
              </Button>
            </div>

            {showCreateEvent && (
              <CreateEventForm onSubmit={handleCreateEvent} onCancel={() => setShowCreateEvent(false)} />
            )}

            {events.length === 0 && !showCreateEvent && (
              <div className="text-center py-6 space-y-2">
                <Calendar className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                <p className="text-sm text-muted-foreground">{t('setlist.noEvents')}</p>
                <p className="text-[11px] text-muted-foreground/60">{t('setlist.noEventsHint')}</p>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1 mt-1" onClick={() => setShowCreateEvent(true)}>
                  <Plus className="h-3 w-3" /> {t('setlist.createFirstEvent')}
                </Button>
              </div>
            )}

            {events.map(event => (
              <EventCard
                key={event.id}
                event={event}
                allSongs={songs}
                onTogglePublic={togglePublic}
                onDelete={deleteEvent}
                onEdit={(id, name, date) => updateEvent(id, { name, event_date: date })}
                onAddSong={addSongToEvent}
                onRemoveSong={removeSongFromEvent}
                onReorderSongs={reorderEventSongs}
                onSaveSong={onSaveSong}
                onLoadSong={onLoadSong}
                onOpenMusicAI={onOpenMusicAI}
                onSelectEvent={onSelectEvent}
                isSelected={selectedEventId === event.id}
                expandTrigger={expandCounter}
                onOpenSavedSongs={onOpenSavedSongs}
                onCloseAndOpenSavedSongs={(eventId) => {
                  onSelectEvent?.(eventId);
                  wasOpenBeforeSavedSongs.current = true;
                  setOpen(false);
                  setTimeout(() => onOpenSavedSongs?.(), 200);
                }}
              />
            ))}
          </div>

        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SetlistManager;
