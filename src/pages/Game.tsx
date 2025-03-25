
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameState, GameStatus } from '@/hooks/useGameState';
import MainMenu from '@/components/MainMenu';
import DroneController from '@/components/DroneController';
import GameHUD from '@/components/GameHUD';
import DroneScene from '@/components/DroneScene';
import { toast } from "@/hooks/use-toast";

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

  const [screenShake, setScreenShake] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const coinAudioRef = useRef<HTMLAudioElement | null>(null);
  const powerUpAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio elements
  useEffect(() => {
    // Create audio elements
    audioRef.current = new Audio();
    audioRef.current.src = "https://assets.mixkit.co/active_storage/sfx/212/212-preview.mp3"; // Crash sound
    audioRef.current.volume = 0.5;
    
    coinAudioRef.current = new Audio();
    coinAudioRef.current.src = "https://assets.mixkit.co/active_storage/sfx/270/270-preview.mp3"; // Coin collection sound
    coinAudioRef.current.volume = 0.3;
    
    powerUpAudioRef.current = new Audio();
    powerUpAudioRef.current.src = "https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3"; // Power-up sound
    powerUpAudioRef.current.volume = 0.4;
    
    return () => {
      // Clean up audio elements
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (coinAudioRef.current) {
        coinAudioRef.current.pause();
        coinAudioRef.current = null;
      }
      if (powerUpAudioRef.current) {
        powerUpAudioRef.current.pause();
        powerUpAudioRef.current = null;
      }
    };
  }, []);

  const handleControlChange = useCallback((newControls: {
    throttle: number;
    pitch: number;
    yaw: number;
    roll: number;
  }) => {
    setControls(newControls);
  }, []);

  const handleCrash = useCallback(() => {
    // Play crash sound
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.log("Audio play failed:", e));
    }
    
    // Trigger screen shake effect
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 500);
    
    // Show toast notification
    toast({
      title: "Drone Crashed!",
      description: "Your drone hit an obstacle.",
      variant: "destructive"
    });
    
    // Handle crash in game state
    crashDrone();
  }, [crashDrone]);

  const handleCoinCollect = useCallback((value: number) => {
    // Play coin collection sound
    if (coinAudioRef.current) {
      coinAudioRef.current.currentTime = 0;
      coinAudioRef.current.play().catch(e => console.log("Audio play failed:", e));
    }
    
    // Add points to score
    addPoints(value);
    
    // Show notification for significant point gains
    if (value >= 50) {
      toast({
        title: "Bonus Points!",
        description: `You collected ${value} points!`,
        variant: "default"
      });
    }
  }, [addPoints]);

  const handlePowerUpCollect = useCallback((type: any, duration: number) => {
    // Play power-up sound
    if (powerUpAudioRef.current) {
      powerUpAudioRef.current.currentTime = 0;
      powerUpAudioRef.current.play().catch(e => console.log("Audio play failed:", e));
    }
    
    // Activate power-up
    activatePowerUp(type, duration);
    
    // Show toast notification for power-up
    const powerUpNames = {
      shield: "Shield",
      speed: "Speed Boost",
      magnet: "Coin Magnet",
      timeFreeze: "Time Freeze"
    };
    
    toast({
      title: `${powerUpNames[type]} Activated!`,
      description: `Duration: ${duration} seconds`,
      variant: "default"
    });
  }, [activatePowerUp]);

  return (
    <motion.div 
      className="w-full h-screen overflow-hidden"
      animate={screenShake ? {
        x: [0, -10, 10, -10, 10, 0],
        transition: { duration: 0.5, ease: "easeInOut" }
      } : {}}
    >
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
    </motion.div>
  );
};

export default Game;
