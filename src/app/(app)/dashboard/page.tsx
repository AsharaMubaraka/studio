
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { User, Phone, Hash, CalendarDays, Loader2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth"; // Import useAuth
import { db } from "@/lib/firebase"; // Import db
import { doc, getDoc } from "firebase/firestore"; // Import Firestore functions

interface DateInfo {
  monthYear: string;
  dayOfMonth: string;
  dayOfWeek: string;
  islamicMonth: string | null;
  islamicDay: string | null;
  islamicYear: string | null;
}

interface HijriCalendarEntry {
  gregorian_date: string;
  hijri_day: string;
  hijri_month_name_full: string;
  hijri_year: string;
}

interface UserProfile {
  name: string;
  username: string; // ITS ID
  // Add other fields if available in Firestore, e.g., phone, sabeelId
  // phone?: string;
  // sabeelId?: string;
}

const placeholderHijri = {
  day: "XX",
  month: "Islamic Month",
  year: "YYYY",
};

export default function DashboardPage() {
  const { user: authUser } = useAuth(); // Get authenticated user
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
          throw new Error('Failed to load local Hijri calendar data file.');
        }
        const calendarData: HijriCalendarEntry[] = await response.json();
        
        const entryForToday = calendarData.find(
          (item) => item.gregorian_date === formattedGregorianDateQuery
        );

        if (entryForToday) {
          const entryGregorianDate = new Date(entryForToday.gregorian_date + "T00:00:00");
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
              // phone: data.phone || "N/A", // Uncomment if phone exists
              // sabeelId: data.sabeelId || "N/A", // Uncomment if sabeelId exists
            });
          } else {
            // Fallback if user not found in DB but authenticated
             setUserProfile({ name: authUser.name || "N/A", username: authUser.username });
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setUserProfile({ name: authUser.name || "N/A", username: authUser.username }); // Fallback
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
      {/* Redesigned Date Card */}
      <Card className="shadow-lg overflow-hidden">
        <CardContent className="p-6 bg-card/90"> {/* Removed video, added slight opacity for depth */}
          <div className="flex flex-col md:flex-row items-center justify-around gap-4 md:gap-8 text-center">
            {/* Gregorian Date Block */}
            <div className="text-card-foreground font-sans flex flex-col items-center">
              {isDateLoading ? (
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              ) : (
                <>
                  <p className="text-lg md:text-xl font-medium">{dateInfo.monthYear}</p>
                  <p className="text-5xl md:text-7xl font-bold my-1">{dateInfo.dayOfMonth}</p>
                  <p className="text-lg md:text-xl font-medium">{dateInfo.dayOfWeek}</p>
                </>
              )}
            </div>
            {/* Separator for larger screens */}
            <div className="hidden md:block h-24 w-px bg-border"></div>
            {/* Islamic Date Block */}
            <div className="text-card-foreground font-sans flex flex-col items-center">
              {isDateLoading ? (
                 <Loader2 className="h-8 w-8 animate-spin text-primary mb-2 md:hidden" /> // Only show one loader on small screens
              ) : hijriJsonError ? (
                <p className="text-sm text-destructive px-2">{hijriJsonError}</p>
              ) : (
                <>
                  <p className="text-5xl md:text-7xl font-bold my-1">{dateInfo.islamicDay}</p>
                  <p className="text-lg md:text-xl font-medium">{dateInfo.islamicMonth}</p>
                  <p className="text-sm md:text-base">{dateInfo.islamicYear}H</p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Information Card */}
      <Card className="shadow-lg">
        <CardContent className="p-4 md:p-6 flex flex-col sm:flex-row items-center gap-4">
          <Image
            src="https://live.lunawadajamaat.org/wp-content/uploads/2025/05/Picsart_25-05-19_18-32-50-677.png"
            alt="User Profile"
            width={80} // Smaller image
            height={80} // Smaller image
            className="rounded-md border"
          />
          {isLoadingProfile ? (
             <div className="space-y-2 flex-1 text-center sm:text-left">
                <div className="h-6 bg-muted rounded w-3/4 mx-auto sm:mx-0"></div>
                <div className="h-4 bg-muted rounded w-1/2 mx-auto sm:mx-0"></div>
             </div>
          ) : userProfile ? (
            <div className="space-y-1 text-sm text-center sm:text-left">
              <p className="font-semibold text-lg flex items-center justify-center sm:justify-start">
                <User className="mr-2 h-5 w-5 text-primary" />
                {userProfile.name}
              </p>
              <p className="text-muted-foreground flex items-center justify-center sm:justify-start">
                <Hash className="mr-2 h-4 w-4 text-primary/80" />
                {userProfile.username} {/* ITS ID */}
              </p>
              {/* Placeholder for Phone and Sabeel - uncomment and populate if data.phone/sabeelId exists */}
              {/* 
              <p className="text-muted-foreground flex items-center justify-center sm:justify-start">
                <Phone className="mr-2 h-4 w-4 text-primary/80" />
                {userProfile.phone || "N/A"} 
              </p>
              <p className="text-muted-foreground flex items-center justify-center sm:justify-start">
                <Hash className="mr-2 h-4 w-4 text-primary/80" /> Sabeel: N/A
              </p> 
              */}
            </div>
          ) : (
            <p className="text-muted-foreground">Could not load user profile.</p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <User className="mr-2 h-5 w-5 text-primary" /> {/* Using User icon as placeholder, can be Bell */}
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
