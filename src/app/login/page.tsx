
import { LoginForm } from "@/components/auth/LoginForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
};

export default function LoginPage() {
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
