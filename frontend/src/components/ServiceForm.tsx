"use client";

import { useState } from "react";
import { Send, Loader2, CheckCircle2, MapPin, Pill, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { getBaseUrl } from "@/lib/api";

export default function ServiceForm({ coords }: { coords: { lat: number, lon: number } | null }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [formData, setFormData] = useState({
    medicine: "",
    urgency: "Normal",
    notes: "",
    delivery: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.medicine) return;
    if (!coords) {
       toast.error("Please allow location access to match with nearby pharmacies.");
       return;
    }
    setIsSubmitting(true);

    try {
      const payload = {
        image_url: null,
        info_json: { 
          medicines: [formData.medicine], 
          notes: formData.notes,
          urgency: formData.urgency,
          delivery_requested: formData.delivery,
          type: "manual_service_request"
        },
        latitude: coords?.lat,
        longitude: coords?.lon
      };

      const apiUrl = getBaseUrl();
      const token = localStorage.getItem("token");
      
      const response = await fetch(`${apiUrl}/prescriptions/`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setIsDone(true);
      } else {
        const errorData = await response.text();
        console.error("Submission failed:", errorData);
        toast.error(`Broadcast failed: ${response.statusText}`);
      }
    } catch (error) {
       console.error("Error submitting service request:", error);
       toast.error("Network error. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <AnimatePresence mode="wait">
        {!isDone ? (
          <motion.form 
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <div className="grid md:grid-cols-2 gap-6">
               <div className="space-y-4">
                  <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">Service / Medicine Name</label>
                  <div className="relative">
                     <Pill className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={18} />
                     <input 
                       required
                       type="text" 
                       value={formData.medicine}
                       onChange={(e) => setFormData({...formData, medicine: e.target.value})}
                       placeholder="e.g. Blood Test, Paracetamol..."
                       className="w-full bg-secondary border border-border rounded-2xl pl-12 pr-4 py-4 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
                     />
                  </div>
               </div>
               <div className="space-y-4">
                  <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">Priority Level</label>
                  <div className="flex gap-2">
                     {["Normal", "Urgent"].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setFormData({...formData, urgency: p})}
                          className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${formData.urgency === p ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20' : 'border-border text-muted-foreground hover:bg-secondary'}`}
                        >
                          {p}
                        </button>
                     ))}
                  </div>
               </div>
            </div>

            <div className="space-y-4">
               <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">Additional Notes / Instructions</label>
               <textarea 
                 value={formData.notes}
                 onChange={(e) => setFormData({...formData, notes: e.target.value})}
                 placeholder="Any specific instructions for the pharmacy..."
                 className="w-full bg-secondary border border-border rounded-2xl p-4 text-sm min-h-[100px] focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
               />
            </div>

            <div className="flex items-center justify-between p-6 bg-primary/5 rounded-[2rem] border border-primary/10">
               <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border ${coords ? 'bg-white text-primary border-primary/10' : 'bg-rose-500 text-white animate-pulse'}`}>
                     <MapPin size={20} />
                  </div>
                  <div>
                     <p className="text-[10px] font-black uppercase tracking-tight">{coords ? "Location Secure" : "Location Required"}</p>
                     <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">
                        {coords ? `POS LOCKED: ${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}` : "Please enable GPS in browser settings"}
                     </p>
                  </div>
               </div>
               <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={formData.delivery}
                    onChange={(e) => setFormData({...formData, delivery: e.target.checked})}
                  />
                  <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  <span className="ml-3 text-[10px] font-black uppercase tracking-widest">Home Delivery</span>
               </label>
            </div>

            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary text-primary-foreground py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:opacity-90 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
              {coords ? "Broadcast Request" : "Broadcast Request (No GPS)"}
            </button>
            
            {!coords && (
               <p className="text-[8px] text-center text-rose-500 uppercase font-black tracking-widest">
                  Warning: Request may fail without location verification
               </p>
            )}
          </motion.form>
        ) : (
          <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-12 gap-8 text-center"
          >
            <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center text-green-600 shadow-inner border border-green-500/20">
               <CheckCircle2 size={48} />
            </div>
            <div>
               <h3 className="text-3xl font-black italic uppercase tracking-tighter mb-4">Request Transmitted</h3>
               <p className="text-muted-foreground uppercase tracking-widest text-[10px] leading-relaxed max-w-xs mx-auto">
                  Your manual request is now live in the sector. Proximate pharmacies have been notified.
               </p>
            </div>
            <button 
              onClick={() => setIsDone(false)}
              className="px-10 py-4 bg-secondary text-foreground text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-border transition-all"
            >
              Raise Another
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
