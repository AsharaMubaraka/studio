
import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, Bell, Globe, Youtube, Users, MessageSquarePlus, Settings } from 'lucide-react'; // Added Settings

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
    title: 'Send Notification',
    href: '/send-notification',
    icon: MessageSquarePlus,
  },
  {
    title: 'User List',
    href: '/users',
    icon: Users,
  },
  {
    title: 'Live Relay',
    href: '/live-relay',
    icon: Youtube,
  },
  {
    title: 'App Settings', // New settings page
    href: '/settings',
    icon: Settings,
  },
];

export const siteConfig = {
  name: "Ashara Mubaraka",
  description: "Ashara Mubaraka Official application for communication and better view",
  defaultLogoUrl: "https://live.lunawadajamaat.org/wp-content/uploads/2025/05/Picsart_25-05-19_18-32-50-677.png",
};
