
import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, Bell, Globe, Youtube, Users, MessageSquarePlus, Settings, Image as ImageIconLucide, DownloadCloud } from 'lucide-react'; // Added ImageIconLucide, DownloadCloud

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
  {
    title: 'Media Downloads', // New Public Page
    href: '/downloads',
    icon: DownloadCloud,
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
    title: 'Manage Media', // New Admin Page
    href: '/manage-media',
    icon: ImageIconLucide,
  },
  {
    title: 'Live Relay',
    href: '/live-relay',
    icon: Youtube,
  },
  {
    title: 'App Settings',
    href: '/settings',
    icon: Settings,
  },
];

export const siteConfig = {
  name: "Ashara Mubaraka",
  description: "Ashara Mubaraka: Get the latest updates on events and everything you need to know.",
  defaultLogoUrl: "https://ashara1447.udaem.site/transport/logo.png",
};

export const notificationCategories = ["General", "Important", "Event", "Update"] as const;
export type NotificationCategory = typeof notificationCategories[number];
