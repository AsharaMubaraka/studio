
"use client"; 

import { LoginForm } from "@/components/auth/LoginForm";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from "lucide-react";
import { siteConfig } from "@/config/site";

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    document.title = `Login | ${siteConfig.name}`;
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
