import type { Metadata, Viewport } from "next";
import { Noto_Sans_SC, Noto_Serif_SC } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import StoreProvider from "@/store/provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SITE_NAME, SITE_URL, TITLE_SUFFIX } from "@/lib/siteMetadata";

const notoSans = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sans",
  display: "swap",
});

const notoSerif = Noto_Serif_SC({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-noto-serif",
  display: "swap",
});

export const metadata: Metadata = {
  // metadataBase makes every route's relative `alternates.canonical` resolve
  // to an absolute URL. Without it Next drops canonicals silently.
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Learn and Play Hong Kong Mahjong`,
    // Pages set a bare title; the suffix is applied here so it stays
    // consistent and no page has to remember it.
    template: `%s${TITLE_SUFFIX}`,
  },
  description:
    'Learn Hong Kong Mahjong from scratch — tiles, sets, scoring, and how a hand actually runs — then play a full game solo against AI. Free, no account, works offline.',
  applicationName: SITE_NAME,
  alternates: { canonical: '/' },
  openGraph: {
    // Defaults, so a route that never sets its own openGraph still renders a
    // complete social card rather than a title-less one.
    title: `${SITE_NAME} — Learn and Play Hong Kong Mahjong`,
    description:
      'Learn Hong Kong Mahjong from scratch — tiles, sets, scoring, and how a hand actually runs — then play a full game solo against AI.',
    siteName: SITE_NAME,
    type: 'website',
    locale: 'en_US',
  },
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
