
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Bell, CalendarDays, User, Phone, Hash, QrCode, Newspaper, Youtube, PlayCircle } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { format } from "date-fns";

interface DateInfo {
  monthYear: string;
  dayOfMonth: string;
  dayOfWeek: string;
  islamicMonth: string;
  islamicDay: string;
}

export default function DashboardPage() {
  const [dateInfo, setDateInfo] = useState<DateInfo | null>(null);

  useEffect(() => {
    document.title = "Dashboard | Anjuman Hub";
    const now = new Date();
    setDateInfo({
      monthYear: format(now, "MMMM, yyyy"),
      dayOfMonth: format(now, "dd"),
      dayOfWeek: format(now, "EEEE"),
      islamicMonth: "Zilqadatil Haram", // Placeholder
      islamicDay: "۲۲", // Placeholder
    });
  }, []);

  return (
    <div className="animate-fadeIn space-y-6">
      {dateInfo ? (
        <Card className="shadow-lg overflow-hidden">
          <CardContent className="p-0">
            <div className="relative">
              <Image
                src="https://placehold.co/600x200.png"
                alt="Decorative background"
                width={600}
                height={200}
                className="w-full h-32 object-cover"
                data-ai-hint="mosque architecture"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-primary/70 to-primary/40 flex items-center justify-between p-4 md:p-6">
                <div className="text-primary-foreground">
                  <p className="text-sm md:text-md">{dateInfo.monthYear}</p>
                  <p className="text-4xl md:text-5xl font-bold">{dateInfo.dayOfMonth}</p>
                  <p className="text-sm md:text-md">{dateInfo.dayOfWeek}</p>
                </div>
                <div className="text-right text-primary-foreground">
                  <p className="text-lg md:text-xl font-semibold">{dateInfo.islamicDay}</p>
                  <p className="text-sm md:text-md">{dateInfo.islamicMonth}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-lg h-32 animate-pulse bg-card/80"></Card>
      )}

      <Card className="shadow-lg">
        <CardContent className="p-4 md:p-6 flex flex-col sm:flex-row items-center gap-4">
          <Image
            src="https://placehold.co/100x100.png?text=QR"
            alt="QR Code"
            width={100}
            height={100}
            className="rounded-md border"
            data-ai-hint="qr code"
          />
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-lg flex items-center">
              <User className="mr-2 h-5 w-5 text-primary" />
              Murtaza bhai Saifuddin bhai Shakir
            </p>
            <p className="text-muted-foreground flex items-center">
              <Hash className="mr-2 h-4 w-4 text-primary/80" />
              ITS: 20403348
            </p>
            <p className="text-muted-foreground flex items-center">
              <Phone className="mr-2 h-4 w-4 text-primary/80" />
              Phone: 99482594
            </p>
            <p className="text-muted-foreground flex items-center">
              <Hash className="mr-2 h-4 w-4 text-primary/80" />
              Sabeel: 8433
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <Bell className="mr-2 h-5 w-5 text-primary" />
            Notification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="font-semibold text-primary-foreground/90">Salaam</p>
          <p>Kem cho sagla behno aa ashara ohbat na dino ma Al Aqeeq committee ye Aaje Saturday 17th May Taheri Markaz ma</p>
          <p className="font-bold text-primary-foreground">*ASHARA OHBAT NI MAJLIS ORGANISE KIDI CHE*</p>
          <p className="text-muted-foreground">*Time : 4:30pm*</p>
          <p>Muala tus ni khushi hasil karta huwa Taheri mohalla na tamam behno aa majlis ma shamil thai ane waqt par hazir thai em iltemas che</p>
          <div className="flex items-center text-xs text-muted-foreground pt-2">
            <CalendarDays className="mr-2 h-4 w-4" />
            <span>17-May-2025</span>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <Newspaper className="mr-2 h-5 w-5 text-primary" />
            Latest News
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading latest news...</p>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <Youtube className="mr-2 h-5 w-5 text-primary" />
            Live Relay
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-muted-foreground">Watch important community broadcasts and events live.</p>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/live-relay">
              <PlayCircle className="mr-2 h-4 w-4" /> Go to Live Relay
            </Link>
          </Button>
        </CardContent>
      </Card>

    </div>
  );
}
