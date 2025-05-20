
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { User, Phone, Hash, CalendarDays, Loader2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { format } from "date-fns";

interface DateInfo {
  monthYear: string;
  dayOfMonth: string;
  dayOfWeek: string;
  islamicMonth: string | null;
  islamicDay: string | null;
  islamicYear: string | null;
}

interface LocalHijriDataEntry {
  gregorian_date: string; // Expected format: "YYYY-MM-DD"
  hijri_day: string;
  hijri_month_name_full: string;
  hijri_year: string;
}

export default function DashboardPage() {
  const [dateInfo, setDateInfo] = useState<DateInfo | null>(null);
  const [isDateLoading, setIsDateLoading] = useState(true);
  const [hijriDataError, setHijriDataError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Dashboard | Anjuman Hub";

    async function loadDates() {
      setIsDateLoading(true);
      setHijriDataError(null);

      const now = new Date();
      const gregorianTodayFormatted = format(now, "yyyy-MM-dd");

      let hijriDay: string | null = null;
      let hijriMonth: string | null = null;
      let hijriYear: string | null = null;

      try {
        const response = await fetch("/hijri_calendar_data.json");
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Hijri calendar data file not found. Please ensure 'public/hijri_calendar_data.json' exists.");
          }
          throw new Error(`Failed to load Hijri calendar data. Status: ${response.status}`);
        }
        const calendarData: LocalHijriDataEntry[] = await response.json();
        
        const todayEntry = calendarData.find(entry => entry.gregorian_date === gregorianTodayFormatted);

        if (todayEntry) {
          hijriDay = todayEntry.hijri_day;
          hijriMonth = todayEntry.hijri_month_name_full;
          hijriYear = todayEntry.hijri_year;
        } else {
          setHijriDataError(`Hijri date not found for ${gregorianTodayFormatted} in local data.`);
        }
      } catch (error: any) {
        console.error("Error processing local Hijri data:", error);
        setHijriDataError(error.message || "Error loading Hijri date from local file.");
      }

      setDateInfo({
        monthYear: format(now, "MMMM, yyyy"),
        dayOfMonth: format(now, "dd"),
        dayOfWeek: format(now, "EEEE"),
        islamicMonth: hijriMonth,
        islamicDay: hijriDay,
        islamicYear: hijriYear,
      });
      setIsDateLoading(false);
    }

    loadDates();
  }, []);

  return (
    <div className="animate-fadeIn space-y-6">
      {isDateLoading ? (
        <Card className="shadow-lg overflow-hidden h-48 md:h-56 flex items-center justify-center bg-card/80">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4 text-lg">Loading date...</p>
        </Card>
      ) : dateInfo ? (
        <Card className="shadow-lg overflow-hidden">
          <CardContent className="p-0 relative h-48 md:h-56">
            <video autoPlay loop muted playsInline className="absolute top-0 left-0 w-full h-full object-cover z-0">
              <source src="https://misbah.info/wp-content/uploads/2024/05/misbah-bg.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            <div className="absolute inset-0 bg-black/60 flex flex-col md:flex-row items-center justify-center md:justify-around gap-4 md:gap-8 p-4 md:p-6 z-10 text-center">
              {/* Islamic Date Block (Left / Top) */}
              <div className="text-white">
                {dateInfo.islamicDay && dateInfo.islamicMonth && dateInfo.islamicYear ? (
                  <>
                    <p className="text-2xl md:text-3xl font-semibold">{dateInfo.islamicDay}</p>
                    <p className="text-md md:text-lg">{dateInfo.islamicMonth}</p>
                    <p className="text-sm md:text-base">{dateInfo.islamicYear}H</p>
                  </>
                ) : (
                  <p className="text-sm text-amber-400">{hijriDataError || "Hijri date unavailable"}</p>
                )}
              </div>
              
              {/* Gregorian Date Block (Right / Bottom) */}
              <div className="text-white">
                <p className="text-xl md:text-2xl font-medium">{dateInfo.monthYear}</p>
                <p className="text-6xl md:text-7xl font-bold my-1">{dateInfo.dayOfMonth}</p>
                <p className="text-lg md:text-xl">{dateInfo.dayOfWeek}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
         <Card className="shadow-lg h-48 md:h-56 animate-pulse bg-card/80 flex items-center justify-center">
           <p className="text-destructive-foreground">Could not load date information.</p>
         </Card>
      )}

      <Card className="shadow-lg">
        <CardContent className="p-4 md:p-6 flex flex-col sm:flex-row items-center gap-4">
          <Image
            src="https://live.lunawadajamaat.org/wp-content/uploads/2025/05/Picsart_25-05-19_18-32-50-677.png"
            alt="QR Code - User Profile Placeholder"
            width={100}
            height={100}
            className="rounded-md border"
            data-ai-hint="qr code"
          />
          <div className="space-y-1 text-sm text-center sm:text-left">
            <p className="font-semibold text-lg flex items-center justify-center sm:justify-start">
              <User className="mr-2 h-5 w-5 text-primary" />
              Murtaza bhai Saifuddin bhai Shakir
            </p>
            <p className="text-muted-foreground flex items-center justify-center sm:justify-start">
              <Hash className="mr-2 h-4 w-4 text-primary/80" />
              ITS: 20403348
            </p>
            <p className="text-muted-foreground flex items-center justify-center sm:justify-start">
              <Phone className="mr-2 h-4 w-4 text-primary/80" />
              Phone: 99482594
            </p>
            <p className="text-muted-foreground flex items-center justify-center sm:justify-start">
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
          <Separator className="my-2" />
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
