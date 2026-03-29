"use client";

import { motion } from "framer-motion";

export default function MedLogo({ className = "", size = 32 }: { className?: string, size?: number }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      {/* Outer Glow */}
      <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full" />
      
      {/* The Medical Link Symbol */}
      <svg 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 w-full h-full"
      >
        {/* The Stylized Plus / Cross */}
        <motion.path 
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          d="M50 20V80M20 50H80" 
          stroke="currentColor" 
          strokeWidth="12" 
          strokeLinecap="round" 
        />
        
        {/* The Connector Links */}
        <motion.path 
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.5, delay: 0.5, ease: "easeInOut" }}
          d="M35 35C25 35 25 25 35 25H65C75 25 75 35 65 35" 
          stroke="currentColor" 
          strokeWidth="6" 
          strokeLinecap="round" 
          className="text-primary/40"
        />
        <motion.path 
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.5, delay: 0.7, ease: "easeInOut" }}
          d="M65 65C75 65 75 75 65 75H35C25 75 25 65 35 65" 
          stroke="currentColor" 
          strokeWidth="6" 
          strokeLinecap="round" 
          className="text-primary/40"
        />

        {/* The Pulse Dot */}
        <motion.circle 
          cx="50" cy="50" r="6" 
          fill="currentColor"
          animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </svg>
    </div>
  );
}
