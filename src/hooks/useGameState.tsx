
import { useState, useCallback, useEffect } from 'react';

export type GameStatus = 'menu' | 'playing' | 'crashed' | 'paused';
export type PowerUpType = 'shield' | 'speed' | 'magnet' | 'timeFreeze' | null;

interface GameState {
  status: GameStatus;
  score: number;
  highScore: number;
  powerUp: PowerUpType;
  powerUpTimeRemaining: number;
}

export const useGameState = () => {
  const [state, setState] = useState<GameState>({
    status: 'menu',
    score: 0,
    highScore: 0,
    powerUp: null,
    powerUpTimeRemaining: 0,
  });

  // Load high score from localStorage on mount
  useEffect(() => {
    const savedHighScore = localStorage.getItem('droneGameHighScore');
    if (savedHighScore) {
      setState(prev => ({ ...prev, highScore: parseInt(savedHighScore, 10) }));
    }
  }, []);

  // Save high score to localStorage when it changes
  useEffect(() => {
    if (state.highScore > 0) {
      localStorage.setItem('droneGameHighScore', state.highScore.toString());
    }
  }, [state.highScore]);

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

  return {
    state,
    startGame,
    pauseGame,
    crashDrone,
    addPoints,
    activatePowerUp,
    returnToMenu
  };
};
