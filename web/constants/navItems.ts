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
  /** Which tier of the mobile bottom nav this item belongs in. */
  tier: "primary" | "more";
}

export const navItems: NavItem[] = [
  { href: "/", label: "Home", icon: Home, tier: "primary" },
  { href: "/learn", label: "Learn", icon: BookOpen, tier: "primary" },
  { href: "/play", label: "Play", icon: Swords, tier: "primary" },
  { href: "/practice", label: "Practice", icon: Dice5, tier: "primary" },
  { href: "/reference", label: "Reference", icon: Library, tier: "more" },
  { href: "/progress", label: "Progress", icon: TrendingUp, tier: "more" },
  { href: "/settings", label: "Settings", icon: Settings, tier: "more" },
];

/** Mobile bottom bar: primary destinations (always visible). */
export const bottomNavPrimaryItems: NavItem[] = navItems.filter(
  (item) => item.tier === "primary",
);

/** Shown in the bottom “More” sheet (reduces crowding on small screens). */
export const bottomNavMoreItems: NavItem[] = navItems.filter(
  (item) => item.tier === "more",
);

/** Placeholder item for the More trigger (not a route, not part of navItems). */
export const bottomNavMoreTrigger: NavItem = {
  href: "#more",
  label: "More",
  icon: MoreHorizontal,
  tier: "more",
};
