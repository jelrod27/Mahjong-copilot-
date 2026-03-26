import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import BottomNav from "@/components/layout/BottomNav";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 p-3 bg-retro-bgLight border-b border-retro-border/20">
          <SidebarTrigger />
          <span className="font-pixel text-[10px] text-retro-gold retro-glow-strong">
            16 BIT MAHJONG
          </span>
        </header>

        <main className="flex-1 w-full max-w-7xl mx-auto px-4 lg:px-6 pb-20 lg:pb-8 pt-4 lg:pt-6">
          {children}
        </main>

        <BottomNav />
      </div>
    </SidebarProvider>
  );
}
