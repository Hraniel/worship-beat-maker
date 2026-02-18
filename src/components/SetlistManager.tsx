import React, { useState } from 'react';
import { ListMusic, Plus, Trash2, ChevronRight, GripVertical } from 'lucide-react';
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
import type { SetlistSong, PadSound } from '@/lib/sounds';

interface SetlistManagerProps {
  songs: SetlistSong[];
  currentSongId: string | null;
  onSaveSong: (name: string) => void;
  onLoadSong: (song: SetlistSong) => void;
  onDeleteSong: (id: string) => void;
  onReorder?: (ids: string[]) => void;
}

interface SortableItemProps {
  song: SetlistSong;
  isActive: boolean;
  onLoad: () => void;
  onDelete: () => void;
}

const SortableItem: React.FC<SortableItemProps> = ({ song, isActive, onLoad, onDelete }) => {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: song.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-1 p-2 rounded-md cursor-pointer transition-colors ${
        isActive ? 'bg-primary/20 border border-primary/30' : 'hover:bg-muted'
      }`}
      onClick={onLoad}
    >
      <button
        className="touch-none p-0.5 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing shrink-0"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate text-foreground">{song.name}</p>
        <p className="text-[10px] text-muted-foreground">{song.bpm} BPM · {song.timeSignature}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
};

const SetlistManager: React.FC<SetlistManagerProps> = ({
  songs, currentSongId, onSaveSong, onLoadSong, onDeleteSong, onReorder
}) => {
  const [newName, setNewName] = useState('');
  const [open, setOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleSave = () => {
    if (newName.trim()) {
      onSaveSong(newName.trim());
      setNewName('');
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = songs.findIndex((s) => s.id === active.id);
    const newIndex = songs.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(songs, oldIndex, newIndex);
    onReorder?.(reordered.map((s) => s.id));
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
            Salve e organize configurações por música
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-4 flex-1 overflow-y-auto pb-4" style={{ overscrollBehavior: 'contain' }}>
          {/* Save current */}
          <div className="flex gap-2">
            <Input
              placeholder="Nome da música..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              className="bg-background"
            />
            <Button size="icon" onClick={handleSave} disabled={!newName.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Song list with DnD */}
          <div className="space-y-1">
            {songs.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma música salva ainda
              </p>
            )}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={songs.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                {songs.map((song) => (
                  <SortableItem
                    key={song.id}
                    song={song}
                    isActive={currentSongId === song.id}
                    onLoad={() => { onLoadSong(song); setOpen(false); }}
                    onDelete={() => onDeleteSong(song.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SetlistManager;
