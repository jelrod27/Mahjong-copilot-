"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
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
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { signOut } from "@/store/actions/authActions";

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  const handleSignOut = async () => {
    await dispatch(signOut() as any);
    router.push("/login");
  };

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
                      className="h-10"
                      render={<Link href={href} />}
                    >
                      <Icon size={18} />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {user && (
        <SidebarFooter className="p-3 border-t border-retro-border/20">
          <div className="flex items-center gap-3">
            {user.photoUrl ? (
              <img
                src={user.photoUrl}
                alt=""
                className="w-8 h-8 rounded-sm border border-retro-border/30"
              />
            ) : (
              <div className="w-8 h-8 rounded-sm bg-retro-panel border border-retro-border/30 flex items-center justify-center">
                <User size={14} className="text-retro-textDim" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-retro-text truncate">
                {user.displayName || user.email}
              </p>
              {user.displayName && (
                <p className="text-xs text-retro-textDim truncate">
                  {user.email}
                </p>
              )}
            </div>
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-sm text-retro-textDim hover:text-retro-accent hover:bg-retro-accent/10 transition-colors"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
