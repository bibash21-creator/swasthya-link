"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Package, ShoppingBag, Filter, X, MapPin, Star, Shield, ChevronDown, Check } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";

export default function ShopPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "medicine" | "service">("all");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [justAdded, setJustAdded] = useState(false);

  const { addToCart, totalItems, totalPrice } = useCart();

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
  const uploadUrl = process.env.NEXT_PUBLIC_UPLOAD_URL || "http://localhost:8000";

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filter !== "all") params.set("type", filter);
      const res = await fetch(`${apiUrl}/pharmacies/shop?${params.toString()}`);
      if (res.ok) setProducts(await res.json());
    } catch (e) {
      console.error("Failed to fetch shop products", e);
    } finally {
      setIsLoading(false);
    }
  }, [search, filter]);

  useEffect(() => {
    const timer = setTimeout(fetchProducts, 300);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  const handleAddToCart = () => {
    if (!selectedProduct) return;
    addToCart({
      id: selectedProduct.id,
      medicine_name: selectedProduct.medicine_name,
      price: selectedProduct.price || 0,
      quantity: 1,
      pharmacy_id: selectedProduct.pharmacy_id,
      pharmacy_name: selectedProduct.pharmacy_name,
      image_url: selectedProduct.image_url
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  };

  // Group by pharmacy
  const byPharmacy = products.reduce((acc: any, p: any) => {
    const key = p.pharmacy_name || "Unknown Pharmacy";
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background text-foreground pt-28 pb-20 px-4 md:px-8 font-mono">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-12 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] text-primary uppercase tracking-[0.4em] font-black">Live Pharmacy Marketplace</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black italic uppercase tracking-tighter mb-4">
            Med<span className="text-primary">Shop</span>
          </h1>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">
            Browse medicines and services from verified pharmacies near you. Order online, pick up or get delivered.
          </p>
        </div>

        {/* Search + Filter Bar */}
        <div className="sticky top-20 z-10 mb-10">
          <div className="flex flex-col sm:flex-row gap-3 bg-background/80 backdrop-blur-xl py-4 border-b border-border">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search medicines, services..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-secondary border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              {(["all", "medicine", "service"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-primary text-primary-foreground shadow-lg' : 'bg-secondary border border-border text-muted-foreground hover:text-foreground'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground text-sm">Loading pharmacy catalog...</p>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <ShoppingBag size={48} className="text-muted-foreground" />
            <p className="text-muted-foreground text-lg">No products found.</p>
            <p className="text-muted-foreground text-sm">Pharmacies haven&apos;t listed products yet, or nothing matches your search.</p>
          </div>
        ) : (
          <div className="space-y-14">
            {Object.entries(byPharmacy).map(([pharmacyName, items]: any) => (
              <section key={pharmacyName}>
                {/* Pharmacy Section Header */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <Shield size={18} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black uppercase tracking-tighter">{pharmacyName}</h2>
                    <p className="text-[9px] text-muted-foreground font-mono uppercase tracking-widest">{items.length} products available</p>
                  </div>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Products Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {items.map((product: any) => (
                    <motion.div
                      key={product.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ y: -4, transition: { duration: 0.15 } }}
                      onClick={() => setSelectedProduct(product)}
                      className="cursor-pointer rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all overflow-hidden group"
                    >
                      {/* Product Image */}
                      <div className="aspect-square overflow-hidden bg-secondary/30">
                        {product.image_url ? (
                          <img
                            src={`${uploadUrl}${product.image_url}`}
                            alt={product.medicine_name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                            <Package size={36} />
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="p-3">
                        <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mb-2 inline-block ${product.type === 'service' ? 'bg-blue-500/10 text-blue-500' : 'bg-primary/10 text-primary'}`}>
                          {product.type}
                        </span>
                        <h3 className="text-xs font-black uppercase tracking-tighter line-clamp-2 leading-tight mb-1">{product.medicine_name}</h3>
                        {product.description && <p className="text-[8px] text-muted-foreground line-clamp-1 mb-2">{product.description}</p>}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm font-black text-primary">
                            {product.price ? `रू ${product.price}` : 'Free'}
                          </span>
                          <span className="text-[7px] text-muted-foreground font-mono">{product.quantity} left</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* Cart Float */}
      <AnimatePresence>
        {totalItems > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
          >
            <Link
              href="/shop/checkout"
              className="px-8 py-4 bg-primary text-primary-foreground rounded-full shadow-2xl flex items-center gap-4 hover:scale-105 transition-transform group"
            >
              <div className="relative">
                <ShoppingBag size={20} />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-white text-primary text-[8px] font-black rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              </div>
              <div className="h-4 w-px bg-primary-foreground/20" />
              <div className="text-left">
                <p className="text-[8px] uppercase tracking-widest opacity-70 font-black">Checkout Now</p>
                <p className="text-sm font-black">रू {totalPrice}</p>
              </div>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-2xl"
            onClick={() => setSelectedProduct(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              {/* Image */}
              <div className="aspect-video bg-secondary/30 overflow-hidden">
                {selectedProduct.image_url ? (
                  <img
                    src={`${uploadUrl}${selectedProduct.image_url}`}
                    alt={selectedProduct.medicine_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <Package size={56} />
                  </div>
                )}
              </div>
              {/* Details */}
              <div className="p-8">
                <span className={`text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-3 inline-block ${selectedProduct.type === 'service' ? 'bg-blue-500/10 text-blue-500' : 'bg-primary/10 text-primary'}`}>
                  {selectedProduct.type}
                </span>
                <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">{selectedProduct.medicine_name}</h2>
                {selectedProduct.description && (
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{selectedProduct.description}</p>
                )}
                <div className="flex items-center justify-between py-4 border-t border-border">
                  <div>
                    <p className="text-[8px] text-muted-foreground uppercase tracking-widest">Price</p>
                    <p className="text-2xl font-black text-primary">{selectedProduct.price ? `रू ${selectedProduct.price}` : 'Free'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] text-muted-foreground uppercase tracking-widest">In Stock</p>
                    <p className="text-xl font-black">{selectedProduct.quantity} units</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 py-3 border-t border-border mb-6">
                  <Shield size={14} className="text-primary flex-shrink-0" />
                  <div>
                    <p className="text-[8px] text-muted-foreground uppercase tracking-widest">Sold by</p>
                    <p className="text-xs font-black uppercase">{selectedProduct.pharmacy_name}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleAddToCart}
                    className={`flex-1 h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg ${justAdded ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground hover:opacity-90'}`}
                  >
                    {justAdded ? <><Check size={14} /> Added to Cart</> : <><ShoppingBag size={14} /> Add to Cart</>}
                  </button>
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="h-12 px-4 border border-border rounded-2xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
