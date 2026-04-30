import {
  Home,
  BookOpen,
  Swords,
  Dice5,
  Library,
  TrendingUp,
  Settings,
  MoreHorizontal,
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

/** Mobile bottom bar: primary destinations (always visible). */
export const bottomNavPrimaryItems: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/learn", label: "Learn", icon: BookOpen },
  { href: "/play", label: "Play", icon: Swords },
  { href: "/practice", label: "Practice", icon: Dice5 },
];

/** Shown in the bottom “More” sheet (reduces crowding on small screens). */
export const bottomNavMoreItems: NavItem[] = [
  { href: "/reference", label: "Reference", icon: Library },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/settings", label: "Settings", icon: Settings },
];

/** Placeholder item for the More trigger (not a route). */
export const bottomNavMoreTrigger: NavItem = {
  href: "#more",
  label: "More",
  icon: MoreHorizontal,
};
