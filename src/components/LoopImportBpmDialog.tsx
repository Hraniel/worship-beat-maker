import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Music } from 'lucide-react';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';

interface LoopImportBpmDialogProps {
  open: boolean;
  fileName: string;
  currentBpm: number;
  onConfirm: (bpm: number) => void;
  onCancel: () => void;
}

const LoopImportBpmDialog: React.FC<LoopImportBpmDialogProps> = ({
  open, fileName, currentBpm, onConfirm, onCancel,
}) => {
  const { t } = useTranslation();
  const [bpmValue, setBpmValue] = useState(String(currentBpm));

  const handleConfirm = () => {
    const val = Math.max(40, Math.min(240, parseInt(bpmValue) || currentBpm));
    onConfirm(val);
  };

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <AlertDialogContent className="max-w-sm rounded-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-base">
            <Music className="h-5 w-5 text-primary" />
            {t('loopImport.title')}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t('loopImport.description', { name: fileName })}
              </p>

              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">
                  {t('loopImport.bpmLabel')}
                </label>
                <Input
                  type="number"
                  value={bpmValue}
                  onChange={(e) => setBpmValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); }}
                  min={40}
                  max={240}
                  className="h-9 text-center text-lg font-bold"
                  autoFocus
                />
              </div>

              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                  {t('loopImport.warning')}
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="text-xs">{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction className="text-xs" onClick={handleConfirm}>
            {t('loopImport.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default LoopImportBpmDialog;
