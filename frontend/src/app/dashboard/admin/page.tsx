"use client";

import { motion } from "framer-motion";
import { 
  Shield, Users, Store, Activity, 
  Settings, Key, AlertTriangle, CheckCircle, 
  Search, Filter, MoreVertical, Database,
  UserCircle, ArrowRight, Loader2
} from "lucide-react";
import { useState, useEffect } from "react";
import { getBaseUrl, joinUrl } from "@/lib/api";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'users' | 'system' | 'logs'>('users');
  const [entities, setEntities] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [stats, setStats] = useState({ patients: 0, pharmacies: 0, requests: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const fetchAdminData = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const apiUrl = getBaseUrl();
      
      // Fetch Audit Logs
      const logRes = await fetch(joinUrl(apiUrl, "admin/audit-logs"), { 
        headers: { "Authorization": `Bearer ${token}` } 
      });
      if (logRes.ok) setAuditLogs(await logRes.json());

      // Fetch Stats & Users
      const [pRes, phRes, rRes] = await Promise.all([
        fetch(joinUrl(apiUrl, "patients/all"), { headers: { "Authorization": `Bearer ${token}` } }),
        fetch(joinUrl(apiUrl, "pharmacies/all"), { headers: { "Authorization": `Bearer ${token}` } }),
        fetch(joinUrl(apiUrl, "prescriptions/all"), { headers: { "Authorization": `Bearer ${token}` } })
      ]);

      if (pRes.ok && phRes.ok && rRes.ok) {
        const patients = await pRes.json();
        const pharmacies = await phRes.json();
        const requests = await rRes.json();
        
        setEntities([
          ...patients.map((p: any) => ({ ...p, role: 'PATIENT', status: p.is_verified ? 'Verified' : 'Unverified', name: p.full_name, id_str: `PAT-${p.id}` })),
          ...pharmacies.map((ph: any) => ({ ...ph, role: 'PHARMACY', status: ph.is_verified ? 'Verified' : 'Pending', name: ph.name, id_str: `PHM-${ph.id}` }))
        ]);
        setStats({ patients: patients.length, pharmacies: pharmacies.length, requests: requests.length });
      }
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    const userRole = localStorage.getItem("userRole");
    if (!isLoggedIn || userRole !== 'admin') {
      window.location.href = "/";
      return;
    }
    fetchAdminData();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground pt-28 pb-20 px-6 transition-colors duration-500 font-mono">
      <div className="max-w-7xl mx-auto">
        
        {/* Admin Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
           <div>
              <div className="flex items-center gap-3 mb-2">
                 <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                 <span className="text-[10px] text-rose-500 uppercase tracking-[0.4em] font-black">Central Command</span>
              </div>
              <h1 className="text-5xl font-black italic uppercase tracking-tighter">Admin <span className="text-rose-500 italic">Console</span></h1>
           </div>
           
           <div className="flex bg-secondary p-1 rounded-2xl border border-border">
              {['users', 'system', 'logs'].map((t) => (
                <button 
                  key={t}
                  onClick={() => setActiveTab(t as any)}
                  className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'text-neutral-500 hover:text-foreground'}`}
                >
                  {t}
                </button>
              ))}
           </div>
        </div>

        {/* System Overlook */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
           <AdminStatCard icon={<Users size={20} />} label="Citizens" value={stats.patients} />
           <AdminStatCard icon={<Store size={20} />} label="Providers" value={stats.pharmacies} />
           <AdminStatCard icon={<Activity size={20} />} label="Prescriptions" value={stats.requests} />
           <AdminStatCard icon={<Shield size={20} />} label="Audit Ops" value={auditLogs.length} />
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
           {/* Main Display Area */}
           <div className="lg:col-span-8">
              <div className="bg-card border border-border rounded-[3rem] p-10 shadow-xl overflow-hidden min-h-[600px] relative">
                  {activeTab === 'users' && (
                    <>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 border-b border-border pb-8">
                        <h2 className="text-xl font-black italic uppercase tracking-tighter">Registry Management</h2>
                        <div className="flex gap-4">
                            <div className="relative">
                              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                              <input type="text" placeholder="Search Entity..." className="bg-secondary border border-border rounded-xl pl-10 pr-4 py-2 text-[10px] font-mono uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-rose-500/30 transition-all" />
                            </div>
                        </div>
                      </div>
                      {isLoading ? <Loader /> : (
                        <div className="space-y-2">
                          {entities.map((ent) => <EntityRow key={ent.id_str} {...ent} />)}
                        </div>
                      )}
                    </>
                  )}

                  {activeTab === 'logs' && (
                    <>
                      <h2 className="text-xl font-black italic uppercase tracking-tighter mb-8 border-b border-border pb-4">Audit Logs</h2>
                      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                        {auditLogs.map((log: any) => (
                          <div key={log.id} className="p-4 bg-secondary/30 rounded-2xl border border-white/5 font-mono text-[9px] flex justify-between items-start group">
                             <div className="space-y-1">
                                <span className="text-muted-foreground opacity-50">[{new Date(log.timestamp).toLocaleString()}]</span>
                                <p className="text-white font-bold uppercase tracking-widest text-xs">{log.action}</p>
                                <p className="text-rose-500/60 uppercase">{log.role} (ID: {log.user_id})</p>
                                {log.details && <p className="text-white/40 mt-2 italic">"{log.details}"</p>}
                             </div>
                             <div className="w-2 h-2 rounded-full bg-primary/20 group-hover:bg-primary transition-colors" />
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {activeTab === 'system' && (
                     <div className="py-20 text-center space-y-4">
                        <Database size={48} className="mx-auto text-rose-500 opacity-20" />
                        <h3 className="text-xl font-black uppercase italic">System Core Integrity</h3>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto uppercase tracking-widest">Global MedConnect Backbone is operational across KTM-Sector-1.</p>
                     </div>
                  )}
              </div>
           </div>

           {/* Sidebar controls */}
           <div className="lg:col-span-4 space-y-8">
              <div className="bg-rose-500 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group cursor-pointer">
                 <h3 className="text-xl font-black italic uppercase tracking-tight mb-2">Security Protocols</h3>
                 <p className="text-[10px] font-mono uppercase tracking-[0.2em] mb-8 font-black opacity-80 underline underline-offset-4">Identity Verification Mandatory</p>
                 <div className="space-y-4">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase">
                       <span>Admin OTP</span>
                       <span className="bg-white text-rose-500 px-2 py-0.5 rounded">ENABLED</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-black uppercase">
                       <span>Audit Mode</span>
                       <span className="bg-white text-rose-500 px-2 py-0.5 rounded">ACTIVE</span>
                    </div>
                 </div>
              </div>
              
              <div className="bg-secondary/20 border border-border rounded-[3rem] p-8">
                 <h4 className="text-[10px] font-mono uppercase tracking-[0.5em] text-muted-foreground border-b border-border pb-4 mb-6">Problems Handling</h4>
                 <div className="space-y-4">
                    <p className="text-[10px] leading-relaxed text-muted-foreground italic mb-6">Manage problematic user reports or reported pharmacies here.</p>
                    <button className="w-full py-4 border border-rose-500/30 text-rose-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all">Clear Temp Data</button>
                    <button className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Reset Sync</button>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function Loader() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
      <Loader2 className="animate-spin text-rose-500" size={32} />
      <p className="text-[10px] uppercase tracking-widest">Querying Backbone...</p>
    </div>
  );
}

function AdminStatCard({ icon, label, value }: any) {
  return (
     <div className="bg-card border border-border p-8 rounded-[2.5rem] shadow-md group hover:border-rose-500/30 transition-all">
        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground mb-4 group-hover:bg-rose-500 group-hover:text-white transition-all shadow-inner">
           {icon}
        </div>
        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
        <h4 className="text-3xl font-black italic tracking-tighter uppercase">{value}</h4>
     </div>
  );
}

function EntityRow({ name, role, status, id_str }: any) {
   const isPharmacy = role === 'PHARMACY';
   const isUnverified = status === 'Unverified' || status === 'Pending';
   return (
      <div className="flex items-center justify-between p-4 rounded-2xl hover:bg-secondary/40 transition-all border border-transparent hover:border-border">
         <div className="flex gap-4 items-center">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPharmacy ? 'bg-primary/10 text-primary' : 'bg-neutral-500/10 text-muted-foreground'}`}>
               {isPharmacy ? <Store size={18} /> : <UserCircle size={18} />}
            </div>
            <div>
               <p className="text-[8px] font-mono text-muted-foreground uppercase tracking-widest">{id_str} • {role}</p>
               <h4 className="text-sm font-black uppercase tracking-tighter">{name}</h4>
            </div>
         </div>
         <div className="flex items-center gap-8">
            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded ${isUnverified ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-500'}`}>
               {status}
            </span>
            <button className="text-muted-foreground hover:text-foreground"><MoreVertical size={16} /></button>
         </div>
      </div>
   );
}

function SystemModule({ label, val, status }: any) {
   return (
      <div className="flex items-center justify-between group">
         <div>
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest leading-none mb-1">{label}</p>
            <p className="text-sm font-black uppercase tracking-tighter">{val}</p>
         </div>
         <span className="text-[8px] font-black uppercase tracking-widest text-green-500 border border-green-500/30 px-2 py-1 rounded">{status}</span>
      </div>
   );
}
