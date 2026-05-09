import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import StoreProvider from "@/store/provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "16 Bit Mahjong",
  description: "Learn and play Hong Kong Mahjong",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn(inter.variable, plusJakarta.variable)}>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased">
        <StoreProvider>
          <TooltipProvider>
            {children}
          </TooltipProvider>
          <Analytics />
        </StoreProvider>
      </body>
    </html>
  );
}
