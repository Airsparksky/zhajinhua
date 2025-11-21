import React from 'react';
import { motion } from 'framer-motion';
import { Card, Suit } from '../types';

interface CardProps {
  card: Card;
  hidden?: boolean;
  className?: string;
  large?: boolean;
}

const CardComponent: React.FC<CardProps> = ({ card, hidden, className = '', large = false }) => {
  const isRed = card.suit === Suit.HEARTS || card.suit === Suit.DIAMONDS;
  
  // Convert 11, 12, 13, 14 to J, Q, K, A
  const getRankLabel = (r: number) => {
    if (r === 11) return 'J';
    if (r === 12) return 'Q';
    if (r === 13) return 'K';
    if (r === 14) return 'A';
    return r.toString();
  };

  const rankLabel = getRankLabel(card.rank);

  return (
    <motion.div
      layout
      initial={{ rotateY: 0 }}
      animate={{ rotateY: hidden ? 180 : 0 }}
      transition={{ duration: 0.6, type: "spring" }}
      style={{ transformStyle: "preserve-3d" }}
      className={`
        relative rounded-lg shadow-lg border border-gray-300 select-none
        flex flex-col items-center justify-center
        ${large ? 'w-24 h-36 sm:w-32 sm:h-48' : 'w-12 h-16 sm:w-14 sm:h-20'}
        ${className}
        bg-white
      `}
    >
      {/* Front of Card */}
      <div className="absolute inset-0 backface-hidden flex flex-col items-center justify-center bg-white rounded-lg" style={{ backfaceVisibility: 'hidden' }}>
        <div className={`absolute top-1 left-1 flex flex-col items-center leading-none ${isRed ? 'text-red-600' : 'text-slate-900'}`}>
          <span className={`font-bold ${large ? 'text-2xl' : 'text-sm'}`}>{rankLabel}</span>
          <span className={large ? 'text-xl' : 'text-xs'}>{card.suit}</span>
        </div>
        
        <div className={`font-serif ${large ? 'text-6xl' : 'text-2xl'} ${isRed ? 'text-red-600' : 'text-slate-900'}`}>
          {card.suit}
        </div>

        <div className={`absolute bottom-1 right-1 flex flex-col items-center leading-none rotate-180 ${isRed ? 'text-red-600' : 'text-slate-900'}`}>
            <span className={`font-bold ${large ? 'text-2xl' : 'text-sm'}`}>{rankLabel}</span>
          <span className={large ? 'text-xl' : 'text-xs'}>{card.suit}</span>
        </div>
      </div>

      {/* Back of Card */}
      <div 
        className="absolute inset-0 backface-hidden rounded-lg flex items-center justify-center overflow-hidden bg-indigo-900"
        style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
      >
        <div className="w-full h-full opacity-60" style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              #1e1b4b 0px,
              #1e1b4b 10px,
              #312e81 10px,
              #312e81 20px
            )`
        }}></div>
        <div className="absolute w-[80%] h-[80%] border-2 border-yellow-500/30 rounded"></div>
        <div className="absolute inset-0 flex items-center justify-center">
             <span className="text-yellow-500/20 font-serif font-bold text-xl">ROYAL</span>
        </div>
      </div>
    </motion.div>
  );
};

export default CardComponent;