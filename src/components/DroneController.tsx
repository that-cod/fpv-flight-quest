
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronUp, ChevronRight, ChevronDown, ChevronLeft, Airplane } from 'lucide-react';

interface DroneControllerProps {
  onControlChange: (controls: { throttle: number; pitch: number; yaw: number; roll: number }) => void;
}

const DroneController: React.FC<DroneControllerProps> = ({ onControlChange }) => {
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
    ShiftLeft: false
  });

  // Use a ref to prevent creating a new function on each render
  const onControlChangeRef = useRef(onControlChange);
  useEffect(() => {
    onControlChangeRef.current = onControlChange;
  }, [onControlChange]);

  // Handle keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.code;
      if (key in keys) {
        setKeys(prev => ({ ...prev, [key]: true }));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.code;
      if (key in keys) {
        setKeys(prev => ({ ...prev, [key]: false }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [keys]);

  // Update controls based on keyboard or touch input
  useEffect(() => {
    // Convert keyboard input to stick positions
    let newLeftStick = { ...leftStick };
    let newRightStick = { ...rightStick };
    
    const keyboardLeftX = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    const keyboardLeftY = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
    const keyboardRightX = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
    const keyboardRightY = (keys.ArrowUp ? 1 : 0) - (keys.ArrowDown ? 1 : 0);

    // Additional vertical control for throttle using Space and Shift
    const verticalThrottle = (keys.Space ? 1 : 0) - (keys.ShiftLeft ? 1 : 0);

    // Update sticks if keyboard input is present
    if (keyboardLeftX !== 0 || keyboardLeftY !== 0) {
      newLeftStick = { x: keyboardLeftX, y: keyboardLeftY };
    }

    if (keyboardRightX !== 0 || keyboardRightY !== 0) {
      newRightStick = { x: keyboardRightX, y: keyboardRightY };
    }

    // Calculate control values from stick positions
    // Using improved control mapping for more intuitive flight
    const controls = {
      throttle: newLeftStick.y + verticalThrottle, // Up/down movement + Space/Shift for direct up/down
      roll: newLeftStick.x,        // Banking left/right
      pitch: newRightStick.y,      // Forward/backward tilt
      yaw: newRightStick.x         // Turning left/right
    };

    // Use the ref to prevent dependency on onControlChange
    onControlChangeRef.current(controls);
  }, [leftStick, rightStick, keys]);

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
        {/* Controls instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 0.8, y: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute top-[-80px] left-0 right-0 text-center text-white text-sm bg-black/40 backdrop-blur-sm p-2 rounded-lg mx-auto max-w-xs"
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            <Airplane size={16} /> <span>WASD + Arrows: Movement</span>
          </div>
          <div>Space/Shift: Up/Down | Mobile: Use Joysticks</div>
        </motion.div>
        
        {/* Left Stick - Controls throttle and roll */}
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
            Throttle & Roll
          </div>
        </motion.div>

        {/* Right Stick - Controls pitch and yaw */}
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
            Pitch & Yaw
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DroneController;
