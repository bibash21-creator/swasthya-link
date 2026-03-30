"use client";

import Link from "next/link";
import { User, Menu, X, LogOut, Sun, Moon, LayoutDashboard, ShoppingBag } from "lucide-react";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AuthModal from "./AuthModal";
import MedLogo from "./MedLogo";
import AnimatedThemeToggle from "./ui/animated-theme-toggle";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    
    setIsLoggedIn(localStorage.getItem("isLoggedIn") === "true");
    setUserRole(localStorage.getItem("userRole"));
    
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);


  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userRole");
    setIsLoggedIn(false);
    setUserRole(null);
    window.location.href = "/";
  };

  const dashboardPath = userRole ? `/dashboard/${userRole}` : "/";

  return (
    <>
      <nav className={`fixed top-0 w-full z-50 px-6 py-4 flex items-center justify-between transition-all duration-700 ${scrolled ? "bg-background/80 backdrop-blur-3xl border-b border-border py-3 shadow-2xl" : "bg-transparent border-b border-transparent py-6"}`}>
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <Link href="/" className="flex items-center gap-4 group transition-all">
            <MedLogo size={36} className="text-primary" />
            <div className="flex flex-col">
              <span className="text-xl font-black italic tracking-tighter text-foreground uppercase leading-none">MEDCONNECT</span>
              <span className="text-[8px] font-mono text-muted-foreground uppercase tracking-widest leading-none mt-1">Care & Access</span>
            </div>
          </Link>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="hidden lg:flex items-center gap-10 text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground"
        >
          {isLoggedIn ? (
            <>
              {userRole === "admin" ? (
                <Link href="/dashboard/admin" className="text-primary hover:text-foreground font-black tracking-[0.4em] transition-colors border-r border-white/10 pr-10">Admin Panel</Link>
              ) : (
                <>
                  <Link href="/" className="hover:text-foreground transition-colors">Start Search</Link>
                  <Link href="/pharmacies" className="hover:text-foreground transition-colors">Pharmacy List</Link>
                  <Link href="/shop" className="flex items-center gap-2 hover:text-foreground transition-colors">
                    <ShoppingBag size={14} /><span>Shop</span>
                  </Link>
                </>
              )}
              <Link href={dashboardPath} className="flex items-center gap-2 text-primary hover:text-foreground transition-colors group underline underline-offset-8 decoration-primary/30">
                <LayoutDashboard size={14} className="group-hover:rotate-12 transition-transform" />
                <span>Dashboard</span>
              </Link>
            </>
          ) : (
             <span className="text-[8px] opacity-20 tracking-[0.5em] italic">Authorized Access Only</span>
          )}
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <AnimatedThemeToggle />

          {isLoggedIn ? (
            <div className="flex items-center gap-3">
               <motion.div 
                 whileHover={{ scale: 1.05 }}
                 className="hidden md:flex items-center gap-3 bg-secondary/50 border border-border px-4 py-2 rounded-xl cursor-default"
               >
                 <div className="w-6 h-6 bg-primary/20 rounded-lg flex items-center justify-center text-primary uppercase font-black text-[8px]">
                    {userRole?.[0] || <User size={12} />}
                 </div>
                 <span className="text-[10px] font-mono uppercase tracking-widest">{userRole}</span>
               </motion.div>
               
               <motion.button 
                 whileTap={{ scale: 0.95 }}
                 onClick={handleLogout}
                 className="p-2.5 rounded-xl bg-secondary/50 text-muted-foreground hover:text-rose-500 transition-all border border-border"
               >
                 <LogOut size={16} />
               </motion.button>
            </div>
          ) : (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsAuthOpen(true)}
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-primary/10"
            >
              Step In
            </motion.button>
          )}

          <button 
            className="lg:hidden p-2 text-foreground"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </motion.div>
      </nav>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 top-0 pt-24 px-6 bg-background z-40 lg:hidden flex flex-col items-center justify-center text-center gap-12"
          >
            <div className="flex flex-col gap-10 text-[10px] font-mono uppercase tracking-[0.5em] text-muted-foreground">
              {isLoggedIn ? (
                <>
                  {userRole === "admin" && (
                    <Link href="/dashboard/admin" onClick={() => setIsOpen(false)} className="text-primary font-black">Admin Panel</Link>
                  )}
                  <Link href="/" onClick={() => setIsOpen(false)} className="hover:text-foreground">Start Search</Link>
                  <Link href="/pharmacies" onClick={() => setIsOpen(false)} className="hover:text-foreground">Pharmacy List</Link>
                  <Link href="/shop" onClick={() => setIsOpen(false)} className="hover:text-foreground flex items-center justify-center gap-2"><ShoppingBag size={14} />Shop</Link>
                  <Link href={dashboardPath} onClick={() => setIsOpen(false)} className="text-primary font-black">Dashboard</Link>
                </>
              ) : (
                <>
                  <span className="text-[10px] opacity-30 italic">Login to access services</span>
                  <button 
                    onClick={() => {
                      setIsOpen(false);
                      setIsAuthOpen(true);
                    }}
                    className="bg-primary text-primary-foreground py-4 px-10 rounded-full font-black text-xs"
                  >
                    Step In
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
      />
    </>
  );
}
