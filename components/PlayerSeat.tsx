import React, { useEffect, useState } from 'react';
import { Player, PlayerStatus, GamePhase } from '../types';
import CardComponent from './CardComponent';
import { motion, AnimatePresence } from 'framer-motion';

interface PlayerSeatProps {
  player: Player;
  isActive: boolean;
  gamePhase: GamePhase;
  onSelectForCompare: () => void;
  canBeCompared: boolean;
}

const PlayerSeat: React.FC<PlayerSeatProps> = ({ player, isActive, gamePhase, onSelectForCompare, canBeCompared }) => {
  const isFolded = player.status === PlayerStatus.FOLDED;
  const isLost = player.status === PlayerStatus.LOST;
  const isDimmed = isFolded || isLost;
  
  // Visual feedback for actions
  const [showAction, setShowAction] = useState(false);

  useEffect(() => {
    if (player.lastAction) {
      setShowAction(true);
      const timer = setTimeout(() => setShowAction(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [player.lastAction]);

  return (
    <div className={`relative flex flex-col items-center transition-all duration-300 ${isActive ? 'z-20 scale-105' : 'z-10'}`}>
      
      {/* Floating Action Text */}
      <AnimatePresence>
        {showAction && player.lastAction && (
           <motion.div
             initial={{ opacity: 0, y: 20, scale: 0.5 }}
             animate={{ opacity: 1, y: -40, scale: 1.2 }}
             exit={{ opacity: 0, y: -60 }}
             className={`
               absolute top-0 z-50 font-bold text-lg px-3 py-1 rounded-full shadow-lg whitespace-nowrap border-2
               ${player.lastActionType === 'negative' ? 'bg-red-600 border-red-400 text-white' : 
                 player.lastActionType === 'positive' ? 'bg-green-600 border-green-400 text-white' : 
                 'bg-yellow-500 border-yellow-300 text-black'}
             `}
           >
             {player.lastAction}
           </motion.div>
        )}
      </AnimatePresence>

      {/* Cards Area */}
      <div className="flex -space-x-6 mb-2 h-20 sm:h-24 justify-center perspective-1000">
        <AnimatePresence>
          {player.cards.map((card, idx) => (
            <motion.div
              key={card.id}
              initial={{ y: -100, opacity: 0, scale: 0.5, rotate: Math.random() * 20 - 10 }}
              animate={{ y: 0, opacity: 1, scale: 1, rotate: (idx - 1) * 5 }}
              transition={{ 
                type: "spring",
                stiffness: 200,
                damping: 15,
                delay: idx * 0.1 
              }}
              className="origin-bottom"
            >
              <CardComponent 
                card={card} 
                hidden={
                  (!player.isHuman && gamePhase !== GamePhase.SHOWDOWN && player.status !== PlayerStatus.LOST) ||
                  (player.isHuman && !player.hasSeenCards && gamePhase !== GamePhase.SHOWDOWN && player.status !== PlayerStatus.LOST)
                } 
                className={`shadow-2xl ${isDimmed ? 'opacity-50 grayscale' : ''}`}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Avatar & Info */}
      <div 
        onClick={() => canBeCompared && onSelectForCompare()}
        className={`
          relative flex flex-col items-center bg-gray-900/95 border-2 rounded-xl p-2 w-32 sm:w-40 transition-all duration-300
          ${isActive ? 'border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.6)] scale-105' : 'border-gray-600 shadow-lg'}
          ${canBeCompared ? 'cursor-pointer ring-4 ring-red-500 animate-pulse bg-red-900/80 scale-110' : ''}
          ${isDimmed ? 'opacity-60' : ''}
        `}
      >
        {/* Status Badge */}
        {player.status !== PlayerStatus.PLAYING && player.status !== PlayerStatus.WAITING && (
          <div className="absolute -top-3 bg-black text-white text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider border border-white/20 shadow-sm z-40">
            {player.status}
          </div>
        )}

        {/* Dealer Button */}
        {player.isDealer && (
          <div className="absolute -top-3 -right-2 bg-gradient-to-br from-yellow-300 to-yellow-600 text-black rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold border border-yellow-200 shadow-lg z-30">
            D
          </div>
        )}

        {/* Avatar */}
        <div className={`w-14 h-14 rounded-full overflow-hidden border-2 mb-1 bg-gray-800 relative z-10 ${isActive ? 'border-yellow-400' : 'border-gray-500'}`}>
           <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
           {isActive && <div className="absolute inset-0 rounded-full border-4 border-yellow-400/50 animate-ping"></div>}
        </div>

        <div className="text-center w-full relative z-10">
          <div className="text-sm font-bold text-white truncate drop-shadow-md">{player.name}</div>
          <div className="text-xs text-yellow-400 font-mono bg-black/30 rounded px-2 py-0.5 mt-1 inline-block border border-yellow-500/20">
             🪙 {player.chips.toLocaleString()}
          </div>
        </div>

        {/* Current Bet Bubble */}
        <AnimatePresence>
          {player.currentBet > 0 && gamePhase !== GamePhase.IDLE && (
             <motion.div 
               initial={{ scale: 0 }}
               animate={{ scale: 1 }}
               exit={{ scale: 0 }}
               className="absolute -right-3 top-1/2 -translate-y-1/2 bg-yellow-600 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg border border-yellow-400 z-20"
             >
               {player.currentBet}
             </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Comparison Overlay (Target) */}
      {canBeCompared && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
           <span className="bg-red-600 text-white text-sm font-extrabold px-3 py-1 rounded-lg shadow-[0_0_10px_red] animate-bounce">
             VS FIGHT
           </span>
        </div>
      )}
    </div>
  );
};

export default PlayerSeat;