
"use client"; // Add "use client" for hooks like useAuth and useRouter

import { LoginForm } from "@/components/auth/LoginForm";
import type { Metadata } from "next";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from "lucide-react";

// export const metadata: Metadata = { // Metadata needs to be static or generated in generateMetadata
//   title: "Login",
// };
// For client components, set title dynamically if needed
// useEffect(() => { document.title = "Login | Anjuman Hub"; }, []);

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    document.title = "Login | Anjuman Hub";
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  // If already authenticated and not loading, this part might not be reached due to useEffect redirect.
  // But it's a good guard if the redirect is somehow delayed.
  if (isAuthenticated) {
     return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="ml-4">Redirecting to dashboard...</p>
      </div>
    );
  }

  return (
    <>
      <video autoPlay loop muted playsInline className="login-page-video-bg">
        <source src="https://misbah.info/wp-content/uploads/2024/05/misbah-bg.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <main className="flex min-h-screen flex-col items-center justify-center bg-transparent p-4 relative z-10">
        <LoginForm />
      </main>
    </>
  );
}

    