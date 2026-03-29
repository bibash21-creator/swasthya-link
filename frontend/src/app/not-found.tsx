"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Search, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center"
      >
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Search className="w-10 h-10 text-primary" />
        </div>

        <h1 className="text-6xl font-black uppercase tracking-tighter mb-2">
          404
        </h1>

        <h2 className="text-2xl font-bold uppercase tracking-tight mb-4">
          Page Not Found
        </h2>

        <p className="text-muted-foreground mb-8">
          The page you are looking for might have been removed, had its name
          changed, or is temporarily unavailable.
        </p>

        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm uppercase tracking-wider hover:opacity-90 transition-opacity"
        >
          <ArrowLeft size={18} />
          Back to Home
        </Link>
      </motion.div>
    </div>
  );
}
