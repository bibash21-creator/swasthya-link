"use client";

import { useState, useMemo, useCallback, memo, useEffect } from "react";
import dynamic from "next/dynamic";
import { Search, MapPin, Navigation, Phone, Clock, ChevronRight, Shield, Star, Send } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const PharmacyMap = dynamic(() => import("@/components/PharmacyMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-secondary animate-pulse rounded-3xl" />,
});

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
};

const staggerContainer = {
  initial: {},
  animate: { transition: { staggerChildren: 0.1 } }
};

export default function PharmaciesPage() {
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPharmacy, setSelectedPharmacy] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchPharmacies = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
        const response = await fetch(`${apiUrl}/pharmacies/`);
        const data = await response.json();
        setPharmacies(data);
        if (data.length > 0) setSelectedPharmacy(data[0]);
      } catch (error) {
        console.error("Error fetching pharmacies:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPharmacies();
  }, []);

  const filteredPharmacies = useMemo(() => {
    return pharmacies.filter(p =>
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.address?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, pharmacies]);

  const handleReviewSubmit = async () => {
    if (!selectedPharmacy || !comment.trim()) return;
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please login as a patient to post reviews.");
      return;
    }

    setIsSubmitting(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
      const response = await fetch(`${apiUrl}/pharmacies/${selectedPharmacy.id}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          pharmacy_id: selectedPharmacy.id,
          rating,
          comment
        })
      });

      if (!response.ok) throw new Error("Failed to post review");
      
      setComment("");
      setRating(5);
      toast.success("Thank you! Your review has been posted.");
    } catch (error) {
      console.error("Error posting review:", error);
      toast.error("Failed to post review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="pt-24 min-h-screen bg-background px-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground font-mono text-sm uppercase tracking-widest">Loading Pharmacies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 min-h-screen bg-background px-6 pb-12 font-mono">
      <div className="max-w-7xl mx-auto h-[calc(100vh-160px)] grid lg:grid-cols-3 gap-8">
        
        {/* Left Sidebar: Search and List */}
        <div className="lg:col-span-1 flex flex-col gap-4 h-full overflow-hidden">
          {/* Header */}
          <div className="flex-shrink-0">
            <p className="text-[9px] text-primary font-black uppercase tracking-[0.4em] mb-1">{pharmacies.length} Registered</p>
            <h1 className="text-2xl font-black italic uppercase tracking-tighter mb-4">Pharmacies</h1>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input
                type="text"
                placeholder="Search by name or area..."
                className="w-full bg-card border border-border rounded-2xl pl-10 pr-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* List */}
          <motion.div 
            className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {filteredPharmacies.length > 0 ? (
              filteredPharmacies.map((pharmacy, i) => (
                <motion.div key={pharmacy.id} variants={fadeInUp}>
                  <PharmacyCard
                    pharmacy={pharmacy}
                    index={i}
                    isSelected={selectedPharmacy?.id === pharmacy.id}
                    onClick={() => setSelectedPharmacy(pharmacy)}
                  />
                </motion.div>
              ))
            ) : (
              <div className="text-muted-foreground text-center py-16 italic text-sm">
                {pharmacies.length === 0
                  ? "No pharmacies registered yet. Register a pharmacy to appear here."
                  : "No pharmacies match your search."}
              </div>
            )}
          </motion.div>
        </div>

        {/* Right Section: Map and Details */}
        <div className="lg:col-span-2 flex flex-col gap-4 h-full">
          <div className="flex-1 min-h-[400px]">
             <PharmacyMap pharmacies={pharmacies} onSelect={setSelectedPharmacy} />
          </div>

          {/* Selected Pharmacy Details Card */}
          {selectedPharmacy && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              key={selectedPharmacy.id}
              className="bg-card/80 backdrop-blur-xl p-5 rounded-3xl border border-border shadow-xl"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground shrink-0 shadow-lg">
                    <PharmacyIcon />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tighter">{selectedPharmacy.name}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <MapPin size={12} />
                      {selectedPharmacy.address || "Kathmandu, Nepal"}
                    </p>
                    {selectedPharmacy.contact_number && (
                      <p className="text-[10px] text-primary font-mono mt-1 flex items-center gap-1.5">
                        <Phone size={10} />
                        {selectedPharmacy.contact_number}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  {selectedPharmacy.contact_number && (
                    <motion.a
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      href={`tel:${selectedPharmacy.contact_number}`}
                      className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-foreground px-5 py-3 rounded-xl transition-all font-bold text-sm border border-border"
                    >
                      <Phone size={16} />
                      Call Now
                    </motion.a>
                  )}
                  <motion.a
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    href={`https://www.google.com/maps/search/?api=1&query=${selectedPharmacy.latitude},${selectedPharmacy.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-primary hover:opacity-90 text-primary-foreground px-6 py-3 rounded-xl transition-all font-bold text-sm shadow-lg shadow-primary/20"
                  >
                    <Navigation size={16} />
                    Directions
                  </motion.a>
                </div>
              </div>

              {/* Review Section */}
              <div className="mt-8 pt-8 border-t border-white/5">
                <div className="flex items-center justify-between mb-6">
                   <h4 className="text-sm font-black uppercase tracking-widest text-white/60 flex items-center gap-2">
                     <Star size={14} className="text-primary fill-primary" />
                     Post a Review
                   </h4>
                   <div className="flex gap-1">
                      {[1,2,3,4,5].map(star => (
                        <motion.button 
                          key={star} 
                          whileHover={{ scale: 1.2 }}
                          whileTap={{ scale: 0.8 }}
                          onClick={() => setRating(star)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${rating >= star ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-white/5 text-white/20 border border-white/5'}`}
                        >
                          <Star size={14} className={rating >= star ? 'fill-primary' : ''} />
                        </motion.button>
                      ))}
                   </div>
                </div>
                <div className="flex gap-3">
                  <textarea 
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Tell the community about your experience..."
                    className="flex-1 bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40 transition-all min-h-[80px]"
                  />
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleReviewSubmit}
                    disabled={isSubmitting || !comment.trim()}
                    className="bg-primary hover:opacity-95 text-primary-foreground px-6 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 disabled:opacity-30 transition-all"
                  >
                    {isSubmitting ? '...' : <Send size={16} />}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

/* Beautiful Pharmacy List Card */
const ACCENT_COLORS = [
  { bg: "bg-violet-500/10", text: "text-violet-500", border: "border-violet-500/20" },
  { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/20" },
  { bg: "bg-rose-500/10", text: "text-rose-500", border: "border-rose-500/20" },
  { bg: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/20" },
  { bg: "bg-cyan-500/10", text: "text-cyan-500", border: "border-cyan-500/20" },
];

const RadarBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity duration-700">
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] aspect-square">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/20"
          style={{
            width: `${(i + 1) * 25}%`,
            height: `${(i + 1) * 25}%`,
          }}
        />
      ))}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="absolute top-1/2 left-1/2 w-full h-full -translate-x-1/2 -translate-y-1/2 origin-center"
        style={{
          background: "conic-gradient(from 0deg, transparent 0%, rgba(var(--primary-rgb), 0.15) 10%, transparent 20%)"
        }}
      />
    </div>
  </div>
);

const PharmacyCard = memo(({ pharmacy, isSelected, onClick, index }: any) => {
  const accent = ACCENT_COLORS[index % ACCENT_COLORS.length];
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.5 }}
      whileHover={{ scale: 1.02, y: -2 }}
      onClick={onClick}
      className={`group relative rounded-[2rem] overflow-hidden cursor-pointer transition-all duration-300 border ${
        isSelected
          ? "border-primary/50 shadow-xl shadow-primary/10"
          : "border-white/10 hover:border-white/20"
      }`}
    >
      {/* Glass Background */}
      <div className={`absolute inset-0 backdrop-blur-3xl ${isSelected ? 'bg-primary/10' : 'bg-white/[0.03]'}`} />
      
      {/* Radar Effect */}
      <RadarBackground />

      {/* Decorative Glow Orb */}
      <div className={`absolute -top-10 -right-10 w-24 h-24 rounded-full blur-3xl opacity-30 pointer-events-none ${accent.bg}`} />

      {/* Top Accent Strip */}
      <div className={`relative h-1 w-full bg-gradient-to-r ${isSelected ? 'from-primary to-primary/20' : accent.bg.replace('/10', '/30') + ' to-transparent'}`} />

      <div className="relative p-5">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-4">
            <div className={`w-11 h-11 rounded-2xl ${accent.bg} border ${accent.border} flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform`}>
              <Shield size={18} className={accent.text} />
            </div>
            <div>
              <h4 className="font-black text-[11px] uppercase tracking-widest text-white/90 line-clamp-1 group-hover:text-primary transition-colors">{pharmacy.name}</h4>
              <span className="text-[8px] font-mono text-white/40 uppercase tracking-widest">ID: PH-{pharmacy.id?.toString().slice(-4)}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[7px] uppercase font-black text-emerald-500">Open</span>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-white/40 text-[10px] font-medium italic">
            <MapPin size={12} className="text-primary/60 shrink-0" />
            <span className="truncate tracking-tight">{pharmacy.address || "Area Map Locked"}</span>
          </div>
          {pharmacy.contact_number && (
            <div className="flex items-center gap-2 text-white/40 text-[10px] font-mono">
              <Phone size={10} className="text-white/20 shrink-0" />
              <span className="tracking-widest">{pharmacy.contact_number}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <div className="flex -space-x-1.5 overflow-hidden translate-y-0.5">
             {[1,2,3].map(i => (
               <div key={i} className="w-4 h-4 rounded-full border border-black bg-white/10 backdrop-blur-sm flex items-center justify-center text-[6px] font-black text-white/40">
                 {i}
               </div>
             ))}
          </div>
          <button className={`flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.2em] ${isSelected ? 'text-primary' : 'text-white/40 group-hover:text-white'} transition-all`}>
            Explore <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  );
});

const PharmacyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
