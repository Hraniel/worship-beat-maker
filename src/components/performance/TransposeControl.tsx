import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { transposeKey } from '@/lib/transpose';

interface TransposeControlProps {
  originalKey: string;
  transpose: number;
  onTransposeChange: (value: number) => void;
}

const TransposeControl: React.FC<TransposeControlProps> = ({ originalKey, transpose, onTransposeChange }) => {
  const { t } = useTranslation();
  const transposedKey = transposeKey(originalKey, transpose);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onTransposeChange(transpose - 1)}
        className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors active:scale-90"
        aria-label={t('performance.transposeDown')}
      >
        <Minus className="h-4 w-4" />
      </button>
      <div className="text-center min-w-[3rem]">
        <p className="text-3xl sm:text-4xl font-black text-foreground leading-none">{transposedKey}</p>
        {transpose !== 0 && (
          <p className="text-[9px] text-muted-foreground/60 mt-0.5">
            {originalKey} {transpose > 0 ? `+${transpose}` : transpose}
          </p>
        )}
      </div>
      <button
        onClick={() => onTransposeChange(transpose + 1)}
        className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors active:scale-90"
        aria-label={t('performance.transposeUp')}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
};

export default TransposeControl;
