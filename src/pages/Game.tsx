
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameState, GameStatus } from '@/hooks/useGameState';
import MainMenu from '@/components/MainMenu';
import DroneController from '@/components/DroneController';
import GameHUD from '@/components/GameHUD';
import DroneScene from '@/components/DroneScene';
import { toast } from "@/hooks/use-toast";
import { Airplay } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const Game: React.FC = () => {
  const {
    state,
    startGame,
    pauseGame,
    crashDrone,
    addPoints,
    activatePowerUp,
    returnToMenu,
    updateSteeringSensitivity
  } = useGameState();

  const [controls, setControls] = useState({
    throttle: 0,
    pitch: 0,
    yaw: 0,
    roll: 0,
    steeringLock: 0
  });

  const isMobile = useIsMobile();
  const [screenShake, setScreenShake] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const coinAudioRef = useRef<HTMLAudioElement | null>(null);
  const powerUpAudioRef = useRef<HTMLAudioElement | null>(null);
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const hasShownControlsToast = useRef<boolean>(false);

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
    
    backgroundMusicRef.current = new Audio();
    backgroundMusicRef.current.src = "https://assets.mixkit.co/active_storage/sfx/2427/2427-preview.mp3"; // Background music
    backgroundMusicRef.current.volume = 0.2;
    backgroundMusicRef.current.loop = true;
    
    return () => {
      // Clean up audio elements
      [audioRef, coinAudioRef, powerUpAudioRef, backgroundMusicRef].forEach(ref => {
        if (ref.current) {
          ref.current.pause();
          ref.current = null;
        }
      });
    };
  }, []);

  // Play or pause background music based on game state
  useEffect(() => {
    if (backgroundMusicRef.current) {
      if (state.status === 'playing') {
        backgroundMusicRef.current.play().catch(e => console.log("Audio play failed:", e));
      } else {
        backgroundMusicRef.current.pause();
      }
    }
  }, [state.status]);

  const handleControlChange = useCallback((newControls: {
    throttle: number;
    pitch: number;
    yaw: number;
    roll: number;
    steeringLock?: number;
  }) => {
    // Only update controls if game is still playing (prevents control after crash)
    if (state.status === 'playing') {
      // Ensure steeringLock is always provided, using current value as fallback
      setControls({
        ...newControls,
        steeringLock: newControls.steeringLock !== undefined ? newControls.steeringLock : controls.steeringLock
      });
    }
  }, [state.status, controls.steeringLock]);

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
    
    // Clear controls to prevent continued movement after crash
    setControls({
      throttle: 0,
      pitch: 0,
      yaw: 0,
      roll: 0,
      steeringLock: 0
    });
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

  // Handle escape key to pause game and Q/E for steering
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Pause game with Escape key
      if (e.key === 'Escape' && state.status === 'playing') {
        pauseGame();
      }
      
      // Add sensitivity adjustment with number keys 1-9
      if (state.status === 'playing' && e.key >= '1' && e.key <= '9') {
        const newSensitivity = parseInt(e.key) / 10;
        updateSteeringSensitivity(newSensitivity);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pauseGame, state.status, updateSteeringSensitivity]);

  // Show mobile controls help toast
  useEffect(() => {
    if (state.status === 'playing' && isMobile && !hasShownControlsToast.current) {
      setTimeout(() => {
        toast({
          title: "Mobile Controls",
          description: "Use left joystick for height and rotation, right joystick for direction.",
          duration: 5000,
        });
        hasShownControlsToast.current = true;
      }, 2000);
    }
    
    // Reset the flag when returning to menu
    if (state.status === 'menu') {
      hasShownControlsToast.current = false;
    }
  }, [state.status, isMobile]);

  // Check if the game is in an active playable state
  const isGameActive = state.status === 'playing';

  // Show steering sensitivity toast on game start - updated for Q/E
  useEffect(() => {
    if (state.status === 'playing' && !isMobile) {
      setTimeout(() => {
        toast({
          title: "Steering Controls Added",
          description: "Use Q/E for quick turns that lock direction. Press 1-9 keys to adjust sensitivity.",
          duration: 5000,
        });
      }, 4000); // Show after the initial game started toast
    }
  }, [state.status, isMobile]);

  return (
    <motion.div 
      className="w-full h-screen overflow-hidden bg-gradient-to-b from-black/20 to-transparent"
      animate={screenShake ? {
        x: [0, -10, 10, -10, 10, 0],
        transition: { duration: 0.5, ease: "easeInOut" }
      } : {}}
    >
      {/* Three.js Scene */}
      <DroneScene
        isPlaying={isGameActive}
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
              className="glass-panel rounded-3xl p-8 max-w-md w-full mx-6 bg-black/60"
            >
              <h2 className="text-3xl font-bold mb-2 text-center text-white flex items-center justify-center">
                <Airplay className="mr-2" size={28} /> Drone Crashed
              </h2>
              <p className="text-gray-300 text-center mb-6">
                Final Score: <span className="text-drone font-bold text-xl">{state.score}</span>
              </p>
              
              <div className="flex flex-col gap-4">
                <button onClick={startGame} className="btn-primary bg-drone hover:bg-drone-light">
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
              className="glass-panel rounded-3xl p-8 max-w-md w-full mx-6 bg-black/60"
            >
              <h2 className="text-3xl font-bold mb-2 text-center text-white">Game Paused</h2>
              <p className="text-gray-300 text-center mb-6">
                Current Score: <span className="text-drone font-bold">{state.score}</span>
              </p>
              
              <div className="flex flex-col gap-4">
                <button onClick={pauseGame} className="btn-primary bg-drone hover:bg-drone-light">
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
      {isGameActive && (
        <GameHUD
          score={state.score}
          highScore={state.highScore}
          powerUp={state.powerUp}
          powerUpTimeRemaining={state.powerUpTimeRemaining}
          onPause={pauseGame}
          onRestart={returnToMenu}
        />
      )}

      {/* Controls - only show when not crashed */}
      {state.status !== 'crashed' && (
        <DroneController 
          onControlChange={handleControlChange} 
          isGameActive={isGameActive}
          steeringSensitivity={state.steeringSensitivity}
        />
      )}
    </motion.div>
  );
};

export default Game;
