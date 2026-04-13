import type { Metadata, Viewport } from "next";
import { Inter, VT323, Press_Start_2P } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import StoreProvider from "@/store/provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const vt323 = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-retro",
});

const pressStart2P = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
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
    <html lang="en" className={cn(inter.variable, vt323.variable, pressStart2P.variable)}>
      <body className="min-h-screen bg-retro-bg text-retro-text font-sans antialiased">
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
