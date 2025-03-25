
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameState, GameStatus } from '@/hooks/useGameState';
import MainMenu from '@/components/MainMenu';
import DroneController from '@/components/DroneController';
import GameHUD from '@/components/GameHUD';
import DroneScene from '@/components/DroneScene';

const Game: React.FC = () => {
  const {
    state,
    startGame,
    pauseGame,
    crashDrone,
    addPoints,
    activatePowerUp,
    returnToMenu
  } = useGameState();

  const [controls, setControls] = useState({
    throttle: 0,
    pitch: 0,
    yaw: 0,
    roll: 0
  });

  const handleControlChange = useCallback((newControls: {
    throttle: number;
    pitch: number;
    yaw: number;
    roll: number;
  }) => {
    setControls(newControls);
  }, []);

  const handleCrash = useCallback(() => {
    crashDrone();
  }, [crashDrone]);

  const handleCoinCollect = useCallback((value: number) => {
    addPoints(value);
  }, [addPoints]);

  const handlePowerUpCollect = useCallback((type: any, duration: number) => {
    activatePowerUp(type, duration);
  }, [activatePowerUp]);

  return (
    <div className="w-full h-screen overflow-hidden">
      {/* Three.js Scene */}
      <DroneScene
        isPlaying={state.status === 'playing'}
        controls={controls}
        powerUp={state.powerUp}
        onCrash={handleCrash}
        onCoinCollect={handleCoinCollect}
        onPowerUpCollect={handlePowerUpCollect}
      />

      {/* Game Interface */}
      <AnimatePresence mode="wait">
        {state.status === 'menu' && (
          <MainMenu
            highScore={state.highScore}
            onStartGame={startGame}
          />
        )}

        {state.status === 'crashed' && (
          <motion.div
            key="crash-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="glass-panel rounded-3xl p-8 max-w-md w-full mx-6"
            >
              <h2 className="text-3xl font-bold mb-2 text-center">Drone Crashed</h2>
              <p className="text-gray-600 text-center mb-6">
                Final Score: <span className="text-drone font-bold">{state.score}</span>
              </p>
              
              <div className="flex flex-col gap-4">
                <button onClick={startGame} className="btn-primary">
                  Try Again
                </button>
                <button onClick={returnToMenu} className="btn-secondary">
                  Back to Menu
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {state.status === 'paused' && (
          <motion.div
            key="pause-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="glass-panel rounded-3xl p-8 max-w-md w-full mx-6"
            >
              <h2 className="text-3xl font-bold mb-6 text-center">Game Paused</h2>
              
              <div className="flex flex-col gap-4">
                <button onClick={pauseGame} className="btn-primary">
                  Resume
                </button>
                <button onClick={returnToMenu} className="btn-secondary">
                  Back to Menu
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game HUD - only show during gameplay */}
      {(state.status === 'playing') && (
        <GameHUD
          score={state.score}
          highScore={state.highScore}
          powerUp={state.powerUp}
          powerUpTimeRemaining={state.powerUpTimeRemaining}
          onPause={pauseGame}
          onRestart={returnToMenu}
        />
      )}

      {/* Controls - only show during gameplay */}
      {(state.status === 'playing') && (
        <DroneController onControlChange={handleControlChange} />
      )}
    </div>
  );
};

export default Game;
