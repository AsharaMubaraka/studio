
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Phone, Hash, CalendarDays } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { format } from "date-fns";
// import { Separator } from "@/components/ui/separator"; // Replaced with div for repeating border

interface DateInfo {
  monthYear: string;
  dayOfMonth: string;
  dayOfWeek: string;
  islamicMonth: string;
  islamicDay: string;
}

// const BORDER_IMAGE_URL = "https://misbah.info/wp-content/uploads/2024/03/bottom-border-1.png"; // No longer needed directly as img src

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
          <CardContent className="p-0 relative h-40 md:h-48">
            <video autoPlay loop muted playsInline className="absolute top-0 left-0 w-full h-full object-cover z-0">
              <source src="https://misbah.info/wp-content/uploads/2024/05/misbah-bg.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            <div className="absolute inset-0 bg-black/30 flex items-center justify-between p-4 md:p-6 z-10">
              <div className="text-white">
                <p className="text-sm md:text-md">{dateInfo.monthYear}</p>
                <p className="text-4xl md:text-5xl font-bold">{dateInfo.dayOfMonth}</p>
                <p className="text-sm md:text-md">{dateInfo.dayOfWeek}</p>
              </div>
              <div className="text-right text-white">
                <p className="text-lg md:text-xl font-semibold">{dateInfo.islamicDay}</p>
                <p className="text-sm md:text-md">{dateInfo.islamicMonth}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-lg h-40 md:h-48 animate-pulse bg-card/80"></Card>
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
            <User className="mr-2 h-5 w-5 text-primary" />
            Notification
          </CardTitle>
          <div className="decorative-border-repeat decorative-border-repeat-h20 my-2"></div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm pt-0">
          <p className="font-semibold">Salaam</p>
          <p>Kem cho sagla behno aa ashara ohbat na dino ma Al Aqeeq committee ye Aaje Saturday 17th May Taheri Markaz ma</p>
          <p className="font-bold text-primary">*ASHARA OHBAT NI MAJLIS ORGANISE KIDI CHE*</p>
          <p className="text-muted-foreground">*Time : 4:30pm*</p>
          <p>Muala tus ni khushi hasil karta huwa Taheri mohalla na tamam behno aa majlis ma shamil thai ane waqt par hazir thai em iltemas che</p>
          <div className="flex items-center text-xs text-muted-foreground pt-2">
            <CalendarDays className="mr-2 h-4 w-4" />
            <span>17-May-2025</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
