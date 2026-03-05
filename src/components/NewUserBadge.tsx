import React from 'react';
import { Sparkles } from 'lucide-react';
import { useNewUserUnlock, formatCountdown } from '@/hooks/useNewUserUnlock';

const NewUserBadge: React.FC = () => {
  const { isUnlocked, remainingMs } = useNewUserUnlock();

  if (!isUnlocked) return null;

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide border animate-pulse"
      style={{
        background: 'linear-gradient(135deg, hsl(262 75% 55% / 0.2), hsl(280 80% 60% / 0.15))',
        borderColor: 'hsl(262 75% 65% / 0.4)',
        color: 'hsl(262 75% 80%)',
      }}
    >
      <Sparkles className="h-3 w-3" />
      <span>ACESSO TOTAL</span>
      <span className="font-mono opacity-80">{formatCountdown(remainingMs)}</span>
    </div>
  );
};

export default NewUserBadge;
