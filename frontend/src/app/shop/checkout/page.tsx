"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, X, Plus, Minus, CreditCard, Truck, CheckCircle2, ArrowRight, Wallet, Package } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getBaseUrl } from "@/lib/api";
import { toast } from "sonner";

export default function CheckoutPage() {
  const { cart, removeFromCart, clearCart, totalPrice, totalItems, addToCart } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "esewa" | "khalti" | "stripe">("cod");
  
  const router = useRouter();
  const apiUrl = getBaseUrl();

  const handlePlaceOrder = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please login as a patient to place an order.");
      return;
    }

    setIsSubmitting(true);
    try {
      const orderData = {
        pharmacy_id: cart[0].pharmacy_id,
        payment_method: paymentMethod,
        items: cart.map(item => ({
          medicine_id: item.id,
          quantity: item.quantity
        }))
      };

      const res = await fetch(`${apiUrl}/orders/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      });

      if (res.ok) {
        const data = await res.json();
        
        if (paymentMethod === "esewa") {
          console.log("Redirecting to eSewa...");
        } else if (paymentMethod === "khalti") {
          console.log("Opening Khalti SDK...");
        } else if (paymentMethod === "stripe") {
           console.log("Redirecting to Stripe Checkout...");
           // Placeholder for Stripe Session
        }

        setOrderComplete(data);
        clearCart();
      } else {
        const err = await res.json();
        toast.error(err.detail || "Failed to place order");
      }
    } catch (e) {
      console.error(e);
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 font-mono">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full bg-card border border-border rounded-[3rem] p-10 text-center shadow-2xl"
        >
          <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter mb-2">Order Confirmed!</h1>
          <p className="text-muted-foreground text-sm mb-8">
            Your order <span className="text-foreground font-bold">#{orderComplete.id}</span> has been placed successfully at {cart.length > 0 ? cart[0].pharmacy_name : 'the pharmacy'}.
          </p>
          <div className="space-y-3">
             <Link href="/dashboard/patient" className="block w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest text-[10px]">
               View in Dashboard
             </Link>
             <Link href="/shop" className="block w-full py-4 bg-secondary text-foreground rounded-2xl font-black uppercase tracking-widest text-[10px]">
               Continue Shopping
             </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-background pt-32 px-6 flex flex-col items-center font-mono">
        <div className="w-24 h-24 bg-secondary rounded-full flex items-center justify-center mb-6 text-muted-foreground">
          <ShoppingBag size={40} />
        </div>
        <h1 className="text-2xl font-black uppercase tracking-tighter mb-2">Your cart is empty</h1>
        <p className="text-muted-foreground mb-8">Browse the shop to find medicines and services.</p>
        <Link href="/shop" className="px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
          Back to Shop <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-28 pb-20 px-4 md:px-8 font-mono">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-10">
          <Link href="/shop" className="p-2 hover:bg-secondary rounded-full transition-colors text-muted-foreground">
            <X size={20} />
          </Link>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic">Review <span className="text-primary">Order</span></h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Items List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden">
               <div className="p-6 border-b border-border bg-secondary/30">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ordering from</p>
                  <p className="text-lg font-black uppercase">{cart[0].pharmacy_name}</p>
               </div>
               <div className="divide-y divide-border">
                  {cart.map((item) => (
                    <div key={item.id} className="p-6 flex gap-4 items-center">
                      <div className="w-16 h-16 bg-secondary rounded-2xl flex-shrink-0 flex items-center justify-center text-muted-foreground">
                         <Package size={24} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-black uppercase tracking-tight">{item.medicine_name}</h3>
                        <p className="text-xs text-primary font-black">रू {item.price}</p>
                      </div>
                      <div className="flex items-center gap-3 bg-secondary rounded-xl p-1">
                        <button 
                          onClick={() => item.quantity > 1 ? addToCart({...item, quantity: -1}) : removeFromCart(item.id)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-background rounded-lg transition-colors"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="text-sm font-black w-4 text-center">{item.quantity}</span>
                        <button 
                          onClick={() => addToCart({...item, quantity: 1})}
                          className="w-8 h-8 flex items-center justify-center hover:bg-background rounded-lg transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
               </div>
            </div>

            {/* Payment Selection */}
            <div className="bg-card border border-border rounded-[2.5rem] p-6">
              <h2 className="text-lg font-black uppercase tracking-tighter mb-6">Payment Method</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'cod', label: 'Cash on Delivery', icon: Truck },
                  { id: 'stripe', label: 'Stripe', icon: CreditCard },
                  { id: 'esewa', label: 'eSewa', icon: Wallet },
                  { id: 'khalti', label: 'Khalti', icon: CreditCard },
                ].map((method: any) => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${paymentMethod === method.id ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'}`}
                  >
                    <method.icon size={20} className={paymentMethod === method.id ? 'text-primary' : 'text-muted-foreground'} />
                    <span className="text-[9px] font-black uppercase tracking-widest">{method.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-[2.5rem] p-8 sticky top-28">
              <h2 className="text-xl font-black uppercase tracking-tighter mb-6">Order Summary</h2>
              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-muted-foreground text-sm uppercase tracking-widest font-black">
                  <span>Subtotal</span>
                  <span>रू {totalPrice}</span>
                </div>
                <div className="flex justify-between text-muted-foreground text-sm uppercase tracking-widest font-black">
                  <span>Delivery</span>
                  <span>Free</span>
                </div>
                <div className="pt-4 border-t border-border flex justify-between items-end">
                   <span className="text-sm font-black uppercase tracking-widest">Total</span>
                   <span className="text-3xl font-black text-primary">रू {totalPrice}</span>
                </div>
              </div>
              
              <button
                onClick={handlePlaceOrder}
                disabled={isSubmitting}
                className="w-full h-16 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:opacity-90 transition-all disabled:opacity-50 shadow-xl shadow-primary/20"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>Confirm Order <ArrowRight size={18} /></>
                )}
              </button>
              
              <p className="mt-6 text-[8px] text-muted-foreground text-center uppercase tracking-widest leading-relaxed">
                By placing this order, you agree to connect with the selected pharmacy for fulfillment and delivery.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
