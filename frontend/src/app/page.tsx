"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, Clock, MapPin, 
  User, Store, CheckCircle, Smartphone, Camera, 
  Shield, Star, Package, ShoppingBag
} from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { AnimatedTestimonials } from "@/components/ui/animated-testimonials";
import { DottedSurface } from "@/components/ui/dotted-surface";

// Lazy load heavy interactive components
const PrescriptionUpload = dynamic(() => import("@/components/PrescriptionUpload"), {
  loading: () => <div className="h-[400px] w-full bg-white/[0.03] backdrop-blur-2xl rounded-[3rem] animate-pulse border border-white/5" />,
  ssr: false
});

// API configuration
const getApiUrl = () => {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
};

const getUploadUrl = () => {
  return process.env.NEXT_PUBLIC_UPLOAD_URL || "http://localhost:8000";
};

const fadeInUp = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any }
};

const staggerContainer = {
  initial: {},
  whileInView: { transition: { staggerChildren: 0.1 } },
  viewport: { once: true }
};

export default function Home() {
  const [activeSide, setActiveSide] = useState<'patient' | 'pharmacy'>('patient');
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);

  const apiUrl = getApiUrl();
  const uploadUrl = getUploadUrl();

  useEffect(() => {
    fetch(`${apiUrl}/pharmacies/`)
      .then(r => r.json())
      .then(d => setPharmacies(Array.isArray(d) ? d.slice(0, 4) : []))
      .catch(() => {});

    fetch(`${apiUrl}/pharmacies/shop`)
      .then(r => r.json())
      .then(d => setProducts(Array.isArray(d) ? d.slice(0, 6) : []))
      .catch(() => {});

    fetch(`${apiUrl}/pharmacies/reviews/all`)
      .then(r => r.json())
      .then(d => setReviews(Array.isArray(d) ? d.slice(0, 3) : []))
      .catch(() => {});
  }, []);

  return (
    <div className="relative min-h-screen pt-4 overflow-x-hidden bg-background text-foreground transition-colors duration-500 selection:bg-primary/20 selection:text-foreground">
      
      {/* Three.js Dotted Surface Background */}
      <DottedSurface className="opacity-40" />
      
      {/* Dynamic Background System */}
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden opacity-20">
         <div className="absolute top-0 left-0 w-full h-full bg-grid-pattern [background-size:60px_60px] opacity-[0.05]" />
         <div className="absolute top-[-20%] left-[-10%] w-[120%] h-[120%] bg-spotlight pointer-events-none opacity-40 blur-[120px]" />
      </div>

      {/* Hero */}
      <section className="relative px-6 pt-40 pb-60 flex flex-col items-center">
        <motion.div
           initial={{ opacity: 0, y: 60 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
           className="text-center relative z-20"
        >
          {/* 3D Medical Icon */}
          <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 opacity-30 pointer-events-none scale-[2]">
             <Rotating3DMedicalIcon />
          </div>

          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="mb-8 inline-flex items-center gap-3 px-6 py-2 rounded-full bg-primary/10 border border-primary/20 shadow-xl shadow-primary/5 backdrop-blur-md"
          >
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
             <span className="text-[10px] font-mono tracking-[0.4em] text-primary uppercase font-bold">
                Nepal's Medical Link
             </span>
          </motion.div>
          
          <div className="relative mb-10 overflow-hidden py-4">
             <SplitText text="Care for" className="text-6xl md:text-[140px] font-black leading-[0.9] tracking-[-0.04em] uppercase italic" />
             <motion.h1 
               initial={{ opacity: 0, filter: "blur(10px)", scale: 0.95 }}
               animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
               transition={{ delay: 0.6, duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
               className="text-6xl md:text-[140px] font-black leading-[0.9] tracking-[-0.04em] uppercase italic"
             >
               <span className="text-primary underline decoration-primary/20 underline-offset-[12px] decoration-8">Everyone.</span>
             </motion.h1>
          </div>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 1 }}
            className="max-w-3xl mx-auto text-xl md:text-3xl text-muted-foreground font-medium leading-[1.2] mb-16 px-4 tracking-tight"
          >
             Finding the medicine your family needs, simplified for every generation. From children to seniors, we are here to help.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="flex flex-col md:flex-row items-center gap-8 justify-center"
          >
             <motion.div whileHover={{ scale: 1.05, y: -5 }} whileTap={{ scale: 0.95 }}>
               <Link href="/pharmacies" className="px-12 py-7 bg-primary text-primary-foreground rounded-[2rem] font-black text-xl uppercase tracking-widest transition-all shadow-2xl shadow-primary/20 flex items-center gap-4 group">
                  Find Medicine Now <ArrowRight size={24} className="group-hover:translate-x-2 transition-transform" />
               </Link>
             </motion.div>
             <motion.div whileHover={{ scale: 1.05, y: -5 }} whileTap={{ scale: 0.95 }}>
               <Link href="/shop" className="px-12 py-7 bg-secondary border border-border rounded-[2rem] font-black text-xl uppercase tracking-widest transition-all shadow-xl flex items-center gap-4 group">
                  Browse Shop <ShoppingBag size={24} className="group-hover:rotate-12 transition-transform" />
               </Link>
             </motion.div>
             <div className="flex flex-col items-start px-8 border-l border-border">
                <span className="text-xl font-black italic">500+</span>
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Verified Shops in KTM</span>
             </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Live Pharmacy Cards Section */}
      <motion.section 
        {...fadeInUp}
        className="py-32 border-t border-border bg-background"
      >
        <div className="max-w-7xl mx-auto px-6">
           <div className="flex items-end justify-between mb-16 gap-8">
             <div>
               <span className="text-[10px] font-mono text-primary uppercase tracking-[0.4em] font-black block mb-3">Live Nearby</span>
               <h2 className="text-5xl md:text-6xl font-black italic uppercase tracking-tighter">
                 Local Care <br /><span className="text-primary">Verified.</span>
               </h2>
             </div>
             <motion.div whileHover={{ x: 5 }}>
               <Link href="/pharmacies" className="hidden md:flex items-center gap-2 text-sm font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors group">
                 See All <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
               </Link>
             </motion.div>
           </div>

           <motion.div 
             variants={staggerContainer}
             initial="initial"
             whileInView="whileInView"
             viewport={{ once: true }}
             className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
           >
             {(pharmacies.length > 0 ? pharmacies : [
               { name: "Lalitpur Pharmacy", address: "Patan Dhoka", status: "Open" },
               { name: "Teaching Hospital", address: "Maharajgunj", status: "24/7" },
               { name: "Bir Hospital Area", address: "Mahaboudha", status: "Open" },
               { name: "Thamel Medical", address: "Thamel", status: "Open" },
             ]).map((ph, i) => (
               <motion.div key={ph.id || i} variants={fadeInUp}>
                 <PharmacyEnvelopeCard pharmacy={ph} index={i} />
               </motion.div>
             ))}
           </motion.div>
        </div>
      </motion.section>

      {/* Live Product Showcase */}
      {products.length > 0 && (
        <motion.section 
          {...fadeInUp}
          className="py-24 bg-secondary/10 border-y border-border overflow-hidden"
        >
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-end justify-between mb-12">
              <div>
                <span className="text-[10px] font-mono text-primary uppercase tracking-[0.4em] font-black block mb-3">Featured Products</span>
                <h2 className="text-4xl font-black italic uppercase tracking-tighter">Shop <span className="text-primary">Now</span></h2>
              </div>
              <motion.div whileHover={{ x: 5 }}>
                <Link href="/shop" className="hidden md:flex items-center gap-2 text-sm font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors group">
                  View All <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
            </div>
            <motion.div 
              variants={staggerContainer}
              initial="initial"
              whileInView="whileInView"
              viewport={{ once: true }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4"
            >
              {products.map((p: any, i: number) => (
                <motion.div key={p.id} variants={fadeInUp}>
                  <Link href="/shop">
                      <motion.div
                        whileHover={{ y: -8, scale: 1.02 }}
                        className="group relative rounded-[2.2rem] overflow-hidden border border-white/5 bg-[#0a0a0a]/40 backdrop-blur-xl shadow-xl hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300 cursor-pointer"
                      >
                        <div className="aspect-[4/5] bg-gradient-to-br from-white/5 to-transparent relative overflow-hidden">
                          {p.image_url ? (
                            <img src={`${uploadUrl}${p.image_url}`} alt={p.medicine_name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/10 group-hover:text-primary/40 transition-colors">
                              <Package size={38} />
                            </div>
                          )}
                          <div className="absolute bottom-3 left-3 bg-white/5 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl shadow-lg">
                             <p className="text-[10px] font-black text-primary italic tracking-tight">{p.price ? `रू ${p.price}` : 'Free'}</p>
                          </div>
                        </div>
                        <div className="p-4 bg-gradient-to-b from-white/[0.02] to-transparent">
                          <p className="text-[9px] font-black uppercase tracking-widest text-white/80 line-clamp-2 leading-tight group-hover:text-primary transition-colors">{p.medicine_name}</p>
                          <div className="mt-3 flex items-center justify-between opacity-40 group-hover:opacity-100 transition-opacity">
                             <span className="text-[7px] font-mono uppercase tracking-[0.2em]">{p.pharmacy_name?.split(' ')[0] || 'Pharma'}</span>
                             <ArrowRight size={10} className="text-primary" />
                          </div>
                        </div>
                      </motion.div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.section>
      )}

      {/* Perspective Toggle Section */}
      <motion.section 
        {...fadeInUp}
        className="py-40 bg-secondary/30 relative"
      >
        <div className="max-w-7xl mx-auto px-6">
           <div className="flex flex-col md:flex-row items-center justify-between mb-24 gap-12">
              <div className="max-w-xl">
                 <h2 className="text-5xl font-black mb-6 italic uppercase tracking-tighter">Unified System.</h2>
                 <p className="text-lg text-muted-foreground font-medium">Whether you are seeking medicine or providing care, we bridge the gap in real-time.</p>
              </div>
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="flex bg-background p-2 rounded-[2rem] border border-border shrink-0 shadow-lg"
              >
                 <button onClick={() => setActiveSide('patient')} className={`px-10 py-5 rounded-[1.5rem] text-sm font-black uppercase tracking-widest transition-all ${activeSide === 'patient' ? 'bg-primary text-primary-foreground shadow-xl' : 'text-muted-foreground hover:text-foreground'}`}>Patient Side</button>
                 <button onClick={() => setActiveSide('pharmacy')} className={`px-10 py-5 rounded-[1.5rem] text-sm font-black uppercase tracking-widest transition-all ${activeSide === 'pharmacy' ? 'bg-primary text-primary-foreground shadow-xl' : 'text-muted-foreground hover:text-foreground'}`}>Pharmacy Side</button>
              </motion.div>
           </div>

           <div className="grid lg:grid-cols-2 gap-20 items-center">
              <AnimatePresence mode="wait">
                 {activeSide === 'patient' ? (
                   <motion.div 
                     key="patient"
                     initial={{ opacity: 0, x: -20 }}
                     animate={{ opacity: 1, x: 0 }}
                     exit={{ opacity: 0, x: 20 }}
                     className="space-y-10"
                   >
                      <ProcessStep num="01" icon={<Camera className="text-primary" />} title="Snap Prescription" text="Take a photo of your doctor's list or type the name manually." />
                      <ProcessStep num="02" icon={<Smartphone className="text-primary" />} title="Wait for Confirmation" text="Pharmacies in Kathmandu will check their shelves and confirm instantly." />
                      <ProcessStep num="03" icon={<CheckCircle className="text-primary" />} title="Pickup & Pay" text="Go to the verified shop, show your code, and receive your medicine." />
                   </motion.div>
                 ) : (
                   <motion.div 
                     key="pharmacy"
                     initial={{ opacity: 0, x: -20 }}
                     animate={{ opacity: 1, x: 0 }}
                     exit={{ opacity: 0, x: 20 }}
                     className="space-y-10"
                   >
                      <ProcessStep num="01" icon={<Store className="text-primary" />} title="Receive Orders" text="Get instant notifications on your dashboard when a nearby patient needs stock." />
                      <ProcessStep num="02" icon={<Clock className="text-primary" />} title="Inventory Verification" text="Confirm your stock levels in one tap and send a quote directly." />
                      <ProcessStep num="03" icon={<User className="text-primary" />} title="Dispense Care" text="Verify the patient's ID at the counter and fulfill the order securely." />
                   </motion.div>
                 )}
              </AnimatePresence>

              <div className="relative">
                 <div className="absolute inset-0 bg-primary/5 blur-[100px] rounded-full -z-10" />
                 {activeSide === 'patient' ? <PrescriptionUpload coords={null} /> : (
                   <div className="relative group p-0.5 rounded-[4rem] overflow-hidden bg-gradient-to-br from-white/10 to-transparent shadow-2xl">
                      <div className="relative bg-[#0d0d0d]/40 backdrop-blur-3xl p-12 rounded-[3.9rem] overflow-hidden">
                         <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
                         <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />
                         
                         <div className="mb-12 flex items-center justify-between relative z-10">
                            <div>
                               <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white">Terminal <span className="text-primary">X-1</span></h3>
                               <p className="text-[9px] font-mono text-white/40 uppercase tracking-[0.3em] mt-1">Pharmacy Command Center</p>
                            </div>
                            <div className="flex bg-black/40 p-2 rounded-2xl border border-white/5 items-center gap-3">
                               <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                               <span className="text-[8px] font-black font-mono text-white/60 uppercase tracking-widest">Active System</span>
                            </div>
                         </div>

                         <div className="space-y-6 relative z-10">
                            <div className="p-8 bg-white/[0.03] border border-white/10 rounded-[2.5rem] flex items-center justify-between group-hover:bg-white/[0.05] transition-all duration-500">
                               <div className="flex gap-5 items-center">
                                  <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner border border-primary/20"><Camera size={26} /></div>
                                  <div>
                                     <p className="text-base font-black text-white">Review Required</p>
                                     <p className="text-[10px] text-white/40 uppercase tracking-widest font-mono mt-0.5">Patient loc: Thamel Sector</p>
                                  </div>
                               </div>
                               <span className="px-5 py-2 rounded-full bg-primary text-primary-foreground text-[9px] font-black uppercase tracking-widest cursor-pointer shadow-lg shadow-primary/20 hover:scale-110 transition-transform">View</span>
                            </div>
                         </div>
                      </div>
                   </div>
                 )}
              </div>
           </div>
        </div>
      </motion.section>

      {/* Support Cards */}
      <motion.section 
        {...fadeInUp}
        className="py-32 relative overflow-hidden border-y border-border"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <span className="text-[10px] font-mono text-primary uppercase tracking-[0.4em] font-black block mb-3">Built for Everyone</span>
            <h2 className="text-5xl md:text-6xl font-black italic uppercase tracking-tighter">Who We <span className="text-primary">Serve.</span></h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <SupportCard
              icon={<User size={32} />}
              title="For Senior Citizens"
              desc="Simple photo upload. No typing required. Big buttons and large text designed for comfortable reading."
              color="from-violet-500/20 to-purple-600/5"
              iconBg="bg-violet-500/20 text-violet-400"
            />
            <SupportCard
              icon={<Shield size={32} />}
              title="For Families"
              desc="Keep track of multiple family members' medications in one unified dashboard. Get instant stock alerts."
              color="from-primary/20 to-primary/5"
              iconBg="bg-primary/20 text-primary"
              featured
            />
            <SupportCard
              icon={<Store size={32} />}
              title="For Pharmacies"
              desc="Grow your digital footprint and serve more locals without extra marketing costs. List your inventory."
              color="from-emerald-500/20 to-teal-600/5"
              iconBg="bg-emerald-500/20 text-emerald-400"
            />
          </div>
        </div>
      </motion.section>

      {/* Feedback Section */}
      <motion.section 
        {...fadeInUp}
        className="py-32 bg-background relative overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-end justify-between mb-20 gap-8">
            <div className="max-w-xl">
              <span className="text-[10px] font-mono text-primary uppercase tracking-[0.4em] font-black block mb-3">Community First</span>
              <h2 className="text-5xl md:text-6xl font-black italic uppercase tracking-tighter">What the <span className="text-primary">Community</span> Says.</h2>
            </div>
          </div>

          <div className="mt-12">
            <AnimatedTestimonials 
              testimonials={reviews.length > 0 ? reviews.map((r, i) => ({
                quote: r.comment,
                name: r.patient_name,
                designation: r.pharmacy_name,
                src: [
                  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=3560&auto=format&fit=crop",
                  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=3560&auto=format&fit=crop",
                  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=3560&auto=format&fit=crop"
                ][i % 3]
              })) : [
                {
                  quote: "Finally, a way to verify stock locally in KTM without calling 10 shops. Game changer for my chronic medications.",
                  name: "Ram S.",
                  designation: "Satisfied Patient",
                  src: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=3560&auto=format&fit=crop",
                },
                {
                  quote: "Very simple for my parents. They just snap a photo and someone confirms the stock in minutes. Highly recommended.",
                  name: "Sita K.",
                  designation: "Family Caregiver",
                  src: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=3560&auto=format&fit=crop",
                },
                {
                  quote: "As a pharmacy owner, this has helped us reach digital-first customers we never would have seen otherwise.",
                  name: "Anil B.",
                  designation: "Pharmacy Owner",
                  src: "https://images.unsplash.com/photo-1623582854588-d60de57fa33f?q=80&w=3560&auto=format&fit=crop",
                }
              ]} 
              autoplay={true}
            />
          </div>
        </div>
      </motion.section>

      {/* Final CTA */}
      <motion.section 
        {...fadeInUp}
        className="py-60 flex flex-col items-center"
      >
         <h2 className="text-6xl md:text-[120px] font-black italic tracking-tighter mb-16 text-center leading-none uppercase">
            Built for <br />
            <span className="text-primary underline decoration-primary/20 underline-offset-[12px] decoration-8">Nepal.</span>
         </h2>
         <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link href="/pharmacies" className="bg-foreground text-background px-20 py-10 font-black text-2xl uppercase tracking-[0.2em] rounded-[3rem] shadow-2xl hover:opacity-90 transition-all">
               Find Medicine
            </Link>
         </motion.div>
      </motion.section>

      <footer className="py-20 px-6 border-t border-border bg-background">
         <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12 text-sm font-bold opacity-50">
            <div className="flex items-center gap-4">
               <span className="text-xl font-black italic tracking-tighter uppercase">MEDCONNECT.</span>
               <div className="w-px h-6 bg-border mx-4" />
               <span>Helping Nepal heal.</span>
            </div>
            <p className="text-[10px] font-mono uppercase tracking-widest">© 2026 MedConnect Nepal</p>
         </div>
      </footer>
    </div>
  );
}

/* --- Components --- */

const PHARMACY_GRADIENTS = [
  { from: "from-violet-600", to: "to-purple-900", glow: "bg-violet-500/30", accent: "border-violet-500/30 text-violet-300" },
  { from: "from-emerald-600", to: "to-teal-900", glow: "bg-emerald-500/30", accent: "border-emerald-500/30 text-emerald-300" },
  { from: "from-rose-600", to: "to-pink-900", glow: "bg-rose-500/30", accent: "border-rose-500/30 text-rose-300" },
  { from: "from-amber-500", to: "to-orange-900", glow: "bg-amber-500/30", accent: "border-amber-500/30 text-amber-300" },
];

function PharmacyEnvelopeCard({ pharmacy, index }: { pharmacy: any; index: number }) {
  const g = PHARMACY_GRADIENTS[index % PHARMACY_GRADIENTS.length];
  const uploadUrl = getUploadUrl();
  
  return (
    <div className="group relative cursor-pointer">
      <div className={`absolute -inset-0.5 rounded-[2.8rem] ${g.glow} blur-xl opacity-0 group-hover:opacity-60 transition-all duration-500`} />
      <div className="relative rounded-[2.5rem] overflow-hidden border border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl shadow-black/30">
        <div className={`relative h-56 ${pharmacy.image_url ? '' : `bg-gradient-to-br ${g.from} ${g.to}`} overflow-hidden`}>
          {pharmacy.image_url ? (
            <img src={`${uploadUrl}${pharmacy.image_url}`} alt={pharmacy.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <MapPin size={38} className="text-white drop-shadow-lg" />
            </div>
          )}
          <svg className="absolute -bottom-px left-0 w-full z-20" viewBox="0 0 400 60" preserveAspectRatio="none" fill="currentColor">
            <path d="M0,60 C60,10 150,0 200,0 C250,0 340,10 400,60 L400,60 L0,60 Z" className="text-[#0d0d0d] dark:text-[#0a0a0a]" style={{ fill: 'var(--card, #0d0d0d)' }} />
          </svg>
        </div>
        <div className="p-7 pt-5 bg-gradient-to-b from-white/[0.04] to-transparent">
          <h4 className="text-lg font-black uppercase tracking-tighter mb-2 line-clamp-1 text-white">{pharmacy.name}</h4>
          <p className="text-[9px] text-white/40 font-mono mb-5 flex items-center gap-1.5"><MapPin size={10} /> {pharmacy.address || "Kathmandu"}</p>
          <div className={`flex items-center justify-between w-full px-5 py-3 rounded-2xl border ${g.accent} bg-white/5 backdrop-blur-xl text-[9px] font-black uppercase tracking-widest`}>
            <span>View Details</span>
            <ArrowRight size={12} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProcessStep({ num, icon, title, text }: any) {
  return (
    <div className="flex gap-8 group relative p-6 rounded-[2.5rem] hover:bg-white/[0.02] transition-all duration-500 border border-transparent hover:border-white/5">
       <div className="w-16 h-16 rounded-[1.8rem] bg-white/[0.03] backdrop-blur-xl border border-white/10 flex items-center justify-center shrink-0 group-hover:border-primary/50 group-hover:scale-110 transition-all duration-500">
          {icon}
          <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-black italic shadow-lg border-2 border-background">{num}</div>
       </div>
       <div>
          <h4 className="text-xl font-black mb-2 italic tracking-tighter uppercase text-white/90 group-hover:text-primary transition-colors">{title}</h4>
          <p className="text-white/40 text-sm font-medium uppercase tracking-tight">{text}</p>
       </div>
    </div>
  );
}

function SupportCard({ icon, title, desc, color, iconBg, featured }: any) {
  return (
    <motion.div
      whileHover={{ y: -10 }}
      className={`group relative rounded-[2.5rem] overflow-hidden border ${featured ? 'border-primary/40' : 'border-white/10'} bg-white/[0.03] backdrop-blur-2xl`}
    >
      <div className={`h-1.5 w-full bg-gradient-to-r ${color}`} />
      <div className="p-8 pt-6">
        <div className={`w-16 h-16 rounded-2xl ${iconBg} mb-6 flex items-center justify-center shadow-xl`}>{icon}</div>
        <h4 className="text-2xl font-black italic uppercase tracking-tighter mb-4">{title}</h4>
        <p className="text-sm text-white/50 mb-6">{desc}</p>
        <div className="text-[9px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
          <ArrowRight size={12} /> Learn More
        </div>
      </div>
    </motion.div>
  );
}

const SplitText = ({ text, className }: { text: string; className?: string }) => {
  return (
    <div className={className}>
      <div className="relative overflow-hidden">
        <motion.div
           initial={{ y: "100%" }}
           animate={{ y: 0 }}
           transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] as any }}
        >
          {text.split(' ').map((word, i) => (
             <span key={i} className="inline-block mr-4">{word}</span>
          ))}
        </motion.div>
        
        {/* Split Overlay for Effect */}
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
          className="absolute inset-0 bg-primary/20 skew-x-[-20deg] blur-xl"
        />
      </div>
    </div>
  );
};

const Rotating3DMedicalIcon = () => (
   <motion.div
      animate={{ 
        rotateY: [0, 360],
        rotateX: [0, 10, 0, -10, 0],
        y: [0, -10, 0]
      }}
      transition={{ 
        duration: 10, 
        repeat: Infinity, 
        ease: "linear" 
      }}
      style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}
      className="relative w-40 h-40 flex items-center justify-center"
   >
      {/* 3D Medical Cross approximation */}
      <div className="absolute w-12 h-32 bg-primary/40 rounded-full blur-sm" />
      <div className="absolute w-32 h-12 bg-primary/40 rounded-full blur-sm" />
      <div className="absolute w-10 h-28 bg-primary rounded-full shadow-[0_0_40px_rgba(var(--primary-rgb),0.5)]" />
      <div className="absolute w-28 h-10 bg-primary rounded-full shadow-[0_0_40px_rgba(var(--primary-rgb),0.5)]" />
      
      {/* Floating Particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
           key={i}
           animate={{ 
             y: [0, -40, 0],
             opacity: [0, 1, 0],
             scale: [0, 1, 0]
           }}
           transition={{ 
             duration: 2 + i, 
             repeat: Infinity, 
             delay: i * 0.5 
           }}
           className="absolute w-2 h-2 bg-primary rounded-full"
           style={{ 
             left: `${Math.random() * 100}%`, 
             top: `${Math.random() * 100}%` 
           }}
        />
      ))}
   </motion.div>
);
