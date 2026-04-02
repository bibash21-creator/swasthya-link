"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, User, Pill, ArrowRight, Loader2, Store, UserCircle, ShieldCheck, MapPin, Phone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getBaseUrl, joinUrl } from "@/lib/api";

export default function AuthModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<'patient' | 'pharmacy'>('patient');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [authStatus, setAuthStatus] = useState<string | null>(null);
  const [displayOtp, setDisplayOtp] = useState<string | null>(null);
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);

  const handleGetLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast.success("Precision Location Acquired.");
      });
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoading(true);
    try {
      const apiUrl = getBaseUrl();
      const response = await fetch(joinUrl(apiUrl, `auth/verify-otp?email=${email}&code=${otp}`), {
        method: 'POST'
      });
      if (!response.ok) throw new Error("Invalid verification code");
      const data = await response.json();
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("userRole", data.role);
      localStorage.setItem("isLoggedIn", "true");
      onClose();
      window.location.href = data.role === 'admin' ? '/dashboard/admin' : `/dashboard/${data.role}`;
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (showOtp) return handleVerifyOtp(e);
    
    setLoading(true);

    try {
      const apiUrl = getBaseUrl();
      if (tab === 'login') {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const response = await fetch(joinUrl(apiUrl, "auth/login"), {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData.toString(),
        });

        if (!response.ok) throw new Error('Invalid credentials');

        const data = await response.json();
        
        if (data.status === 'otp_required' || data.status === 'verification_required') {
          setAuthStatus(data.status);
          setShowOtp(true);
          // Handle free tier: show OTP in UI if email failed
          if (data.otp) {
            setDisplayOtp(data.otp);
            toast.info(`Your OTP: ${data.otp} (Free tier mode)`);
          }
          return;
        }

        localStorage.setItem("token", data.access_token);
        localStorage.setItem("userRole", data.role);
        localStorage.setItem("isLoggedIn", "true");
        
        onClose();
        window.location.href = data.role === 'admin' ? '/dashboard/admin' : `/dashboard/${data.role}`;
      } else {
        const regUrl = role === 'patient' ? joinUrl(apiUrl, "patients/register") : joinUrl(apiUrl, "pharmacies/register");
        const payload = {
          email,
          password,
          full_name: (document.getElementById("signup_name") as HTMLInputElement)?.value || "",
          name: (document.getElementById("signup_name") as HTMLInputElement)?.value || "",
          address: (document.getElementById("signup_address") as HTMLInputElement)?.value || "Nepal",
          contact_number: (document.getElementById("signup_phone") as HTMLInputElement)?.value || "9800000000",
          latitude: coords?.lat || 27.7,
          longitude: coords?.lng || 85.3
        };

        const response = await fetch(regUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.detail || 'Registration failed');
        }
        
        toast.info("Registration initiated. Verification identity required. Please login to verify.");
        setTab('login');
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Authentication Failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-3xl"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            className="relative w-full max-w-md bg-card border border-border rounded-[3.5rem] shadow-2xl overflow-hidden p-10 pt-20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />
            
            <button onClick={onClose} className="absolute top-10 right-10 p-2 rounded-xl hover:bg-secondary transition-colors z-10 text-muted-foreground"><X size={20} /></button>

            <div className="flex flex-col items-center gap-4 mb-10 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-[2rem] flex items-center justify-center text-primary border border-primary/20">
                {email === "godc7711@gmail.com" ? <ShieldCheck size={32} className="text-rose-500" /> : <Pill size={32} />}
              </div>
              <h2 className="text-4xl font-black tracking-tighter uppercase italic text-foreground">
                {showOtp ? 'Verification' : tab === 'login' ? 'Protocol: In' : 'Protocol: Up'}
              </h2>
              <p className="text-muted-foreground text-[10px] font-mono uppercase tracking-widest leading-none">
                {showOtp ? 'Enter 6-digit Code' : email === "godc7711@gmail.com" ? "Accessing Central Command" : (tab === 'login' ? 'Verify Identity' : 'Create New Account')}
              </p>
            </div>

            {!showOtp && (
              <div className="flex bg-secondary p-1 rounded-2xl mb-8 border border-border">
                  <button onClick={() => setTab('login')} className={`flex-1 py-3 rounded-xl text-[10px] font-mono uppercase tracking-widest transition-all ${tab === 'login' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}>Ident</button>
                  <button onClick={() => setTab('signup')} className={`flex-1 py-3 rounded-xl text-[10px] font-mono uppercase tracking-widest transition-all ${tab === 'signup' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-neutral-500 hover:text-foreground'}`}>Create</button>
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              {showOtp ? (
                <>
                  {displayOtp && (
                    <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-center">
                      <p className="text-[10px] text-amber-600 font-mono uppercase tracking-widest mb-2">Your Verification Code (Free Tier)</p>
                      <p className="text-2xl font-black tracking-[0.5em] text-amber-600">{displayOtp}</p>
                    </div>
                  )}
                  <div className="relative">
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <input type="text" placeholder="6-Digit OTP" value={otp} onChange={(e) => setOtp(e.target.value)} required className="w-full bg-secondary border border-border rounded-2xl pl-12 pr-4 py-4 text-xs font-mono tracking-[1em] focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all text-foreground" />
                  </div>
                </>
              ) : (
                <>
                  {tab === 'signup' && (
                    <>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <button type="button" onClick={() => setRole('patient')} className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${role === 'patient' ? 'bg-primary/10 border-primary text-primary' : 'bg-secondary border-border text-muted-foreground'}`}><UserCircle size={24} /><span className="text-[10px] font-bold uppercase">Patient</span></button>
                        <button type="button" onClick={() => setRole('pharmacy')} className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${role === 'pharmacy' ? 'bg-primary/10 border-primary text-primary' : 'bg-secondary border-border text-muted-foreground'}`}><Store size={24} /><span className="text-[10px] font-bold uppercase">Pharmacy</span></button>
                      </div>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                        <input id="signup_name" type="text" placeholder="Full Name or Shop Name" required className="w-full bg-secondary border border-border rounded-2xl pl-12 pr-4 py-4 text-xs font-mono tracking-widest focus:outline-none focus:ring-1 focus:ring-primary/30 text-foreground" />
                      </div>
                      {role === 'pharmacy' && (
                        <>
                          <div className="relative">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                            <input id="signup_address" type="text" placeholder="Shop Address" required className="w-full bg-secondary border border-border rounded-2xl pl-12 pr-4 py-4 text-xs font-mono tracking-widest focus:outline-none focus:ring-1 focus:ring-primary/30 text-foreground" />
                          </div>
                          <button type="button" onClick={handleGetLocation} className="w-full flex items-center justify-center gap-2 py-3 bg-primary/5 border border-primary/20 rounded-xl text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 transition-all">
                             <MapPin size={12} /> {coords ? `Location Saved (${coords.lat.toFixed(2)}, ${coords.lng.toFixed(2)})` : 'Get Exact Location (GPS)'}
                          </button>
                          <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                            <input id="signup_phone" type="text" placeholder="Contact Number" required className="w-full bg-secondary border border-border rounded-2xl pl-12 pr-4 py-4 text-xs font-mono tracking-widest focus:outline-none focus:ring-1 focus:ring-primary/30 text-foreground" />
                          </div>
                        </>
                      )}
                    </>
                  )}
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <input type="email" placeholder="Registry Key (Email)" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-secondary border border-border rounded-2xl pl-12 pr-4 py-4 text-xs font-mono tracking-widest focus:outline-none focus:ring-1 focus:ring-primary/30 text-foreground" />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <input type="password" placeholder="Cipher (Password)" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full bg-secondary border border-border rounded-2xl pl-12 pr-4 py-4 text-xs font-mono tracking-widest focus:outline-none focus:ring-1 focus:ring-primary/30 text-foreground" />
                  </div>
                </>
              )}

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={loading}
                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:opacity-90 transition-all flex items-center justify-center gap-3 mt-6 ${email === "godc7711@gmail.com" ? "bg-rose-500 text-white shadow-rose-500/20" : "bg-primary text-primary-foreground"}`}
              >
                {loading ? <Loader2 className="animate-spin" /> : <ArrowRight size={18} />}
                {showOtp ? 'Verify OTP' : loading ? 'Authenticating...' : (tab === 'login' ? 'Proceed' : 'Register')}
              </motion.button>
            </form>

            <div className="mt-10 text-center">
              <p className="text-[9px] text-muted-foreground font-mono uppercase tracking-[0.5em] opacity-50">
                Encrypted Connection Stable
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
