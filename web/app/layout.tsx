import type { Metadata, Viewport } from "next";
import { Inter, VT323, Press_Start_2P } from "next/font/google";
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
  title: {
    default: "16 Bit Mahjong — Learn & Play Hong Kong Mahjong",
    template: "%s | 16 Bit Mahjong",
  },
  description: "Master Hong Kong Mahjong with interactive lessons, quizzes, and AI opponents. Free retro-styled mahjong learning platform.",
  metadataBase: new URL("https://16bitmahjong.co"),
  openGraph: {
    title: "16 Bit Mahjong — Learn & Play Hong Kong Mahjong",
    description: "Master Hong Kong Mahjong with interactive lessons, quizzes, and AI opponents.",
    url: "https://16bitmahjong.co",
    siteName: "16 Bit Mahjong",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "16 Bit Mahjong",
    description: "Master Hong Kong Mahjong with interactive lessons, quizzes, and AI opponents.",
  },
  robots: {
    index: true,
    follow: true,
  },
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
        </StoreProvider>
      </body>
    </html>
  );
}
