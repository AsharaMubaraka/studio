
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { User, Phone, Hash, CalendarDays, Loader2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useSearchParams } from 'next/navigation'

interface DateInfo {
  monthYear: string;
  dayOfMonth: string;
  dayOfWeek: string;
  islamicMonth: string | null;
  islamicDay: string | null;
  islamicYear: string | null;
}

interface HijriCalendarEntry {
  gregorian_date: string; // YYYY-MM-DD
  hijri_day: string;
  hijri_month_name_full: string;
  hijri_year: string;
  // The JSON might have other fields like hijri_date, but we only need these.
}

const placeholderHijri = {
  day: "XX",
  month: "Islamic Month",
  year: "YYYY",
};

export default function DashboardPage() {
  const [dateInfo, setDateInfo] = useState<DateInfo>({
    monthYear: "Loading...",
    dayOfMonth: "..",
    dayOfWeek: "Loading...",
    islamicMonth: placeholderHijri.month,
    islamicDay: placeholderHijri.day,
    islamicYear: placeholderHijri.year,
  });
  const [isDateLoading, setIsDateLoading] = useState(true);
  const [hijriJsonError, setHijriJsonError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const name = searchParams.get('name') || 'Murtaza bhai Saifuddin bhai Shakir';
  const username = searchParams.get('username') || '20403348';

  useEffect(() => {
    document.title = "Dashboard | Anjuman Hub";

    async function fetchAndSetDates() {
      setIsDateLoading(true);
      setHijriJsonError(null);

      const systemToday = new Date();
      const formattedGregorianDateQuery = format(systemToday, "yyyy-MM-dd");

      try {
        const response = await fetch('/hijri_calendar_data.json');
        if (!response.ok) {
          throw new Error('Failed to load local Hijri calendar data file.');
        }
        const calendarData: HijriCalendarEntry[] = await response.json();
        
        const entryForToday = calendarData.find(
          (item) => item.gregorian_date === formattedGregorianDateQuery
        );

        if (entryForToday) {
          // Parse the gregorian_date from the JSON file for display
          // Add "T00:00:00" to ensure it's parsed in local timezone, not UTC.
          const entryGregorianDate = new Date(entryForToday.gregorian_date + "T00:00:00");

          setDateInfo({
            monthYear: format(entryGregorianDate, "MMMM, yyyy"),
            dayOfMonth: format(entryGregorianDate, "dd"),
            dayOfWeek: format(entryGregorianDate, "EEEE"),
            islamicMonth: entryForToday.hijri_month_name_full,
            islamicDay: entryForToday.hijri_day,
            islamicYear: entryForToday.hijri_year,
          });
        } else {
          setHijriJsonError(`Hijri date not found for ${formattedGregorianDateQuery} in local data.`);
          setDateInfo({
            monthYear: format(systemToday, "MMMM, yyyy"),
            dayOfMonth: format(systemToday, "dd"),
            dayOfWeek: format(systemToday, "EEEE"),
            islamicMonth: placeholderHijri.month,
            islamicDay: placeholderHijri.day,
            islamicYear: placeholderHijri.year,
          });
        }
      } catch (error: any) {
        console.error("Error processing local calendar data:", error);
        setHijriJsonError(error.message || "Error loading local calendar data.");
        setDateInfo({
          monthYear: format(systemToday, "MMMM, yyyy"),
          dayOfMonth: format(systemToday, "dd"),
          dayOfWeek: format(systemToday, "EEEE"),
          islamicMonth: placeholderHijri.month,
          islamicDay: placeholderHijri.day,
          islamicYear: placeholderHijri.year,
        });
      } finally {
        setIsDateLoading(false);
      }
    }

    fetchAndSetDates();
  }, []);

  return (
    <div className="animate-fadeIn space-y-6">
      {isDateLoading ? (
        <Card className="shadow-lg overflow-hidden h-48 md:h-56 flex items-center justify-center bg-card/80">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4 text-lg">Loading date...</p>
        </Card>
      ) : (
        <Card className="shadow-lg overflow-hidden">
          <CardContent className="p-0 relative h-48 md:h-56">
            <video autoPlay loop muted playsInline className="absolute top-0 left-0 w-full h-full object-cover z-0">
              <source src="https://misbah.info/wp-content/uploads/2024/05/misbah-bg.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            <div className="absolute inset-0 bg-black/60 flex flex-col md:flex-row items-center justify-around gap-4 md:gap-8 p-4 md:p-6 z-10 text-center">
              {/* Gregorian Date Block */}
              <div className="text-white font-sans flex flex-col items-center">
                <p className="text-sm md:text-md font-medium">{dateInfo.monthYear}</p>
                <p className="text-3xl md:text-5xl font-bold my-1">{dateInfo.dayOfMonth}</p>
                <p className="text-sm md:text-md font-medium">{dateInfo.dayOfWeek}</p>
              </div>
              {/* Islamic Date Block */}
              <div className="text-white font-sans flex flex-col items-center">
                 {hijriJsonError ? (
                  <p className="text-xs md:text-sm text-red-300 px-2">{hijriJsonError}</p>
                 ) : (
                  <>
                    <p className="text-3xl md:text-5xl font-bold my-1">{dateInfo.islamicDay}</p>
                    <p className="text-sm md:text-md font-medium">{dateInfo.islamicMonth}</p>
                    <p className="text-[0.7rem] md:text-sm">{dateInfo.islamicYear}H</p>
                  </>
                 )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-lg">
        <CardContent className="p-4 md:p-6 flex flex-col sm:flex-row items-center gap-4">
          <Image
            src="https://live.lunawadajamaat.org/wp-content/uploads/2025/05/Picsart_25-05-19_18-32-50-677.png"
            alt="User Profile"
            width={100}
            height={100}
            className="rounded-md border"
          />
          <div className="space-y-1 text-sm text-center sm:text-left">
            <p className="font-semibold text-lg flex items-center justify-center sm:justify-start">
              <User className="mr-2 h-5 w-5 text-primary" />
              {name}
            </p>
            <p className="text-muted-foreground flex items-center justify-center sm:justify-start">
              <Hash className="mr-2 h-4 w-4 text-primary/80" />
              {username}
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
