import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { CartProvider } from "@/context/CartContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MedConnect | Your Health, Your Nearest Pharmacy",
  description: "Connect with nearby pharmacies instantly using AI-powered prescription upload. Nepal's trusted medical link platform.",
  keywords: ["pharmacy", "medicine", "Nepal", "prescription", "healthcare", "medical"],
  authors: [{ name: "MedConnect" }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  openGraph: {
    title: "MedConnect | Your Health, Your Nearest Pharmacy",
    description: "Connect with nearby pharmacies instantly using AI-powered prescription upload.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-background text-foreground transition-colors duration-300 antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <CartProvider>
            <Navbar />
            <main className="relative">{children}</main>
            <Toaster position="top-center" richColors />
          </CartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
