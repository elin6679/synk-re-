import React from 'react';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { speechService } from '../lib/speech';
import { hapticService } from '../lib/haptics';

interface AccessibleButtonProps {
  onClick?: (e?: React.MouseEvent) => void;
  onDoubleTap?: () => void;
  label: string;
  hint?: string;
  className?: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  id?: string;
  type?: 'button' | 'submit' | 'reset';
  isLoading?: boolean;
}

export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  onClick,
  onDoubleTap,
  label,
  hint,
  className = '',
  icon,
  variant = 'primary',
  id,
  type = 'button',
  isLoading = false
}) => {
  const clickCountRef = React.useRef(0);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    hapticService.tap();
    
    // Voice feedback
    speechService.speak(`${label}${hint ? `. ${hint}` : ''}`);

    if (isLoading) {
      e.preventDefault();
      return;
    }

    if (onDoubleTap) {
      e.preventDefault(); // prevent default to control double tap logic manually
      clickCountRef.current += 1;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        if (clickCountRef.current === 1) {
          if (onClick) onClick(e);
        } else if (clickCountRef.current >= 2) {
          onDoubleTap();
        }
        clickCountRef.current = 0;
      }, 300);
    } else {
      // Execute immediately (highly responsive!)
      if (onClick) {
        onClick(e);
      }
      // If of type submit and no onClick, let the form handle native submission.
      if (type !== 'submit' && !onClick) {
        e.preventDefault();
      }
    }
  };

  const variants = {
    primary: 'bg-gradient-to-br from-synk-blue to-synk-cyan text-white hover:brightness-110 shadow-lg shadow-synk-blue/20 rounded-2xl font-bold py-4 px-6 active:scale-95 transition-all',
    secondary: 'bg-white text-synk-navy hover:bg-synk-offwhite shadow-lg shadow-black/5 rounded-2xl font-bold py-4 px-6 border-2 border-synk-navy/5',
    ghost: 'border-2 border-synk-navy/10 text-synk-navy bg-white shadow-sm rounded-2xl py-4 px-6'
  };

  const hasPy = className.includes('py-');

  return (
    <motion.button
      type={type}
      id={id}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      onFocus={() => speechService.speak(`${label}${hint ? `. ${hint}` : ''}`)}
      onContextMenu={(e) => e.preventDefault()}
      className={`
        relative w-full px-6 rounded-3xl flex flex-col items-center justify-center gap-4
        text-2xl font-display font-bold shadow-lg accessible-button
        ${hasPy ? '' : 'py-8'}
        ${variants[variant]}
        ${className}
        ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}
      `}
      aria-label={label}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="w-8 h-8 animate-spin text-black" />
      ) : (
        <>
          {icon && <div className="text-4xl">{icon}</div>}
          <span className="text-center leading-tight">{label}</span>
          {hint && <span className="text-sm font-normal opacity-70">{hint}</span>}
        </>
      )}
    </motion.button>
  );
};
