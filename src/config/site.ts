
import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, Bell, Globe, Youtube, Users, MessageSquarePlus } from 'lucide-react'; // Added MessageSquarePlus

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
  // Replaced 'Notifications' (/announcements) with 'Send Notification' for main admin nav
  // Admins can still access /announcements via the Bell icon in the AppShell header
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
];

export const siteConfig = {
  name: "Anjuman Hub",
  description: "Community Hub for Anjuman Members.",
};

    
