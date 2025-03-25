import { useState, useCallback, useEffect } from 'react';
import { toast } from "@/hooks/use-toast";

export type GameStatus = 'menu' | 'playing' | 'crashed' | 'paused';
export type PowerUpType = 'shield' | 'speed' | 'magnet' | 'timeFreeze' | null;

interface GameState {
  status: GameStatus;
  score: number;
  highScore: number;
  powerUp: PowerUpType;
  powerUpTimeRemaining: number;
  steeringSensitivity: number; // Added for steering sensitivity
}

export const useGameState = () => {
  const [state, setState] = useState<GameState>({
    status: 'menu',
    score: 0,
    highScore: 0,
    powerUp: null,
    powerUpTimeRemaining: 0,
    steeringSensitivity: 0.5, // Default sensitivity (0.1 to 1.0 range)
  });

  // Load high score from localStorage on mount
  useEffect(() => {
    const savedHighScore = localStorage.getItem('droneGameHighScore');
    if (savedHighScore) {
      setState(prev => ({ ...prev, highScore: parseInt(savedHighScore, 10) }));
    }
    
    // Load steering sensitivity if saved
    const savedSensitivity = localStorage.getItem('droneSteeringSensitivity');
    if (savedSensitivity) {
      setState(prev => ({ ...prev, steeringSensitivity: parseFloat(savedSensitivity) }));
    }
  }, []);

  // Save high score to localStorage when it changes
  useEffect(() => {
    if (state.highScore > 0) {
      localStorage.setItem('droneGameHighScore', state.highScore.toString());
    }
  }, [state.highScore]);
  
  // Save sensitivity setting when it changes
  useEffect(() => {
    localStorage.setItem('droneSteeringSensitivity', state.steeringSensitivity.toString());
  }, [state.steeringSensitivity]);

  // Power-up countdown effect
  useEffect(() => {
    let timer: number | undefined;
    
    if (state.powerUp && state.powerUpTimeRemaining > 0 && state.status === 'playing') {
      timer = window.setInterval(() => {
        setState(prev => {
          const newTimeRemaining = prev.powerUpTimeRemaining - 1;
          
          if (newTimeRemaining <= 0) {
            return {
              ...prev,
              powerUp: null,
              powerUpTimeRemaining: 0
            };
          }
          
          return {
            ...prev,
            powerUpTimeRemaining: newTimeRemaining
          };
        });
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [state.powerUp, state.powerUpTimeRemaining, state.status]);

  // Start game
  const startGame = useCallback(() => {
    setState(prev => ({
      ...prev,
      status: 'playing',
      score: 0,
      powerUp: null,
      powerUpTimeRemaining: 0
    }));
    
    // Show start game toast
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      toast({
        title: "Game Started!",
        description: "Use the joysticks to control your drone.",
        duration: 3000,
      });
    } else {
      toast({
        title: "Game Started!",
        description: "WASD + Arrow Keys to control. Space/Shift for up/down.",
        duration: 3000,
      });
    }
  }, []);

  // Pause game
  const pauseGame = useCallback(() => {
    setState(prev => ({
      ...prev,
      status: prev.status === 'playing' ? 'paused' : 'playing'
    }));
  }, []);

  // Crash handling
  const crashDrone = useCallback(() => {
    setState(prev => {
      // If we have a shield power-up, use it instead of crashing
      if (prev.powerUp === 'shield') {
        toast({
          title: "Shield Activated!",
          description: "Your shield protected you from the crash.",
          duration: 3000,
        });
        
        return {
          ...prev,
          powerUp: null,
          powerUpTimeRemaining: 0
        };
      }
      
      // Update high score if current score is higher
      const newHighScore = prev.score > prev.highScore ? prev.score : prev.highScore;
      
      return {
        ...prev,
        status: 'crashed',
        highScore: newHighScore
      };
    });
  }, []);

  // Update score
  const addPoints = useCallback((points: number) => {
    setState(prev => {
      const newScore = prev.score + points;
      const newHighScore = newScore > prev.highScore ? newScore : prev.highScore;
      
      // Check if player just beat the high score
      if (newScore > prev.highScore && prev.score <= prev.highScore && prev.highScore > 0) {
        toast({
          title: "New High Score!",
          description: `You beat your previous record of ${prev.highScore}!`,
          duration: 3000,
        });
      }
      
      return {
        ...prev,
        score: newScore,
        highScore: newHighScore
      };
    });
  }, []);

  // Activate power-up
  const activatePowerUp = useCallback((type: PowerUpType, duration: number) => {
    setState(prev => ({
      ...prev,
      powerUp: type,
      powerUpTimeRemaining: duration
    }));
  }, []);

  // Return to menu
  const returnToMenu = useCallback(() => {
    setState(prev => ({
      ...prev,
      status: 'menu'
    }));
  }, []);
  
  // Update steering sensitivity
  const updateSteeringSensitivity = useCallback((value: number) => {
    // Ensure sensitivity is between 0.1 (slow) and 1.0 (fast)
    const newSensitivity = Math.max(0.1, Math.min(1.0, value));
    setState(prev => ({
      ...prev,
      steeringSensitivity: newSensitivity
    }));
    
    toast({
      title: "Steering Sensitivity Updated",
      description: `Sensitivity set to ${Math.round(newSensitivity * 100)}%`,
      duration: 2000,
    });
  }, []);

  return {
    state,
    startGame,
    pauseGame,
    crashDrone,
    addPoints,
    activatePowerUp,
    returnToMenu,
    updateSteeringSensitivity
  };
};
