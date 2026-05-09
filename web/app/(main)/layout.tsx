import { SidebarShell } from "@/components/layout/SidebarShell";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SidebarShell>{children}</SidebarShell>;
}
