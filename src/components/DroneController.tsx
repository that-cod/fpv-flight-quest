import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronUp, ChevronRight, ChevronDown, ChevronLeft, Airplay, RotateCcw, RotateCw } from 'lucide-react';

interface DroneControllerProps {
  onControlChange: (controls: { throttle: number; pitch: number; yaw: number; roll: number; steeringLock?: number }) => void;
  isGameActive: boolean;
  steeringSensitivity?: number;
}

const DroneController: React.FC<DroneControllerProps> = ({ 
  onControlChange, 
  isGameActive,
  steeringSensitivity = 0.5
}) => {
  const [leftStick, setLeftStick] = useState({ x: 0, y: 0 });
  const [rightStick, setRightStick] = useState({ x: 0, y: 0 });
  const [keys, setKeys] = useState({
    ArrowUp: false,
    ArrowRight: false,
    ArrowDown: false,
    ArrowLeft: false,
    KeyW: false,
    KeyD: false,
    KeyS: false,
    KeyA: false,
    Space: false,
    ShiftLeft: false,
    KeyQ: false, // Q for left steering
    KeyE: false  // E for right steering
  });
  
  // Track steering lock state 
  const [steeringLock, setSteeringLock] = useState(0); // 0 = no lock, -1 = left lock, 1 = right lock
  // Add activeSteeringKey to track which key is currently active
  const [activeSteeringKey, setActiveSteeringKey] = useState<'KeyQ' | 'KeyE' | null>(null);

  // Use a ref to prevent creating a new function on each render
  const onControlChangeRef = useRef(onControlChange);
  useEffect(() => {
    onControlChangeRef.current = onControlChange;
  }, [onControlChange]);

  // Handle keyboard controls with improved steering lock logic
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.code;
      if (key in keys) {
        setKeys(prev => ({ ...prev, [key]: true }));
        
        // Improved steering lock logic - only change steering if the key isn't already active
        if (key === 'KeyQ' && activeSteeringKey !== 'KeyQ') {
          setSteeringLock(-1); // Lock steering left
          setActiveSteeringKey('KeyQ');
        } else if (key === 'KeyE' && activeSteeringKey !== 'KeyE') {
          setSteeringLock(1);  // Lock steering right
          setActiveSteeringKey('KeyE');
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.code;
      if (key in keys) {
        setKeys(prev => ({ ...prev, [key]: false }));
        
        // Only clear steering when releasing the active steering key
        if ((key === 'KeyQ' && activeSteeringKey === 'KeyQ') || 
            (key === 'KeyE' && activeSteeringKey === 'KeyE')) {
          // Don't reset steering lock, just clear the active key
          // This ensures the lock stays until the other key is pressed
          setActiveSteeringKey(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [keys, activeSteeringKey]);

  // Update controls based on keyboard or touch input
  useEffect(() => {
    // Only process controls if the game is active
    if (!isGameActive) {
      onControlChangeRef.current({ throttle: 0, pitch: 0, yaw: 0, roll: 0, steeringLock: 0 });
      return;
    }

    // Convert keyboard input to stick positions
    let newLeftStick = { ...leftStick };
    let newRightStick = { ...rightStick };
    
    // Correctly map W/S for forward/backward
    const keyboardLeftX = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    const keyboardLeftY = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0); // W is forward, S is backward
    
    // Make left/right arrows control direction (yaw)
    const keyboardRightX = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
    const keyboardRightY = (keys.ArrowUp ? 1 : 0) - (keys.ArrowDown ? 1 : 0);

    // Additional vertical control for throttle using Space and Shift
    const verticalThrottle = (keys.Space ? 1 : 0) - (keys.ShiftLeft ? 1 : 0);
    
    // Apply sensitivity factor to make steering more or less responsive
    const steeringFactor = 3.0 * (steeringSensitivity || 0.5);
    
    // Only apply Q/E steering if they're the active keys
    // This fixes the issue of continuous rotation when buttons are pressed simultaneously
    const qeSteering = (activeSteeringKey === 'KeyE' ? 1 : 0) - (activeSteeringKey === 'KeyQ' ? 1 : 0);
    
    // Update sticks if keyboard input is present
    if (keyboardLeftX !== 0 || keyboardLeftY !== 0) {
      newLeftStick = { x: keyboardLeftX, y: keyboardLeftY };
    }

    if (keyboardRightX !== 0 || keyboardRightY !== 0) {
      newRightStick = { x: keyboardRightX, y: keyboardRightY };
    }

    // Calculate control values from stick positions
    // Add the QE steering to the yaw control for direct control with the steering lock applied
    const controls = {
      throttle: verticalThrottle, // Space/Shift for up/down
      pitch: newLeftStick.y,      // W/S for forward/backward
      yaw: newRightStick.x + (qeSteering * steeringFactor), // Include Q/E steering with sensitivity
      roll: newLeftStick.x,       // A/D for banking left/right
      steeringLock: steeringLock  // Pass the steering lock state
    };

    // Use the ref to prevent dependency on onControlChange
    onControlChangeRef.current(controls);
  }, [leftStick, rightStick, keys, isGameActive, steeringSensitivity, steeringLock, activeSteeringKey]);

  const handleLeftStickMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const stick = document.getElementById('left-stick');
    if (!stick) return;
    
    const rect = stick.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Calculate distance from center (as a value between -1 and 1)
    let x = (clientX - centerX) / (rect.width / 2);
    let y = -(clientY - centerY) / (rect.height / 2); // Invert Y axis
    
    // Clamp values between -1 and 1
    x = Math.max(-1, Math.min(1, x));
    y = Math.max(-1, Math.min(1, y));
    
    setLeftStick({ x, y });
  }, []);

  const handleRightStickMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const stick = document.getElementById('right-stick');
    if (!stick) return;
    
    const rect = stick.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Calculate distance from center (as a value between -1 and 1)
    let x = (clientX - centerX) / (rect.width / 2);
    let y = -(clientY - centerY) / (rect.height / 2); // Invert Y axis
    
    // Clamp values between -1 and 1
    x = Math.max(-1, Math.min(1, x));
    y = Math.max(-1, Math.min(1, y));
    
    setRightStick({ x, y });
  }, []);

  const handleStickRelease = useCallback(() => {
    // Reset stick positions when touch/mouse is released
    setLeftStick({ x: 0, y: 0 });
    setRightStick({ x: 0, y: 0 });
  }, []);

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 p-6 pointer-events-none">
      <div className="max-w-5xl mx-auto flex justify-between items-center">
        {/* Controls instructions - Updated for clarity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 0.8, y: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute top-[-80px] left-0 right-0 text-center text-white text-sm bg-black/40 backdrop-blur-sm p-2 rounded-lg mx-auto max-w-xs"
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            <Airplay size={16} /> <span>W/S: Forward/Back | A/D: Roll</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <RotateCcw size={14} className="text-drone mr-0.5" /> 
            <span>Q/E: Steer & Lock | Arrows: Turn | Space/Shift: Up/Down</span>
            <RotateCw size={14} className="text-drone ml-0.5" />
          </div>
        </motion.div>
        
        {/* Left Stick - Controls pitch and roll */}
        <motion.div 
          id="left-stick"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 0.9, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-28 h-28 bg-black/50 backdrop-blur-sm rounded-full relative pointer-events-auto border border-white/20 shadow-xl"
          onMouseDown={(e) => {
            e.preventDefault();
            handleLeftStickMove(e);
            document.addEventListener('mousemove', handleLeftStickMove as any);
            document.addEventListener('mouseup', () => {
              handleStickRelease();
              document.removeEventListener('mousemove', handleLeftStickMove as any);
            }, { once: true });
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            handleLeftStickMove(e);
            document.addEventListener('touchmove', handleLeftStickMove as any);
            document.addEventListener('touchend', () => {
              handleStickRelease();
              document.removeEventListener('touchmove', handleLeftStickMove as any);
            }, { once: true });
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <ChevronUp 
              size={20} 
              className={`absolute top-3 text-white transition-opacity ${leftStick.y > 0.3 ? 'opacity-100' : 'opacity-40'}`} 
            />
            <ChevronRight 
              size={20} 
              className={`absolute right-3 text-white transition-opacity ${leftStick.x > 0.3 ? 'opacity-100' : 'opacity-40'}`} 
            />
            <ChevronDown 
              size={20} 
              className={`absolute bottom-3 text-white transition-opacity ${leftStick.y < -0.3 ? 'opacity-100' : 'opacity-40'}`} 
            />
            <ChevronLeft 
              size={20} 
              className={`absolute left-3 text-white transition-opacity ${leftStick.x < -0.3 ? 'opacity-100' : 'opacity-40'}`} 
            />
          </div>
          <motion.div 
            className="w-12 h-12 bg-drone rounded-full absolute top-1/2 left-1/2 shadow-lg flex items-center justify-center text-white font-medium text-sm"
            style={{
              x: `calc(${leftStick.x} * 38px)`,
              y: `calc(${-leftStick.y} * 38px)`,
            }}
          >
            L
          </motion.div>
          <div className="absolute -top-6 left-0 right-0 text-center text-white/90 text-xs">
            Forward/Back & Roll
          </div>
        </motion.div>

        {/* Right Stick - Controls yaw */}
        <motion.div 
          id="right-stick"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 0.9, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-28 h-28 bg-black/50 backdrop-blur-sm rounded-full relative pointer-events-auto border border-white/20 shadow-xl"
          onMouseDown={(e) => {
            e.preventDefault();
            handleRightStickMove(e);
            document.addEventListener('mousemove', handleRightStickMove as any);
            document.addEventListener('mouseup', () => {
              handleStickRelease();
              document.removeEventListener('mousemove', handleRightStickMove as any);
            }, { once: true });
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            handleRightStickMove(e);
            document.addEventListener('touchmove', handleRightStickMove as any);
            document.addEventListener('touchend', () => {
              handleStickRelease();
              document.removeEventListener('touchmove', handleRightStickMove as any);
            }, { once: true });
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <ChevronUp 
              size={20} 
              className={`absolute top-3 text-white transition-opacity ${rightStick.y > 0.3 ? 'opacity-100' : 'opacity-40'}`} 
            />
            <ChevronRight 
              size={20} 
              className={`absolute right-3 text-white transition-opacity ${rightStick.x > 0.3 ? 'opacity-100' : 'opacity-40'}`} 
            />
            <ChevronDown 
              size={20} 
              className={`absolute bottom-3 text-white transition-opacity ${rightStick.y < -0.3 ? 'opacity-100' : 'opacity-40'}`} 
            />
            <ChevronLeft 
              size={20} 
              className={`absolute left-3 text-white transition-opacity ${rightStick.x < -0.3 ? 'opacity-100' : 'opacity-40'}`} 
            />
          </div>
          <motion.div 
            className="w-12 h-12 bg-drone rounded-full absolute top-1/2 left-1/2 shadow-lg flex items-center justify-center text-white font-medium text-sm"
            style={{
              x: `calc(${rightStick.x} * 38px)`,
              y: `calc(${-rightStick.y} * 38px)`,
            }}
          >
            R
          </motion.div>
          <div className="absolute -top-6 left-0 right-0 text-center text-white/90 text-xs">
            Turn Direction
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DroneController;
