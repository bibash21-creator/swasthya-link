"use client";

import { useState } from "react";
import { FileText, Send, CheckCircle2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function HealthInfoForm() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    condition: "",
    medicines: "",
    additionalInfo: ""
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("http://localhost:8001/api/prescriptions/?patient_id=1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          info_json: formData,
          image_url: null
        })
      });

      if (!response.ok) throw new Error("Submission failed");
      
      setIsSubmitted(true);
    } catch (error) {
      console.error("Error submitting manual list:", error);
      alert("Failed to submit. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
        className="glassmorphism p-10 rounded-[2.5rem] flex flex-col items-center justify-center text-center gap-8"
      >
         <motion.div 
           initial={{ rotate: -20, scale: 0.5 }}
           animate={{ rotate: 0, scale: 1 }}
           className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-600 shadow-inner"
         >
            <CheckCircle2 size={48} />
          </motion.div>
          <div>
            <h4 className="text-2xl font-bold mb-3 text-foreground tracking-tight">List Submitted!</h4>
            <p className="text-muted-foreground leading-relaxed">Local pharmacies are checking if they have your medicine. We'll show you where to go.</p>
          </div>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-foreground text-background px-10 py-4 rounded-2xl font-bold shadow-xl hover:opacity-90 transition-all w-full"
          >
            Check Nearby Status
          </motion.button>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glassmorphism p-10 rounded-[2.5rem] premium-shadow"
    >
      <div className="flex items-center gap-5 mb-10">
        <div className="w-14 h-14 bg-teal-500/10 rounded-3xl flex items-center justify-center text-teal-600 dark:text-teal-400">
          <FileText size={28} />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-foreground">Manual List</h3>
          <p className="text-sm text-muted-foreground font-medium">Type in your medicine needs</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-bold text-muted-foreground mb-3 ml-1 uppercase tracking-wider">Health Condition</label>
          <input 
            type="text" 
            placeholder="e.g. Fever, Blood Pressure"
            className="w-full bg-secondary/50 border border-border rounded-2xl px-5 py-4 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-teal-500/30 transition-all font-medium"
            value={formData.condition}
            onChange={(e) => setFormData({...formData, condition: e.target.value})}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-muted-foreground mb-3 ml-1 uppercase tracking-wider">Medicines needed</label>
          <textarea 
            placeholder="e.g. Paracetamol 500mg, Cetirizine 10mg"
            rows={3}
            className="w-full bg-secondary/50 border border-border rounded-2xl px-5 py-4 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-teal-500/30 transition-all resize-none font-medium"
            value={formData.medicines}
            onChange={(e) => setFormData({...formData, medicines: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-muted-foreground mb-3 ml-1 uppercase tracking-wider">Note (Optional)</label>
          <input 
            type="text" 
            placeholder="Allergies or preferences?"
            className="w-full bg-secondary/50 border border-border rounded-2xl px-5 py-4 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-teal-500/30 transition-all font-medium"
            value={formData.additionalInfo}
            onChange={(e) => setFormData({...formData, additionalInfo: e.target.value})}
          />
        </div>

        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white py-5 rounded-2xl font-extrabold transition-all shadow-xl shadow-teal-500/10 flex items-center justify-center gap-3 mt-4"
        >
          {isSubmitting ? <Loader2 className="animate-spin" /> : <Send size={20} />}
          {isSubmitting ? "Submitting..." : "Send Request"}
        </motion.button>
      </form>
    </motion.div>
  );
}
