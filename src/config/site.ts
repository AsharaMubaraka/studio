
import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, Bell, Globe, Youtube, Users } from 'lucide-react'; // Added Users

export type NavItemConfig = {
  title: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
};

export const userNavItems: NavItemConfig[] = [
  {
    title: 'Home',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Notifications',
    href: '/announcements',
    icon: Bell,
  },
  {
    title: 'Website',
    href: '/web-view',
    icon: Globe,
  },
  {
    title: 'Live Relay',
    href: '/live-relay',
    icon: Youtube,
  },
];

export const adminNavItems: NavItemConfig[] = [
  {
    title: 'Home',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Notifications',
    href: '/announcements',
    icon: Bell,
  },
  {
    title: 'User List', // Changed from Website
    href: '/users',   // New href for user list
    icon: Users,        // New icon
  },
  {
    title: 'Live Relay',
    href: '/live-relay',
    icon: Youtube,
  },
];

export const siteConfig = {
  name: "Anjuman Hub",
  description: "Community Hub for Anjuman Members.",
};
