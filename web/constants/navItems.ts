import {
  Home,
  BookOpen,
  Swords,
  Dice5,
  Library,
  TrendingUp,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/learn", label: "Learn", icon: BookOpen },
  { href: "/play", label: "Play", icon: Swords },
  { href: "/practice", label: "Practice", icon: Dice5 },
  { href: "/reference", label: "Reference", icon: Library },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/settings", label: "Settings", icon: Settings },
];
