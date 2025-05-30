
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { User, Phone, Hash, CalendarDays, Loader2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

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
}

interface UserProfile {
  name: string;
  username: string; // ITS ID
}

const placeholderHijri = {
  day: "XX",
  month: "Islamic Month",
  year: "YYYY",
};

export default function DashboardPage() {
  const { user: authUser } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

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

  useEffect(() => {
    document.title = "Dashboard | Anjuman Hub";

    async function fetchDashboardData() {
      setIsDateLoading(true);
      setHijriJsonError(null);

      const systemToday = new Date();
      const formattedGregorianDateQuery = format(systemToday, "yyyy-MM-dd");

      try {
        const response = await fetch('/hijri_calendar_data.json');
        if (!response.ok) {
          throw new Error(`Failed to load local Hijri calendar data file. Status: ${response.status}`);
        }
        const calendarData: HijriCalendarEntry[] = await response.json();
        
        const entryForToday = calendarData.find(
          (item) => item.gregorian_date === formattedGregorianDateQuery
        );

        if (entryForToday) {
          const entryGregorianDate = new Date(entryForToday.gregorian_date + "T00:00:00Z"); // Ensure UTC parsing
          setDateInfo({
            monthYear: format(entryGregorianDate, "MMMM yyyy"),
            dayOfMonth: format(entryGregorianDate, "dd"),
            dayOfWeek: format(entryGregorianDate, "EEEE"),
            islamicMonth: entryForToday.hijri_month_name_full,
            islamicDay: entryForToday.hijri_day,
            islamicYear: entryForToday.hijri_year,
          });
        } else {
          setHijriJsonError(`Hijri date not found for ${formattedGregorianDateQuery} in local data.`);
          // Fallback to system date if JSON entry not found
          setDateInfo({
            monthYear: format(systemToday, "MMMM yyyy"),
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
        // Fallback to system date on error
        setDateInfo({
          monthYear: format(systemToday, "MMMM yyyy"),
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

    async function fetchUserProfile() {
      if (authUser?.username) {
        setIsLoadingProfile(true);
        try {
          const userDocRef = doc(db, "users", authUser.username);
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserProfile({
              name: data.name || authUser.name || "N/A",
              username: authUser.username,
            });
          } else {
             setUserProfile({ name: authUser.name || "N/A", username: authUser.username });
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setUserProfile({ name: authUser.name || "N/A", username: authUser.username });
        } finally {
          setIsLoadingProfile(false);
        }
      } else {
         setIsLoadingProfile(false);
      }
    }

    fetchDashboardData();
    fetchUserProfile();
  }, [authUser]);

  return (
    <div className="animate-fadeIn space-y-6">
      <Card className="shadow-lg overflow-hidden relative">
        <CardContent className="p-0 h-64 md:h-72">
          <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0">
            <source src="https://misbah.info/wp-content/uploads/2024/05/misbah-bg.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          <div className="relative z-10 p-6 bg-black/50 h-full flex flex-col md:flex-row items-center justify-around gap-4 md:gap-8 text-center text-white">
            {/* Gregorian Date Block */}
            <div className="font-sans flex flex-col items-center">
              {isDateLoading ? (
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              ) : (
                <>
                  <p className="text-base md:text-lg font-medium">{dateInfo.monthYear}</p>
                  <p className="text-4xl md:text-5xl font-bold my-1">{dateInfo.dayOfMonth}</p>
                  <p className="text-base md:text-lg font-medium">{dateInfo.dayOfWeek}</p>
                </>
              )}
            </div>
            <div className="hidden md:block h-24 w-px bg-white/30"></div> {/* Separator for larger screens */}
            {/* Islamic Date Block */}
            <div className="font-sans flex flex-col items-center">
              {isDateLoading ? (
                 <Loader2 className="h-8 w-8 animate-spin text-primary mb-2 md:hidden" /> 
              ) : hijriJsonError ? (
                <p className="text-sm text-red-300 px-2">{hijriJsonError}</p>
              ) : (
                <>
                  <p className="text-4xl md:text-5xl font-bold my-1">{dateInfo.islamicDay}</p>
                  <p className="text-base md:text-lg font-medium">{dateInfo.islamicMonth}</p>
                  <p className="text-xs md:text-sm">{dateInfo.islamicYear}H</p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardContent className="p-4 md:p-6 flex items-center gap-4">
          <Image
            src="https://live.lunawadajamaat.org/wp-content/uploads/2025/05/Picsart_25-05-19_18-32-50-677.png"
            alt="User Profile"
            width={60} 
            height={60}
            className="rounded-md border"
          />
          {isLoadingProfile ? (
             <div className="space-y-2 flex-1">
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
             </div>
          ) : userProfile ? (
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-lg flex items-center">
                <User className="mr-2 h-5 w-5 text-primary shrink-0" />
                {userProfile.name}
              </p>
              <p className="text-muted-foreground flex items-center">
                <Hash className="mr-2 h-4 w-4 text-primary/80 shrink-0" />
                {userProfile.username}
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground">Could not load user profile.</p>
          )}
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
