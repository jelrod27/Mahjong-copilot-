"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { navItems } from "@/constants/navItems";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-retro-border/20">
        <Link href="/" className="block">
          <h1 className="font-pixel text-sm text-retro-gold retro-glow-strong leading-relaxed">
            16 BIT
            <br />
            MAHJONG
          </h1>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(({ href, label, icon: Icon }) => {
                const isActive =
                  href === "/" ? pathname === "/" : pathname.startsWith(href);
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      className="h-10 text-retro-text hover:text-retro-accent transition-colors"
                      render={<Link href={href} aria-current={isActive ? "page" : undefined} />}
                    >
                      <span aria-hidden className={isActive ? "text-retro-accent" : "text-retro-textDim"}>
                        {isActive ? "►" : " "}
                      </span>
                      <Icon size={18} className={isActive ? "text-retro-accent" : ""} />
                      <span className="font-medium">{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-retro-border/10 bg-retro-bgLight/50 backdrop-blur-sm">
        <div className="rounded-sm border border-retro-cyan/20 bg-retro-cyan/5 p-3 text-center">
          <p className="font-pixel text-[9px] text-retro-cyan tracking-tighter">
            LOCAL MODE
          </p>
          <p className="mt-2 font-sans text-xs text-retro-textDim leading-relaxed">
            Progress stays on this device. Accounts return with multiplayer.
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
