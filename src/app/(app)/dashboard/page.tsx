
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { User, Hash, CalendarDays, Loader2, Bell, Info, Users2, BellDot, Wifi } from "lucide-react"; // Added Users2, BellDot, Wifi
import Image from "next/image";
import { useEffect, useState, useCallback } from "react";
import { format, isWithinInterval } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, orderBy, limit, getDocs, Timestamp } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { formatWhatsAppTextToHtml } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import { useAdminMode } from "@/contexts/AdminModeContext";
import { fetchRelays, type LiveRelay } from "@/actions/relayActions";

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
  username: string;
}

interface AppNotification {
    id: string;
    title: string;
    content: string;
    createdAt: Date;
    authorName?: string;
    imageUrl?: string;
    imageHint?: string;
}

const placeholderHijri = {
  day: "XX",
  month: "Islamic Month",
  year: "YYYY",
};

export default function DashboardPage() {
  const { user: authUser } = useAuth();
  const { isAdminMode } = useAdminMode();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [latestNotification, setLatestNotification] = useState<AppNotification | null>(null);
  const [isLoadingNotification, setIsLoadingNotification] = useState(true);

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

  // Admin Analytics State
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [totalNotificationsCount, setTotalNotificationsCount] = useState<number | null>(null); // Renamed to avoid conflict
  const [activeRelaysCount, setActiveRelaysCount] = useState<number | null>(null);
  const [isLoadingAdminStats, setIsLoadingAdminStats] = useState(false);

  const fetchAdminStats = useCallback(async () => {
    if (authUser?.isAdmin && isAdminMode) {
      setIsLoadingAdminStats(true);
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        setTotalUsers(usersSnap.size);

        const notifSnap = await getDocs(collection(db, "notifications"));
        setTotalNotificationsCount(notifSnap.size);

        const fetchedRelays = await fetchRelays();
        const now = new Date();
        const active = fetchedRelays.filter(r => 
          isWithinInterval(now, { 
            start: r.startDate, 
            // Ensure end date is inclusive of the whole day
            end: new Date(new Date(r.endDate).setHours(23, 59, 59, 999)) 
          })
        );
        setActiveRelaysCount(active.length);

      } catch (error) {
        console.error("Error fetching admin stats:", error);
        // Optionally set error state for admin stats
      } finally {
        setIsLoadingAdminStats(false);
      }
    }
  }, [authUser, isAdminMode]);


  useEffect(() => {
    document.title = `Dashboard | ${siteConfig.name}`;

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
          const entryGregorianDate = new Date(entryForToday.gregorian_date + "T00:00:00Z"); 
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

    async function fetchLatestNotification() {
        setIsLoadingNotification(true);
        try {
            const notificationsRef = collection(db, "notifications");
            const q = query(notificationsRef, orderBy("createdAt", "desc"), limit(1));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const docSnap = querySnapshot.docs[0];
                const data = docSnap.data();
                setLatestNotification({
                    id: docSnap.id,
                    title: data.title,
                    content: data.content,
                    createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
                    authorName: data.authorName,
                    imageUrl: data.imageUrl,
                    imageHint: data.title ? data.title.split(" ").slice(0,2).join(" ") : "notification image"
                });
            } else {
                setLatestNotification(null);
            }
        } catch (error) {
            console.error("Error fetching latest notification:", error);
            setLatestNotification(null); 
        } finally {
            setIsLoadingNotification(false);
        }
    }

    fetchDashboardData();
    fetchUserProfile();
    fetchLatestNotification();
    fetchAdminStats(); // Fetch admin stats
  }, [authUser, fetchAdminStats]); // Added fetchAdminStats dependency

  return (
    <div className="animate-fadeIn space-y-6">
      <Card className="shadow-lg overflow-hidden relative">
        <CardContent className="p-0 h-64 md:h-72"> 
          <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0">
            <source src="https://misbah.info/wp-content/uploads/2024/05/misbah-bg.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          <div className="relative z-10 p-6 bg-black/50 h-full flex flex-row items-center justify-around gap-4 text-center text-white">
            <div className="font-sans flex flex-col items-center">
              {isDateLoading ? (
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              ) : (
                <>
                  <p className="text-sm md:text-base font-medium">{dateInfo.monthYear}</p>
                  <p className="text-4xl md:text-6xl font-bold my-1">{dateInfo.dayOfMonth}</p>
                  <p className="text-sm md:text-base font-medium">{dateInfo.dayOfWeek}</p>
                </>
              )}
            </div>
            <div className="h-24 w-px bg-white/30"></div> 
            <div className="font-sans flex flex-col items-center">
              {isDateLoading ? (
                 <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" /> 
              ) : hijriJsonError ? (
                <p className="text-xs text-red-300 px-2">{hijriJsonError}</p>
              ) : (
                <>
                  <p className="text-4xl md:text-6xl font-bold my-1">{dateInfo.islamicDay}</p>
                  <p className="text-sm md:text-base font-medium">{dateInfo.islamicMonth}</p>
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
            data-ai-hint="logo"
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
            <Bell className="mr-2 h-5 w-5 text-primary" />
            Latest Notification
          </CardTitle>
          <Separator className="my-2" />
        </CardHeader>
        <CardContent className="space-y-3 text-sm pt-0">
          {isLoadingNotification ? (
            <div className="space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-3 w-1/2 mt-2" />
            </div>
          ) : latestNotification ? (
            <>
              <p 
                className="font-semibold text-lg" 
                dangerouslySetInnerHTML={{ __html: formatWhatsAppTextToHtml(latestNotification.title) }} 
              />
              {latestNotification.imageUrl && (
                <div className="my-3 aspect-video w-full max-w-md mx-auto relative overflow-hidden rounded-md border">
                  <Image
                    src={latestNotification.imageUrl}
                    alt={latestNotification.title || "Notification image"}
                    fill
                    className="object-cover"
                    data-ai-hint={latestNotification.imageHint || "notification visual"}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>
              )}
              <div 
                className="whitespace-pre-line"
                dangerouslySetInnerHTML={{ __html: formatWhatsAppTextToHtml(latestNotification.content) }} 
              />
              <div className="flex items-center text-xs text-muted-foreground pt-2">
                <CalendarDays className="mr-2 h-4 w-4" />
                <span>
                    Posted on {format(latestNotification.createdAt, "MMM d, yyyy 'at' h:mm a")}
                    {latestNotification.authorName && ` by ${latestNotification.authorName}`}
                </span>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">No recent notifications.</p>
          )}
        </CardContent>
      </Card>

      {authUser?.isAdmin && isAdminMode && (
        <>
          <Separator />
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight">Admin Overview</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {isLoadingAdminStats ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{totalUsers ?? "N/A"}</div>}
                  <p className="text-xs text-muted-foreground">Registered users in the system</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Notifications</CardTitle>
                  <BellDot className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {isLoadingAdminStats ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{totalNotificationsCount ?? "N/A"}</div>}
                  <p className="text-xs text-muted-foreground">Notifications sent all time</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Live Relays</CardTitle>
                  <Wifi className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {isLoadingAdminStats ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{activeRelaysCount ?? "N/A"}</div>}
                  <p className="text-xs text-muted-foreground">Miqaats currently live or scheduled today</p>
                </CardContent>
              </Card>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

