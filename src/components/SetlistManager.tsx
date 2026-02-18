import React, { useState, useEffect } from 'react';
import { ListMusic, Plus, Trash2, ChevronRight, GripVertical, Share2, Link2, Eye, EyeOff, Loader2 } from 'lucide-react';
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

interface ShareInfo {
  token: string;
  is_public: boolean;
}

const SetlistManager: React.FC<SetlistManagerProps> = ({
  songs, currentSongId, onSaveSong, onLoadSong, onDeleteSong, onReorder
}) => {
  const [newName, setNewName] = useState('');
  const [open, setOpen] = useState(false);
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [loadingShare, setLoadingShare] = useState(false);
  const [togglingShare, setTogglingShare] = useState(false);

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

  // Load share info when panel opens and there's an active song
  useEffect(() => {
    if (!open || !currentSongId) { setShareInfo(null); return; }
    setLoadingShare(true);
    supabase
      .from('setlists')
      .select('share_token, is_public')
      .eq('id', currentSongId)
      .single()
      .then(({ data }) => {
        if (data) setShareInfo({ token: (data as any).share_token, is_public: (data as any).is_public ?? false });
        setLoadingShare(false);
      });
  }, [open, currentSongId]);

  const toggleShare = async () => {
    if (!currentSongId || !shareInfo) return;
    setTogglingShare(true);
    const newPublic = !shareInfo.is_public;
    const { error } = await supabase
      .from('setlists')
      .update({ is_public: newPublic } as any)
      .eq('id', currentSongId);
    if (error) {
      toast.error('Erro ao atualizar compartilhamento');
    } else {
      setShareInfo(prev => prev ? { ...prev, is_public: newPublic } : null);
      if (newPublic) {
        toast.success('Setlist agora é público!');
      } else {
        toast.success('Compartilhamento desativado');
      }
    }
    setTogglingShare(false);
  };

  const copyShareLink = () => {
    if (!shareInfo) return;
    const url = `${window.location.origin}/s/${shareInfo.token}`;
    navigator.clipboard.writeText(url).then(() => toast.success('Link copiado!')).catch(() => toast.error('Erro ao copiar'));
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

          {/* Share section for current song */}
          {currentSongId && (
            <div className="bg-muted/50 border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs font-medium text-foreground">Compartilhar setlist</p>
                </div>
                {loadingShare ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                ) : (
                  <button
                    onClick={toggleShare}
                    disabled={togglingShare}
                    className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-medium transition-colors ${
                      shareInfo?.is_public
                        ? 'bg-primary/20 text-primary hover:bg-primary/30'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {shareInfo?.is_public ? <Eye className="h-2.5 w-2.5" /> : <EyeOff className="h-2.5 w-2.5" />}
                    {shareInfo?.is_public ? 'Público' : 'Privado'}
                  </button>
                )}
              </div>
              {shareInfo?.is_public && (
                <button
                  onClick={copyShareLink}
                  className="w-full flex items-center gap-2 text-xs bg-background border border-border rounded-md px-2 py-1.5 hover:bg-muted transition-colors text-left"
                >
                  <Link2 className="h-3 w-3 text-primary shrink-0" />
                  <span className="truncate text-muted-foreground">{window.location.origin}/s/{shareInfo.token?.slice(0, 8)}…</span>
                  <span className="ml-auto text-primary font-medium shrink-0">Copiar</span>
                </button>
              )}
              {!shareInfo?.is_public && (
                <p className="text-[10px] text-muted-foreground">Ative para gerar um link público que músicos podem acessar sem conta.</p>
              )}
            </div>
          )}

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
