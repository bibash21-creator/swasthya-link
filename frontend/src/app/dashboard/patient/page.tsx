"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  Camera, Clock, CheckCircle, MapPin, Search, 
  History, Calendar, Pill, Plus, ArrowRight, Loader2,
  Phone, Truck, Navigation, ExternalLink, Activity, Package, ShoppingBag, CreditCard
} from "lucide-react";
import PrescriptionUpload from "@/components/PrescriptionUpload";
import ServiceForm from "@/components/ServiceForm";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function PatientDashboard() {
  const [activeTab, setActiveTab] = useState<'track' | 'upload' | 'service' | 'orders'>('track');
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [coords, setCoords] = useState<{ lat: number, lon: number } | null>(null);

  const fetchPrescriptions = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      const patientId = payload.id;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
      const response = await fetch(`${apiUrl}/prescriptions/patient/${patientId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        const withMatches = await Promise.all(data.map(async (p: any) => {
          if (p.status === 'verified') {
            const mRes = await fetch(`${apiUrl}/prescriptions/${p.id}/matches`, {
              headers: { "Authorization": `Bearer ${token}` }
            });
            if (mRes.ok) {
                const matches = await mRes.json();
                return { ...p, matches };
            }
          }
          return { ...p, matches: [] };
        }));
        setPrescriptions(withMatches);
      }
    } catch (error) {
      console.error("Error fetching prescriptions:", error);
    } 
  };

  const fetchOrders = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
      const response = await fetch(`${apiUrl}/orders/my-orders`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) setOrders(await response.json());
    } catch (e) {
      console.error("Error fetching orders:", e);
    }
  };

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    const userRole = localStorage.getItem("userRole");
    const token = localStorage.getItem("token");

    if (!isLoggedIn || userRole !== 'patient' || !token) {
      window.location.href = "/";
      return;
    }

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      });
    }

    const loadAll = async () => {
      setIsLoading(true);
      await Promise.all([fetchPrescriptions(), fetchOrders()]);
      setIsLoading(false);
    };
    loadAll();

    const interval = setInterval(() => {
      fetchPrescriptions();
      fetchOrders();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground pt-28 pb-20 px-6 transition-colors duration-500 font-mono">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
           <div>
              <div className="flex items-center gap-3 mb-2">
                 <div className={`w-2 h-2 rounded-full ${coords ? 'bg-green-500 pulse' : 'bg-primary'}`} />
                 <span className="text-[10px] text-primary uppercase tracking-[0.4em] font-black">
                   {coords ? "Active Position Lock" : "Patient Portal Gateway"}
                 </span>
              </div>
              <h1 className="text-5xl font-black italic uppercase tracking-tighter">My Care <span className="text-primary italic">Center</span></h1>
           </div>
           
           <div className="flex flex-wrap bg-secondary p-1 rounded-2xl border border-border">
              {(['track', 'orders', 'upload', 'service'] as const).map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {tab}
                </button>
              ))}
           </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
           <div className="lg:col-span-8 space-y-8">
              <AnimatePresence mode="wait">
                {activeTab === 'track' ? (
                  <motion.div 
                    key="track"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                     <h2 className="text-xl font-black italic uppercase tracking-tighter mb-4 px-2">Active Transmissions</h2>
                     
                     {isLoading ? (
                       <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
                          <Loader2 className="animate-spin text-primary" size={32} />
                          <p className="text-[10px] font-mono uppercase tracking-widest">Syncing Registry...</p>
                       </div>
                     ) : prescriptions.length === 0 ? (
                       <div className="bg-card border border-border p-12 rounded-[2.5rem] text-center space-y-6">
                          <p className="text-muted-foreground font-medium uppercase tracking-[0.2em] text-[10px]">No active medicine requests found.</p>
                          <button onClick={() => setActiveTab('upload')} className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg">Initiate Scan</button>
                       </div>
                     ) : (
                       prescriptions.map((p) => (
                         <RequestCard 
                           key={p.id}
                           id={`REQ-${p.id}`} 
                           date={new Date(p.created_at).toLocaleDateString()} 
                           status={p.status} 
                           items={p.info_json?.medicines?.join(', ') || p.info_json?.medicine || p.info_json?.filename || "Medicine List"} 
                           matches={p.matches}
                         />
                       ))
                     )}
                  </motion.div>
                ) : activeTab === 'orders' ? (
                  <motion.div 
                    key="orders"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                     <h2 className="text-xl font-black italic uppercase tracking-tighter mb-4 px-2">Order History</h2>
                     
                     {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-50"><Loader2 className="animate-spin text-primary" size={32} /></div>
                     ) : orders.length === 0 ? (
                       <div className="bg-card border border-border p-12 rounded-[2.5rem] text-center">
                          <p className="text-muted-foreground font-black uppercase text-[10px] mb-4">No e-commerce orders yet.</p>
                          <Link href="/shop" className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg inline-block">Visit Shop</Link>
                       </div>
                     ) : (
                       orders.map((o) => (
                         <OrderCard key={o.id} order={o} />
                       ))
                     )}
                  </motion.div>
                ) : activeTab === 'upload' ? (
                  <motion.div 
                    key="upload"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-card border border-border rounded-[3rem] shadow-xl overflow-hidden relative"
                  >
                     <PrescriptionUpload coords={coords} />
                  </motion.div>
                ) : (
                  <motion.div 
                    key="service"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-card border border-border rounded-[3rem] shadow-xl overflow-hidden relative"
                  >
                     <ServiceForm coords={coords} />
                  </motion.div>
                )}
              </AnimatePresence>
           </div>

           <div className="lg:col-span-4 space-y-8">
              <div className="bg-primary p-10 rounded-[3rem] text-primary-foreground shadow-2xl relative overflow-hidden group">
                 <div className="relative z-10">
                    <h3 className="text-xl font-black italic uppercase tracking-tight mb-2">GPS Active</h3>
                    <p className="text-sm opacity-80 mb-8 font-medium">Your current sector is being monitored for local support.</p>
                    <Link href="/pharmacies" className="bg-white text-black px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-neutral-100 transition-all inline-block">Proximity Map</Link>
                 </div>
                 <MapPin className="absolute -bottom-10 -right-10 w-40 h-40 opacity-10 group-hover:scale-110 transition-transform" />
              </div>

              <div className="bg-card border border-border rounded-[3rem] p-10 shadow-lg">
                 <h3 className="text-lg font-black uppercase tracking-tighter italic mb-8 border-b border-border pb-4">Status Terminal</h3>
                 <div className="space-y-6">
                    <div className="flex items-center gap-4">
                       <CheckCircle size={24} className="text-green-500" />
                       <div>
                          <p className="text-[10px] font-black uppercase tracking-tight">Identity Token</p>
                          <p className="text-[10px] text-muted-foreground font-mono">VERIFIED_BIO_P1</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-4 opacity-50">
                       <History size={24} />
                       <div>
                          <p className="text-[10px] font-black uppercase tracking-tight">Last Activity</p>
                          <p className="text-[10px] text-muted-foreground font-mono">JUST NOW</p>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function OrderCard({ order }: any) {
  return (
    <div className="bg-card border border-border p-8 rounded-[2.5rem] shadow-md border-dashed">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
         <div className="flex gap-6 items-center">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-secondary text-primary`}>
               <Package size={24} />
            </div>
            <div>
               <div className="flex items-center gap-3 mb-1">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">ORDER #{order.id}</span>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded bg-primary/10 text-primary`}>{order.status}</span>
               </div>
               <h4 className="text-xl font-black italic tracking-tighter uppercase">Order Total: रू {order.total_amount}</h4>
               <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{new Date(order.created_at).toLocaleDateString()} • {order.payment_method.toUpperCase()}</p>
            </div>
         </div>
         <div className="flex flex-wrap gap-2 md:justify-end">
            <div className={`px-4 py-2 rounded-xl border border-border flex items-center gap-2 bg-secondary/30`}>
              <Activity size={12} className="text-primary" />
              <span className="text-[8px] font-black uppercase tracking-widest">{order.payment_status}</span>
            </div>
         </div>
       </div>
    </div>
  );
}

