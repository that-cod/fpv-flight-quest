
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Rocket, Magnet, Clock, Pause, RotateCcw } from 'lucide-react';
import { PowerUpType } from '@/hooks/useGameState';

interface GameHUDProps {
  score: number;
  highScore: number;
  powerUp: PowerUpType;
  powerUpTimeRemaining: number;
  onPause: () => void;
  onRestart: () => void;
}

const GameHUD: React.FC<GameHUDProps> = ({
  score,
  highScore,
  powerUp,
  powerUpTimeRemaining,
  onPause,
  onRestart
}) => {
  const getPowerUpIcon = () => {
    switch (powerUp) {
      case 'shield':
        return <Shield className="text-blue-500" />;
      case 'speed':
        return <Rocket className="text-red-500" />;
      case 'magnet':
        return <Magnet className="text-purple-500" />;
      case 'timeFreeze':
        return <Clock className="text-green-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-x-0 top-0 z-50 p-6 pointer-events-none">
      <div className="max-w-5xl mx-auto flex justify-between items-start">
        {/* Score Display */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass-panel rounded-2xl px-5 py-3"
        >
          <div className="flex flex-col">
            <span className="text-xs text-gray-500">Score</span>
            <span className="text-2xl font-bold text-drone-accent">{score}</span>
            <span className="text-xs text-gray-500">Best: {highScore}</span>
          </div>
        </motion.div>

        {/* Power-up Display */}
        <div className="flex gap-2">
          <AnimatePresence>
            {powerUp && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="glass-panel rounded-2xl px-4 py-3 flex items-center gap-2"
              >
                {getPowerUpIcon()}
                <span className="text-sm font-medium">{powerUpTimeRemaining}s</span>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="glass-panel rounded-full p-3 hover:bg-white/90 transition-colors pointer-events-auto"
            onClick={onPause}
          >
            <Pause size={20} />
          </motion.button>

          <motion.button 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="glass-panel rounded-full p-3 hover:bg-white/90 transition-colors pointer-events-auto"
            onClick={onRestart}
          >
            <RotateCcw size={20} />
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default GameHUD;
