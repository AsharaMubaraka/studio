
import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, Megaphone, Globe, Youtube, Phone, HandMetal, Bell } from 'lucide-react'; // Added Phone, HandMetal, Bell

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
};

// Updated navItems to somewhat match the screenshot's bottom bar, assuming "Home" is Dashboard
// and "Notifications" is Announcements. "Website" is Web View. "Izan" and "Contact" are new.
export const navItems: NavItem[] = [
  {
    title: 'Home', // Was 'Dashboard'
    href: '/dashboard',
    icon: LayoutDashboard, // Or Home icon if preferred and available
  },
  {
    title: 'Notifications', // Was 'Announcements'
    href: '/announcements',
    icon: Bell, // Using Bell for Notifications
  },
  {
    title: 'Website', // Was 'Web View'
    href: '/web-view',
    icon: Globe,
  },
  {
    title: 'Izan', // New Item
    href: '/live-relay', // Pointing Live Relay to Izan for now, can be changed
    icon: HandMetal, // Lucide has HandMetal, not a plain hand. Or RadioTower from dashboard
  },
  {
    title: 'Contact', // New Item
    href: '/contact',
    icon: Phone,
  },
  // { // Original Live Relay if Izan gets its own page
  //   title: 'Live Relay',
  //   href: '/live-relay',
  //   icon: Youtube,
  // },
];

export const siteConfig = {
  name: "Anjuman Hub",
  description: "Community Hub for Anjuman Members.",
};
