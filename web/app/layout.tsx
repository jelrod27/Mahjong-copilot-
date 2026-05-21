import type { Metadata, Viewport } from "next";
import { Noto_Sans_SC, Noto_Serif_SC } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import StoreProvider from "@/store/provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const notoSans = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const notoSerif = Noto_Serif_SC({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "16 Bit Mahjong",
  description: "Learn and play Hong Kong Mahjong",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn(notoSans.variable, notoSerif.variable)}>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased">
        <StoreProvider>
          <TooltipProvider>
            {children}
            <Analytics />
          </TooltipProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
