import React, { useState } from 'react';
import { ListMusic, Plus, Trash2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription
} from '@/components/ui/sheet';
import type { SetlistSong, PadSound } from '@/lib/sounds';

interface SetlistManagerProps {
  songs: SetlistSong[];
  currentSongId: string | null;
  onSaveSong: (name: string) => void;
  onLoadSong: (song: SetlistSong) => void;
  onDeleteSong: (id: string) => void;
}

const SetlistManager: React.FC<SetlistManagerProps> = ({
  songs, currentSongId, onSaveSong, onLoadSong, onDeleteSong
}) => {
  const [newName, setNewName] = useState('');
  const [open, setOpen] = useState(false);

  const handleSave = () => {
    if (newName.trim()) {
      onSaveSong(newName.trim());
      setNewName('');
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <ListMusic className="h-4 w-4" />
          Setlist
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="bg-card border-border">
        <SheetHeader>
          <SheetTitle className="text-foreground">Setlist</SheetTitle>
          <SheetDescription className="text-muted-foreground">
            Salve e organize configurações por música
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-4">
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

          {/* Song list */}
          <div className="space-y-1">
            {songs.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma música salva ainda
              </p>
            )}
            {songs.map((song) => (
              <div
                key={song.id}
                className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                  currentSongId === song.id ? 'bg-primary/20 border border-primary/30' : 'hover:bg-muted'
                }`}
                onClick={() => { onLoadSong(song); setOpen(false); }}
              >
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-foreground">{song.name}</p>
                  <p className="text-[10px] text-muted-foreground">{song.bpm} BPM · {song.timeSignature}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); onDeleteSong(song.id); }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SetlistManager;
