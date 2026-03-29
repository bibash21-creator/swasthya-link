"use client";

import { useState } from "react";
import Link from "next/link";
import { Upload, X, CheckCircle2, Loader2, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function PrescriptionUpload({ coords }: { coords: { lat: number, lon: number } | null }) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [medicineNames, setMedicineNames] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignedPharmacy, setAssignedPharmacy] = useState<any>(null);

  const handleAssign = async (pharmacyId: number) => {
    setIsAssigning(true);
    try {
      // Mock assignment for demonstration
      const p = matches.find(m => m.id === pharmacyId);
      setAssignedPharmacy(p);
    } finally {
      setIsAssigning(false);
    }
  };

  const availableServices = [
    "Emergency Delivery", 
    "24/7 Service", 
    "Home Consultation", 
    "Lab Test / Sample Collection"
  ];

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsArrayBuffer(file);
      reader.onload = (event) => {
        const blob = new Blob([event.target?.result as ArrayBuffer]);
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.src = url;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1200;
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            URL.revokeObjectURL(url);
          }, "image/jpeg", 0.7);
        };
      };
    });
  };

  const handleUpload = async () => {
    if (!file && !medicineNames.trim() && selectedServices.length === 0) return;
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please login first to send requests.");
      return;
    }
    
    setIsUploading(true);
    
    try {
      let fileToSend: Blob | null = null;
      if (file) {
        if (file.type.startsWith("image/")) {
          fileToSend = await compressImage(file);
        } else {
          fileToSend = file;
        }
      }
      
      const formData = new FormData();
      if (fileToSend && file) {
        formData.append("file", fileToSend, file.name);
      }
      formData.append("info_json", JSON.stringify({ 
        filename: file ? file.name : null, 
        type: file ? file.type : null, 
        size: file ? file.size : null,
        medicines: medicineNames.split(',').map(m => m.trim()).filter(m => m),
        services: selectedServices
      }));
      
      if (coords) {
        formData.append("latitude", coords.lat.toString());
        formData.append("longitude", coords.lon.toString());
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
      const response = await fetch(`${apiUrl}/prescriptions/`, {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) throw new Error("Upload failed");
      
      setIsDone(true);
      setMatches([
        { id: 1, name: "City Care Pharmacy", distance_km: 1.2, matched_medicines: ["Metformin"] },
        { id: 2, name: "Himalayan Medicals", distance_km: 2.5, matched_medicines: ["Amoxicillin"] }
      ]);
    } catch (error) {
      console.error("Error uploading prescription:", error);
      alert("Failed to upload. Please check your connection.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glassmorphism p-8 rounded-[2.5rem] premium-shadow"
    >
      <h3 className="text-2xl font-bold mb-6 text-center text-foreground">Upload Report / Photo</h3>
      
      {!isDone ? (
        <div className="flex flex-col gap-8">
          {/* File Upload Area */}
          <motion.div 
            whileHover={{ borderColor: "rgba(var(--primary), 0.5)" }}
            className="group relative border-2 border-dashed border-border hover:border-primary/50 rounded-2xl p-8 transition-all flex flex-col items-center justify-center gap-4 cursor-pointer overflow-hidden bg-secondary/10"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
            }}
          >
            {file ? (
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="flex flex-col items-center gap-4">
                <div className="relative">
                  <FileText className="w-16 h-16 text-primary" />
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="absolute -top-2 -right-2 bg-rose-500 p-1.5 rounded-full text-white shadow-lg z-10"
                  >
                    <X size={14} />
                  </motion.button>
                </div>
                <p className="text-sm font-semibold text-foreground">{file.name}</p>
              </motion.div>
            ) : (
              <>
                <motion.div 
                  whileHover={{ y: -5 }}
                  className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300"
                >
                  <Upload size={32} />
                </motion.div>
                <div className="text-center">
                  <p className="font-bold text-lg text-foreground">Click or drop a photo or PDF</p>
                  <p className="text-muted-foreground text-sm font-medium mt-1">Optional document/prescription</p>
                </div>
                <input 
                  type="file" 
                  accept="image/*,.pdf"
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={(e) => {
                    if (e.target.files?.[0]) setFile(e.target.files[0]);
                  }}
                />
              </>
            )}
          </motion.div>

          {/* Form Area */}
          <div className="bg-secondary/20 p-6 rounded-2xl border border-border">
            <div className="w-full">
              <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block mb-2">Required Medicines</label>
              <textarea 
                value={medicineNames}
                onChange={(e) => setMedicineNames(e.target.value)}
                placeholder="Enter specific medicines (e.g. Metformin 500mg, Amoxicillin)..."
                className="w-full bg-secondary/50 border border-border rounded-xl p-4 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all min-h-[80px]"
              />
            </div>

            <div className="w-full mt-6">
              <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block mb-3">Required Services</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableServices.map((service) => (
                  <label key={service} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background cursor-pointer hover:border-primary/50 transition-colors">
                    <div className="relative flex items-center">
                      <input 
                        type="checkbox" 
                        className="peer sr-only"
                        checked={selectedServices.includes(service)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedServices([...selectedServices, service]);
                          } else {
                            setSelectedServices(selectedServices.filter(s => s !== service));
                          }
                        }}
                      />
                      <div className="w-4 h-4 rounded border border-primary/50 peer-checked:bg-primary transition-colors flex items-center justify-center">
                         <CheckCircle2 size={12} className="text-white opacity-0 peer-checked:opacity-100" />
                      </div>
                    </div>
                    <span className="text-xs font-bold text-foreground">{service}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleUpload}
            disabled={isUploading || (!file && !medicineNames.trim() && selectedServices.length === 0)}
            className="w-full bg-primary hover:opacity-95 text-primary-foreground px-10 py-5 rounded-2xl transition-all font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? <Loader2 className="animate-spin" /> : <Upload size={20} />}
            {isUploading ? "Transmitting..." : "Send Request to Pharmacies"}
          </motion.button>
        </div>
      ) : isDone && !assignedPharmacy ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col py-6 gap-6"
        >
          <div className="text-center">
            <h4 className="text-2xl font-black mb-2 text-foreground uppercase tracking-tight">Smart Recommendations</h4>
            <p className="text-muted-foreground text-sm font-medium">We found {matches.length} shops with your requirements in stock.</p>
          </div>
          
          <div className="custom-scrollbar max-h-[300px] overflow-y-auto space-y-4 pr-2">
            {matches.length > 0 ? (
              matches.map((m) => (
                <div key={m.id} className="p-5 bg-card border border-border rounded-2xl flex justify-between items-center gap-4 premium-shadow transition-all hover:border-primary/50">
                  <div>
                    <h5 className="font-bold text-foreground text-lg tracking-tight">{m.name}</h5>
                    <p className="text-[10px] font-mono text-muted-foreground mt-1 tracking-widest uppercase">
                      <span className="text-primary font-black">{m.distance_km} KM</span> AWAY • {m.matched_medicines.length} ITEMS MATCHED
                    </p>
                  </div>
                  <button 
                    onClick={() => handleAssign(m.id)}
                    disabled={isAssigning}
                    className="bg-primary hover:opacity-90 px-6 py-3 rounded-xl text-primary-foreground font-bold shadow-lg shadow-primary/20 transition-all text-sm uppercase tracking-widest disabled:opacity-50"
                  >
                    Assign
                  </button>
                </div>
              ))
            ) : (
              <div className="p-8 text-center bg-secondary/30 rounded-2xl border border-dashed border-border">
                <p className="text-foreground font-bold mb-2">No exact matches nearby.</p>
                <p className="text-muted-foreground text-xs">Waiting for pharmacies to manually verify and respond to your broadcasted request.</p>
              </div>
            )}
          </div>
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-12 gap-8"
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 10, stiffness: 100 }}
            className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-600 shadow-inner"
          >
            <CheckCircle2 size={48} />
          </motion.div>
          <div className="text-center">
            <h4 className="text-2xl font-bold mb-3 text-foreground tracking-tight">Request Assigned!</h4>
            <p className="text-muted-foreground leading-relaxed">Your order was sent exclusively to <strong className="text-foreground">{assignedPharmacy?.name}</strong>. Check the map find where to pick it up.</p>
          </div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link href="/pharmacies" className="bg-foreground text-background px-10 py-4 rounded-2xl font-bold shadow-xl hover:opacity-90 transition-all block text-center">
               View {assignedPharmacy?.name} on Map
            </Link>
          </motion.div>
        </motion.div>
      )}

      <div className="mt-8 text-center text-xs text-muted-foreground font-medium">
        <p>Verified pharmacists only. Your data is private.</p>
      </div>
    </motion.div>
  );
}
