
import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Bell, Megaphone, Globe, Youtube } from "lucide-react";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Dashboard",
};

const quickLinks = [
  { title: "View Announcements", href: "/announcements", icon: Megaphone, description: "Stay updated with the latest news." },
  { title: "Explore Web View", href: "/web-view", icon: Globe, description: "Access external resources easily." },
  { title: "Join Live Relay", href: "/live-relay", icon: Youtube, description: "Watch live broadcasts and events." },
];

export default function DashboardPage() {
  return (
    <div className="animate-fadeIn space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold tracking-tight">Welcome to Anjuman Hub</CardTitle>
          <CardDescription className="text-lg">Your central place for community information and resources.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Navigate through announcements, join live relays, or explore web content all from one place. We're glad to have you here!</p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((link) => (
          <Card key={link.title} className="flex flex-col transition-all hover:shadow-xl">
            <CardHeader className="flex-row items-center gap-4 pb-2">
               <div className="rounded-full bg-primary/10 p-3 text-primary">
                <link.icon className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl">{link.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-sm text-muted-foreground">{link.description}</p>
            </CardContent>
            <CardContent>
               <Button asChild variant="outline" className="w-full">
                <Link href={link.href}>
                  Go to {link.title.split(" ")[1]} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <Bell className="mr-3 h-6 w-6 text-primary" />
            Notifications
          </CardTitle>
          <CardDescription>You have no new notifications at this time.</CardDescription>
        </CardHeader>
        <CardContent>
            <Image src="https://placehold.co/600x300.png" alt="Empty state illustration" width={600} height={300} className="mx-auto rounded-md" data-ai-hint="notifications empty state" />
        </CardContent>
      </Card>
    </div>
  );
}
