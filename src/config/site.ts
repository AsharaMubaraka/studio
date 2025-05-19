
import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, Bell, Globe, Youtube } from 'lucide-react'; // Updated Megaphone to Bell, HandMetal to Youtube, Removed Phone

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
};

export const navItems: NavItem[] = [
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
    title: 'Live Relay', // Changed from 'Izan'
    href: '/live-relay',
    icon: Youtube, // Changed from HandMetal
  },
  // { // Removed Contact item
  //   title: 'Contact',
  //   href: '/contact',
  //   icon: Phone,
  // },
];

export const siteConfig = {
  name: "Anjuman Hub",
  description: "Community Hub for Anjuman Members.",
};

