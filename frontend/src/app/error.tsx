"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to monitoring service
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center"
      >
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-destructive" />
        </div>

        <h1 className="text-3xl font-black uppercase tracking-tighter mb-4">
          Something Went Wrong
        </h1>

        <p className="text-muted-foreground mb-8">
          We apologize for the inconvenience. An unexpected error has occurred.
          {error.digest && (
            <span className="block mt-2 text-xs font-mono opacity-50">
              Error ID: {error.digest}
            </span>
          )}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm uppercase tracking-wider hover:opacity-90 transition-opacity"
          >
            <RefreshCw size={18} />
            Try Again
          </motion.button>

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-xl font-bold text-sm uppercase tracking-wider hover:opacity-90 transition-opacity"
          >
            <Home size={18} />
            Go Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
