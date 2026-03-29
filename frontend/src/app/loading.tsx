"use client";

import { motion } from "framer-motion";
import { Pill } from "lucide-react";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background">
      {/* Background Dots */}
      <div className="absolute inset-0 bg-dot-pattern opacity-[0.05] text-foreground pointer-events-none" />
      
      <div className="relative">
        {/* Outer Glows */}
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1] 
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 -m-20 bg-primary blur-[100px] rounded-full"
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative flex flex-col items-center gap-8"
        >
          <div className="relative">
            {/* Spinning Ring */}
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="w-24 h-24 rounded-full border-4 border-primary/20 border-t-primary"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{ 
                  rotateY: [0, 180, 360],
                  scale: [1, 1.1, 1]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Pill className="text-primary" size={32} />
              </motion.div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <h2 className="text-3xl font-black premium-gradient bg-clip-text text-transparent tracking-tighter">
              MedConnect
            </h2>
            <div className="flex gap-1.5 mt-2">
               {[0, 1, 2].map((i) => (
                 <motion.div 
                   key={i}
                   animate={{ 
                     scale: [1, 1.5, 1],
                     opacity: [0.3, 1, 0.3] 
                   }}
                   transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                   className="w-1.5 h-1.5 rounded-full bg-primary"
                 />
               ))}
            </div>
          </div>
        </motion.div>
      </div>

      <p className="absolute bottom-12 text-muted-foreground font-black text-xs uppercase tracking-[0.4em] opacity-30 animate-pulse">
        Securing your health
      </p>
    </div>
  );
}
