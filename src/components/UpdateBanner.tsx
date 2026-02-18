import { X, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface UpdateBannerProps {
  show: boolean;
  onUpdate: () => void;
}

const UpdateBanner = ({ show, onUpdate }: UpdateBannerProps) => {
  const [dismissed, setDismissed] = useState(false);

  if (!show || dismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] animate-in slide-in-from-top duration-300" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-card border-b border-primary/30 shadow-lg">
        <div className="flex items-center gap-2 min-w-0">
          <RefreshCw className="h-4 w-4 text-primary shrink-0 animate-spin" style={{ animationDuration: '3s' }} />
          <span className="text-sm font-medium text-foreground">Nova versão disponível!</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button size="sm" className="h-7 text-xs gap-1" onClick={onUpdate}>
            Atualizar
          </Button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Dispensar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateBanner;
