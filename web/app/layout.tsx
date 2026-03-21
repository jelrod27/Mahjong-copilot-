import type { Metadata, Viewport } from "next";
import "./globals.css";
import StoreProvider from "@/store/provider";

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
    <html lang="en">
      <body className="min-h-screen bg-retro-bg text-retro-text font-retro antialiased">
        <StoreProvider>
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}
