"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, Activity, Settings, Key, AlertTriangle, CheckCircle, 
  Search, Filter, MoreVertical, Package, Truck, 
  BarChart3, Users, Plus, Loader2, ArrowRightCircle, Trash2, Save, ImageIcon, CreditCard
} from "lucide-react";
import { useState, useEffect } from "react";
import MedLogo from "@/components/MedLogo";
import { getBaseUrl, getUploadUrl } from "@/lib/api";

export default function PharmacyDashboard() {
  const [activeTab, setActiveTab] = useState<'requests' | 'inventory'>('requests');
  const [requests, setRequests] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const apiUrl = getBaseUrl();
  const uploadUrl = getUploadUrl();

  // Inventory Form State
  const [newItem, setNewItem] = useState({ medicine_name: "", description: "", type: "medicine", quantity: 0, price: 0, image_url: "" });
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const getToken = () => localStorage.getItem("token");
  const getPharmacyId = () => {
    const token = getToken();
    if (!token) return null;
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(window.atob(base64)).id;
  };

  const fetchRequests = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const response = await fetch(`${apiUrl}/prescriptions/all`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) setRequests(await response.json());
    } catch (error) { console.error("Error fetching requests:", error); }
  };

  const fetchOrders = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const response = await fetch(`${apiUrl}/orders/pharmacy-orders`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) setOrders(await response.json());
    } catch (e) {
      console.error("Error fetching orders:", e);
    }
  };

  const fetchInventory = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const phId = getPharmacyId();
      const response = await fetch(`${apiUrl}/pharmacies/${phId}/inventory`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) setInventory(await response.json());
    } catch (error) { console.error("Error fetching inventory:", error); }
    finally { setIsLoading(false); }
  };

  const updateStatus = async (id: number, status: string, isOrder: boolean = false) => {
    const token = getToken();
    if (!token) return;
    try {
      const endpoint = isOrder ? `${apiUrl}/orders/${id}/status?status=${status}` : `${apiUrl}/prescriptions/${id}/status?status=${status}`;
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        if (isOrder) fetchOrders();
        else fetchRequests();
      }
    } catch (error) { console.error("Error updating status:", error); }
  };

  const saveInventory = async () => {
    const token = getToken();
    if (!token) return;
    setIsSaving(true);
    try {
      const phId = getPharmacyId();
      const response = await fetch(`${apiUrl}/pharmacies/${phId}/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(inventory)
      });
      if (response.ok) fetchInventory();
    } catch (error) { console.error("Error saving inventory:", error); }
    finally { setIsSaving(false); }
  };

  const handleProductImageUpload = async (file: File) => {
    const token = getToken();
    if (!token) return;
    setIsUploadingImage(true);
    try {
      const phId = getPharmacyId();
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${apiUrl}/pharmacies/${phId}/inventory/upload-image`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: fd
      });
      if (res.ok) {
        const data = await res.json();
        setNewItem(prev => ({ ...prev, image_url: data.image_url }));
      }
    } catch (e) { console.error("Image upload error", e); }
    finally { setIsUploadingImage(false); }
  };

  const addInventoryItem = () => {
    if (!newItem.medicine_name) return;
    setInventory([...inventory, { ...newItem, id: Date.now() }]);
    setNewItem({ medicine_name: "", description: "", type: "medicine", quantity: 0, price: 0, image_url: "" });
  };

  const removeInventoryItem = (id: any) => {
    setInventory(inventory.filter(item => item.id !== id));
  };

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    const userRole = localStorage.getItem("userRole");
    if (!isLoggedIn || userRole !== 'pharmacy') {
      window.location.href = "/";
      return;
    }
    const loadAll = async () => {
      setIsLoading(true);
      await Promise.all([fetchRequests(), fetchOrders(), fetchInventory()]);
      setIsLoading(false);
    };
    loadAll();
    const interval = setInterval(() => {
      fetchRequests();
      fetchOrders();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground pt-28 pb-20 px-6 transition-colors duration-500 font-mono">
      <div className="max-w-7xl mx-auto">
        
        {/* Pharmacy Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
           <div>
              <div className="flex items-center gap-3 mb-2">
                 <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                 <span className="text-[10px] text-primary uppercase tracking-[0.4em] font-black">Terminal Link Stable</span>
              </div>
              <h1 className="text-5xl font-black italic uppercase tracking-tighter">Pharma <span className="text-primary italic">Terminal</span></h1>
           </div>
           <div className="flex items-center gap-4">
              {activeTab === 'inventory' && (
                <button
                  onClick={saveInventory}
                  disabled={isSaving}
                  className="h-11 px-6 bg-primary text-primary-foreground rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all shadow-lg disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {isSaving ? 'Saving...' : 'Save Catalog'}
                </button>
              )}
              <button
                onClick={() => { localStorage.clear(); window.location.href = '/'; }}
                className="h-11 px-6 border border-border rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-secondary transition-all"
              >
                <Key size={14} /> Logout
              </button>
           </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <StatCard icon={<Package size={20} />} label="Active Requests" value={requests.filter(r => r.status !== 'completed' && r.status !== 'declined').length} />
          <StatCard icon={<CreditCard size={20} />} label="Direct Orders" value={orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length} />
          <StatCard icon={<Activity size={20} />} label="Processing" value={requests.filter(r => r.status === 'processing').length + orders.filter(o => o.status === 'processing').length} />
          <StatCard icon={<BarChart3 size={20} />} label="Catalog Items" value={inventory.length} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           {/* Main Panel */}
           <div className="lg:col-span-8">
              {/* Tabs */}
              <div className="flex gap-2 mb-8 p-1.5 bg-secondary/30 rounded-2xl border border-border w-fit">
                {(['requests', 'inventory'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {tab === 'requests' ? 'Orders & Requests' : 'Catalog'}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {activeTab === 'requests' ? (
                  <motion.div
                    key="requests"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center py-20">
                        <Loader2 size={32} className="animate-spin text-primary" />
                      </div>
                    ) : (requests.length === 0 && orders.length === 0) ? (
                      <p className="text-center py-20 text-muted-foreground italic">No active requests or orders right now.</p>
                    ) : (
                      <>
                        {/* Orders (Direct Shop Sales) */}
                        {orders.length > 0 && (
                          <div className="space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-primary mb-2 px-2">E-Commerce Orders</h3>
                            {orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').map((order: any) => {
                              const actions = [
                                { label: 'Process', onClick: () => updateStatus(order.id, 'processing', true), primary: true, icon: Activity },
                                { label: 'Deliver', onClick: () => updateStatus(order.id, 'delivered', true), icon: Truck }
                              ];
                              return (
                                <RequestItem 
                                  key={`order-${order.id}`}
                                  id={order.id}
                                  patient={`Patient #${order.patient_id}`}
                                  medicine={`Order Value: रू ${order.total_amount} (${order.payment_method})`}
                                  time={new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  status={order.status}
                                  actions={actions}
                                  isOrder={true}
                                />
                              );
                            })}
                          </div>
                        )}

                        {/* Prescriptions / Services */}
                        {requests.length > 0 && (
                          <div className="space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-primary mt-8 mb-2 px-2">Prescription & Service Requests</h3>
                            {requests.filter(r => r.status !== 'completed' && r.status !== 'declined').map((req: any) => {
                              let actions: any[] = [];
                              if (req.status === 'pending') {
                                actions = [
                                  { label: 'Decline', onClick: () => updateStatus(req.id, 'declined') },
                                  { label: 'Accept', onClick: () => updateStatus(req.id, 'verified'), primary: true, icon: CheckCircle }
                                ];
                              } else if (req.status === 'verified') {
                                actions = [
                                  { label: 'Process', onClick: () => updateStatus(req.id, 'processing'), primary: true, icon: Activity }
                                ];
                              } else {
                                actions = [{ label: 'Complete', onClick: () => updateStatus(req.id, 'completed'), primary: true }];
                              }
                              return (
                                <RequestItem 
                                  key={`req-${req.id}`}
                                  id={req.id}
                                  patient={`Patient #${req.patient_id}`}
                                  medicine={req.info_json?.medicines?.join(", ") || "Prescription Scan"}
                                  time={new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  status={req.status}
                                  actions={actions}
                                />
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="inventory"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-8"
                  >
                    {/* Add Product Form */}
                    <div className="p-6 bg-secondary/20 rounded-3xl border border-dashed border-border space-y-4">
                      <p className="text-[9px] font-mono text-primary uppercase tracking-[0.3em] font-black">Add New Product / Service</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[8px] font-mono text-muted-foreground uppercase mb-2 block">Name *</label>
                          <input
                            type="text"
                            value={newItem.medicine_name}
                            onChange={(e) => setNewItem({...newItem, medicine_name: e.target.value})}
                            placeholder="e.g. Paracetamol 500mg"
                            className="w-full bg-secondary border border-border rounded-xl px-4 py-2 text-[10px] font-mono tracking-widest focus:outline-none focus:ring-1 focus:ring-primary/30"
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-mono text-muted-foreground uppercase mb-2 block">Type</label>
                          <select
                            value={newItem.type}
                            onChange={(e) => setNewItem({...newItem, type: e.target.value})}
                            className="w-full bg-secondary border border-border rounded-xl px-4 py-2 text-[10px] font-mono tracking-widest focus:outline-none focus:ring-1 focus:ring-primary/30 appearance-none"
                          >
                            <option value="medicine">Medicine</option>
                            <option value="service">Service</option>
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-[8px] font-mono text-muted-foreground uppercase mb-2 block">Description</label>
                          <input
                            type="text"
                            value={newItem.description}
                            onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                            placeholder="Short product description..."
                            className="w-full bg-secondary border border-border rounded-xl px-4 py-2 text-[10px] font-mono tracking-widest focus:outline-none focus:ring-1 focus:ring-primary/30"
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-mono text-muted-foreground uppercase mb-2 block">Stock Qty</label>
                          <input
                            type="number"
                            value={newItem.quantity}
                            onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value) || 0})}
                            className="w-full bg-secondary border border-border rounded-xl px-4 py-2 text-[10px] font-mono tracking-widest focus:outline-none focus:ring-1 focus:ring-primary/30"
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-mono text-muted-foreground uppercase mb-2 block">Price (रू)</label>
                          <input
                            type="number"
                            value={newItem.price}
                            onChange={(e) => setNewItem({...newItem, price: parseFloat(e.target.value) || 0})}
                            className="w-full bg-secondary border border-border rounded-xl px-4 py-2 text-[10px] font-mono tracking-widest focus:outline-none focus:ring-1 focus:ring-primary/30"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="cursor-pointer flex items-center gap-2 px-4 py-2 border border-dashed border-primary/40 rounded-xl text-[9px] font-mono text-primary">
                          {isUploadingImage ? <Loader2 size={12} className="animate-spin" /> : <ImageIcon size={12} />}
                          {isUploadingImage ? "Uploading..." : "Upload Photo"}
                          <input type="file" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleProductImageUpload(e.target.files[0]); }} />
                        </label>
                        {newItem.image_url && <img src={`${uploadUrl}${newItem.image_url}`} className="w-12 h-12 rounded-xl object-cover" />}
                      </div>
                      <button onClick={addInventoryItem} className="w-full h-[42px] bg-primary/10 text-primary border border-primary/20 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-primary/20 transition-all">
                        <Plus size={14} /> Add to Catalog
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {inventory.map((item) => (
                        <div key={item.id} className="rounded-2xl bg-secondary/10 border border-border overflow-hidden">
                          {item.image_url && <img src={`${uploadUrl}${item.image_url}`} className="w-full h-36 object-cover" />}
                          <div className="p-4 flex justify-between items-start">
                            <div>
                              <h4 className="text-xs font-black uppercase tracking-tighter truncate">{item.medicine_name}</h4>
                              <p className="text-[8px] font-mono text-muted-foreground uppercase">{item.quantity} in stock &bull; रू {item.price}</p>
                            </div>
                            <button onClick={() => removeInventoryItem(item.id)} className="p-2 text-muted-foreground hover:text-rose-500"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
           </div>

           <div className="lg:col-span-4 space-y-8">
              <div className="bg-secondary/30 border border-border rounded-[3rem] p-10 shadow-lg relative overflow-hidden group">
                 <h3 className="text-lg font-black uppercase tracking-tighter italic mb-8 border-b border-border pb-4">Verification</h3>
                 <div className="space-y-8">
                    <div className="flex items-center gap-4">
                       <CheckCircle size={32} className="text-primary" />
                       <div>
                          <p className="text-sm font-black uppercase tracking-tight">Shop Verified</p>
                          <p className="text-[10px] text-muted-foreground font-mono">DDA-NEPAL-#9012</p>
                       </div>
                    </div>
                 </div>
                 <Shield className="absolute -bottom-10 -left-10 w-40 h-40 opacity-5 group-hover:scale-110 transition-transform" />
              </div>

              <div className="bg-card border border-border rounded-[3rem] p-10 shadow-lg">
                 <h3 className="text-lg font-black uppercase tracking-tighter italic mb-8 border-b border-border pb-4">Alert Center</h3>
                 <div className="space-y-6">
                    <AlertItem label="System Sync" content="Database latency stable." status="optimal" />
                    <AlertItem label="Orders" content="New incoming e-commerce traffic." status="info" />
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: any) {
  return (
     <div className="bg-card border border-border p-8 rounded-[2.5rem] shadow-md group hover:border-primary/30 transition-all border-dashed text-center md:text-left">
        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground mb-4 group-hover:bg-primary group-hover:text-primary-foreground mx-auto md:mx-0 transition-all">
           {icon}
        </div>
        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
        <h4 className="text-3xl font-black italic tracking-tighter uppercase">{value}</h4>
     </div>
  );
}

function RequestItem({ id, patient, medicine, time, status, actions, isOrder }: any) {
   return (
      <div className="flex flex-col md:flex-row items-center justify-between p-6 rounded-3xl bg-secondary/20 border border-border hover:bg-secondary/40 transition-all group">
         <div className="flex gap-6 items-center w-full">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${isOrder ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}`}>
               {isOrder ? <CreditCard size={20} /> : <Package size={20} />}
            </div>
            <div className="flex-1">
               <div className="flex items-center gap-3 mb-2">
                  <span className="text-[8px] font-mono text-primary font-black uppercase tracking-widest">ID: {isOrder ? 'ORD' : 'REQ'}-{id}</span>
                  <span className="text-[8px] font-mono text-muted-foreground uppercase tracking-widest">{time}</span>
                  <span className="text-[8px] font-mono text-primary font-black uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">{status}</span>
               </div>
               <h4 className="text-sm font-black uppercase tracking-tighter">{patient}</h4>
               <p className="text-[10px] text-muted-foreground uppercase tracking-widest truncate max-w-full">{medicine}</p>
            </div>
         </div>
         <div className="flex items-center justify-end gap-3 mt-4 md:mt-0 w-full md:w-auto">
            {actions.map((act: any, idx: number) => (
               <button 
                 key={idx}
                 onClick={act.onClick}
                 className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 ${act.primary ? 'bg-primary text-primary-foreground shadow-lg' : 'border border-border text-muted-foreground hover:bg-secondary'}`}
               >
                 {act.label} {act.icon && <act.icon size={12} />}
               </button>
            ))}
         </div>
      </div>
   );
}

function AlertItem({ label, content, status }: any) {
   const colors: any = { optimal: "bg-green-500", info: "bg-primary" };
   return (
      <div className="space-y-2">
         <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${colors[status]}`} />
            <p className="text-[10px] font-black uppercase tracking-widest">{label}</p>
         </div>
         <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{content}</p>
      </div>
   );
}
