import type { Metadata, Viewport } from "next";
import "./globals.css";
import StoreProvider from "@/store/provider";
import BottomNav from "@/components/layout/BottomNav";

export const metadata: Metadata = {
  title: "Mahjong Learning App",
  description: "Learn to play Mahjong with interactive lessons and quizzes",
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
      <body className="min-h-screen bg-surface antialiased">
        <StoreProvider>
          <main className="pb-16 max-w-lg mx-auto min-h-screen bg-white">
            {children}
          </main>
          <BottomNav />
        </StoreProvider>
      </body>
    </html>
  );
}
