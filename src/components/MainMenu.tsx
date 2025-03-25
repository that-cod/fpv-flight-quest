
import React from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Shield, Rocket, Magnet, Clock } from 'lucide-react';

interface MainMenuProps {
  highScore: number;
  onStartGame: () => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ highScore, onStartGame }) => {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center z-50 p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <div className="glass-panel rounded-3xl p-8 flex flex-col items-center">
          <motion.h1 
            className="text-4xl md:text-5xl font-bold mb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            <span className="text-gradient">FPV</span> Flight Quest
          </motion.h1>
          
          <motion.p 
            className="text-gray-600 text-center mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            Dive into an immersive drone flight experience
          </motion.p>
          
          {highScore > 0 && (
            <motion.div 
              className="bg-white/50 backdrop-blur-xs px-6 py-3 rounded-full mb-8"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <p className="font-medium">High Score: <span className="text-drone font-bold">{highScore}</span></p>
            </motion.div>
          )}
          
          <motion.div 
            className="w-full flex flex-col gap-4 mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            <Button onClick={onStartGame} className="btn-primary w-full">
              Start Flight
            </Button>
            <Button variant="outline" className="btn-secondary w-full">
              How to Play
            </Button>
          </motion.div>
          
          <motion.div 
            className="w-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            <h3 className="text-sm uppercase tracking-wider text-gray-500 mb-4 text-center">Power-Ups</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="flex flex-col items-center">
                <div className="btn-icon mb-2 text-blue-500">
                  <Shield size={20} />
                </div>
                <span className="text-xs text-gray-600">Shield</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="btn-icon mb-2 text-red-500">
                  <Rocket size={20} />
                </div>
                <span className="text-xs text-gray-600">Speed</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="btn-icon mb-2 text-purple-500">
                  <Magnet size={20} />
                </div>
                <span className="text-xs text-gray-600">Magnet</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="btn-icon mb-2 text-green-500">
                  <Clock size={20} />
                </div>
                <span className="text-xs text-gray-600">Time</span>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default MainMenu;
