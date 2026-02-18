import React, { useState, useEffect } from 'react';
import {
  ListMusic, Plus, Trash2, ChevronRight, GripVertical, Share2, Link2, Eye, EyeOff,
  Loader2, Calendar, ChevronDown, ChevronUp, Edit2, Check, X,
} from 'lucide-react';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { SetlistSong } from '@/lib/sounds';
import { useSetlistEvents, type SetlistEvent } from '@/hooks/useSetlistEvents';

interface SetlistManagerProps {
  songs: SetlistSong[];
  currentSongId: string | null;
  onSaveSong: (name: string) => void;
  onLoadSong: (song: SetlistSong) => void;
  onDeleteSong: (id: string) => void;
  onReorder?: (ids: string[]) => void;
  setlists?: { id: string; name: string; songs: SetlistSong[] }[];
  activeSetlistId?: string | null;
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
      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}>
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
};

// ── Event card with share support ──────────────────────────────────────────
interface EventCardProps {
  event: SetlistEvent;
  setlistSongs: SetlistSong[];
  onTogglePublic: (id: string, pub: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, name: string, date: string) => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, setlistSongs, onTogglePublic, onDelete, onEdit }) => {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(event.name);
  const [editDate, setEditDate] = useState(event.event_date);
  const [toggling, setToggling] = useState(false);

  const copyLink = () => {
    const url = `${window.location.origin}/s/${event.share_token}`;
    navigator.clipboard.writeText(url).then(() => toast.success('Link copiado!')).catch(() => toast.error('Erro ao copiar'));
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
    try { return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }); }
    catch { return d; }
  };

  return (
    <div className="bg-muted/30 border border-border rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button onClick={() => setExpanded(p => !p)} className="p-0.5 text-muted-foreground hover:text-foreground shrink-0">
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
        <div className="flex-1 min-w-0" onClick={() => setExpanded(p => !p)}>
          {editing ? (
            <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
              <input value={editName} onChange={e => setEditName(e.target.value)} className="flex-1 h-6 px-2 text-xs rounded bg-background border border-input text-foreground" />
              <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="h-6 px-1 text-xs rounded bg-background border border-input text-foreground" />
              <button onClick={saveEdit} className="h-6 w-6 rounded flex items-center justify-center bg-primary/10 hover:bg-primary/20"><Check className="h-3 w-3 text-primary" /></button>
              <button onClick={() => setEditing(false)} className="h-6 w-6 rounded flex items-center justify-center hover:bg-muted"><X className="h-3 w-3 text-muted-foreground" /></button>
            </div>
          ) : (
            <div className="cursor-pointer">
              <p className="text-sm font-semibold text-foreground truncate">{event.name}</p>
              <p className="text-[10px] text-muted-foreground">{formatDate(event.event_date)} · {setlistSongs.length} músicas</p>
            </div>
          )}
        </div>
        {!editing && (
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => setEditing(true)} className="h-6 w-6 rounded flex items-center justify-center hover:bg-muted">
              <Edit2 className="h-3 w-3 text-muted-foreground" />
            </button>
            <button onClick={() => onDelete(event.id)} className="h-6 w-6 rounded flex items-center justify-center hover:bg-destructive/10">
              <Trash2 className="h-3 w-3 text-destructive" />
            </button>
          </div>
        )}
      </div>

      {/* Share section */}
      <div className="px-3 pb-2 border-t border-border/40">
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1.5">
            <Share2 className="h-3 w-3 text-muted-foreground" />
            <p className="text-[10px] font-medium text-foreground">Compartilhar</p>
          </div>
          {toggling ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : (
            <button onClick={handleToggle}
              className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${event.is_public ? 'bg-primary/20 text-primary hover:bg-primary/30' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
              {event.is_public ? <Eye className="h-2.5 w-2.5" /> : <EyeOff className="h-2.5 w-2.5" />}
              {event.is_public ? 'Público' : 'Privado'}
            </button>
          )}
        </div>
        {event.is_public && (
          <button onClick={copyLink} className="w-full flex items-center gap-2 text-xs bg-background border border-border rounded-md px-2 py-1.5 hover:bg-muted transition-colors text-left mt-1.5">
            <Link2 className="h-3 w-3 text-primary shrink-0" />
            <span className="truncate text-muted-foreground">{window.location.origin}/s/{event.share_token?.slice(0, 8)}…</span>
            <span className="ml-auto text-primary font-medium shrink-0">Copiar</span>
          </button>
        )}
      </div>

      {/* Songs list */}
      {expanded && (
        <div className="border-t border-border/40">
          {setlistSongs.length === 0 ? (
            <p className="text-[11px] text-muted-foreground text-center py-3">Nenhuma música no repertório</p>
          ) : (
            <div className="divide-y divide-border/30">
              {setlistSongs.map((song, idx) => (
                <div key={song.id} className="flex items-center gap-2 px-3 py-2">
                  <span className="text-[10px] font-bold text-muted-foreground/40 w-4 text-center shrink-0">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{song.name}</p>
                    <p className="text-[9px] text-muted-foreground">{song.bpm} BPM · {song.timeSignature}</p>
                  </div>
                  {song.key && <span className="text-[9px] font-bold text-primary shrink-0">{song.key}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Create event form ──────────────────────────────────────────────────────
interface CreateEventFormProps {
  setlists: { id: string; name: string; songs: SetlistSong[] }[];
  onSubmit: (name: string, date: string, setlistId: string | null) => void;
  onCancel: () => void;
}

const CreateEventForm: React.FC<CreateEventFormProps> = ({ setlists, onSubmit, onCancel }) => {
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSetlistId, setSelectedSetlistId] = useState<string>('');
  return (
    <div className="bg-muted/30 border border-primary/20 rounded-lg p-3 space-y-2.5">
      <p className="text-xs font-semibold text-foreground">Novo Evento</p>
      <Input placeholder="Nome do evento (ex: Culto Domingo)" value={name} onChange={e => setName(e.target.value)} className="h-8 text-xs bg-background" />
      <input type="date" value={date} onChange={e => setDate(e.target.value)}
        className="w-full h-8 px-3 text-xs rounded-md bg-background border border-input text-foreground focus:outline-none" />
      {setlists.length > 0 && (
        <select value={selectedSetlistId} onChange={e => setSelectedSetlistId(e.target.value)}
          className="w-full h-8 px-3 text-xs rounded-md bg-background border border-input text-foreground focus:outline-none">
          <option value="">— Selecionar repertório existente —</option>
          {setlists.map(s => <option key={s.id} value={s.id}>{s.name} ({s.songs.length} músicas)</option>)}
        </select>
      )}
      <div className="flex gap-2">
        <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => onSubmit(name.trim(), date, selectedSetlistId || null)} disabled={!name.trim()}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Criar
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
};

const SetlistManager: React.FC<SetlistManagerProps> = ({
  songs, currentSongId, onSaveSong, onLoadSong, onDeleteSong, onReorder, setlists = [], activeSetlistId,
}) => {
  const [newName, setNewName] = useState('');
  const [open, setOpen] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const { events, createEvent, updateEvent, deleteEvent, togglePublic } = useSetlistEvents();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleSave = () => {
    if (newName.trim()) { onSaveSong(newName.trim()); setNewName(''); }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = songs.findIndex((s) => s.id === active.id);
    const newIndex = songs.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder?.(arrayMove(songs, oldIndex, newIndex).map((s) => s.id));
  };

  const handleCreateEvent = async (name: string, date: string, setlistId: string | null) => {
    await createEvent(name, date, setlistId);
    setShowCreateEvent(false);
  };

  const getEventSongs = (event: SetlistEvent): SetlistSong[] => {
    if (!event.setlist_id) return [];
    const sl = setlists.find(s => s.id === event.setlist_id);
    return sl?.songs || [];
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <ListMusic className="h-4 w-4" />
          Repertório
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="bg-card border-border flex flex-col overflow-hidden">
        <SheetHeader>
          <SheetTitle className="text-foreground">Repertório</SheetTitle>
          <SheetDescription className="text-muted-foreground">
            Salve músicas e organize eventos por data
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-4 flex-1 overflow-y-auto pb-4" style={{ overscrollBehavior: 'contain' }}>

          {/* Save current config as song */}
          <div className="flex gap-2">
            <Input placeholder="Nome da música..." value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()} className="bg-background" />
            <Button size="icon" onClick={handleSave} disabled={!newName.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Songs in current setlist */}
          <div className="space-y-1">
            {songs.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma música salva ainda</p>
            )}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={songs.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                {songs.map((song) => (
                  <SortableItem key={song.id} song={song} isActive={currentSongId === song.id}
                    onLoad={() => { onLoadSong(song); setOpen(false); }}
                    onDelete={() => onDeleteSong(song.id)} />
                ))}
              </SortableContext>
            </DndContext>
          </div>

          {/* Events section */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                Eventos Programados
              </p>
              <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 gap-1" onClick={() => setShowCreateEvent(p => !p)}>
                <Plus className="h-3 w-3" /> Novo
              </Button>
            </div>

            {showCreateEvent && (
              <CreateEventForm setlists={setlists} onSubmit={handleCreateEvent} onCancel={() => setShowCreateEvent(false)} />
            )}

            {events.length === 0 && !showCreateEvent && (
              <p className="text-xs text-muted-foreground text-center py-3">Nenhum evento criado</p>
            )}

            {events.map(event => (
              <EventCard
                key={event.id}
                event={event}
                setlistSongs={getEventSongs(event)}
                onTogglePublic={togglePublic}
                onDelete={deleteEvent}
                onEdit={(id, name, date) => updateEvent(id, { name, event_date: date })}
              />
            ))}
          </div>

        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SetlistManager;