function RequestCard({ id, date, status, items, matches }: any) {
   const isVerified = status === 'verified';
   const isDeclined = status === 'declined';
   const [showMatches, setShowMatches] = useState(false);

   return (
      <motion.div 
        layout
        className="bg-card border border-border p-8 rounded-[2.5rem] flex flex-col gap-8 shadow-md group hover:border-primary/30 transition-all border-dashed"
      >
         <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex gap-6 items-center">
               <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isVerified ? 'bg-green-500/10 text-green-500' : isDeclined ? 'bg-rose-500/10 text-rose-500' : 'bg-primary/10 text-primary animate-pulse'}`}>
                  {isVerified ? <CheckCircle size={24} /> : isDeclined ? <Plus className="rotate-45" size={24} /> : <Clock size={24} />}
               </div>
               <div>
                  <div className="flex items-center gap-3 mb-1">
                     <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">ID: {id}</span>
                     <span className={`text-[10px] font-black uppercase px-2 rounded ${isVerified ? 'text-green-500 bg-green-500/5' : isDeclined ? 'text-rose-500 bg-rose-500/5' : 'text-primary bg-primary/5'}`}>{status}</span>
                  </div>
                  <h4 className="text-xl font-black italic tracking-tighter uppercase">{isVerified ? (matches.length > 0 ? `${matches.length} Proximate Matches` : "Verified • Checking Proximity") : (isDeclined ? "Access Denied" : "Request Propagation")}</h4>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{date}</p>
               </div>
            </div>
            <div className="text-right flex flex-col items-center md:items-end gap-3 shrink-0 max-w-[300px]">
               <p className="text-[10px] font-black italic text-muted-foreground uppercase tracking-widest truncate w-full text-center md:text-right">{items}</p>
               {isVerified && matches.length > 0 && (
                  <button 
                    onClick={() => setShowMatches(!showMatches)}
                    className="bg-foreground text-background px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:opacity-90 flex items-center gap-2"
                  >
                    Locate Stock <ArrowRight size={14} className={showMatches ? 'rotate-90' : ''} />
                  </button>
               )}
            </div>
         </div>

         <AnimatePresence>
            {showMatches && isVerified && matches.length > 0 && (
               <motion.div 
                 initial={{ height: 0, opacity: 0 }}
                 animate={{ height: 'auto', opacity: 1 }}
                 exit={{ height: 0, opacity: 0 }}
                 className="overflow-hidden border-t border-border pt-8 space-y-4"
               >
                  <p className="text-[10px] font-mono uppercase tracking-[0.3em] font-black mb-4">Nearby Providers Found:</p>
                  <div className="grid md:grid-cols-2 gap-4">
                     {matches.map((match: any) => (
                        <div key={match.id} className="bg-secondary/20 p-6 rounded-3xl border border-border group/match hover:border-primary/50 transition-all relative">
                           {match.distance_km < 1 && (
                             <span className="absolute -top-2 -right-2 bg-green-500 text-white text-[8px] px-2 py-1 rounded-lg font-black uppercase animate-bounce">Nearest</span>
                           )}
                           <div className="flex justify-between items-start mb-4">
                              <div>
                                 <h5 className="text-sm font-black uppercase tracking-tighter">{match.name}</h5>
                                 <p className="text-[8px] font-mono text-muted-foreground uppercase tracking-widest">{match.address}</p>
                                 <p className="text-[10px] font-black text-primary mt-1">{match.distance_km} KM AWAY</p>
                              </div>
                              <div className="text-right">
                                 <p className="text-[10px] font-black text-primary">रू {match.total_price_estimate}</p>
                                 <p className="text-[8px] font-mono uppercase text-muted-foreground">Est. Value</p>
                              </div>
                           </div>
                           <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
                              {match.matched_medicines.map((med: string) => (
                                 <span key={med} className="text-[8px] whitespace-nowrap font-black uppercase bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/10">
                                    {med}
                                 </span>
                              ))}
                           </div>
                           <div className="flex gap-2">
                              <button className="flex-1 bg-white text-black py-2 rounded-xl text-[8px] font-black uppercase flex items-center justify-center gap-2 shadow-sm hover:bg-neutral-100 transition-all border border-border">
                                 <Navigation size={12} /> Directions
                              </button>
                              <button className="flex-1 bg-primary text-primary-foreground py-2 rounded-xl text-[8px] font-black uppercase flex items-center justify-center gap-2 shadow-lg hover:opacity-90 transition-all">
                                 <Truck size={12} /> Express Delivery
                              </button>
                           </div>
                        </div>
                     ))}
                  </div>
               </motion.div>
            )}
         </AnimatePresence>
      </motion.div>
   );
}
