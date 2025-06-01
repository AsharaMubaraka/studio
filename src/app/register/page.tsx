
"use client";

import RegisterForm from '@/components/auth/RegisterForm';
import { useEffect } from 'react';
import { siteConfig } from '@/config/site';

const RegisterPage = () => {
  useEffect(() => {
    document.title = `Register | ${siteConfig.name}`;
  }, []);

  return (
    <>
      <video autoPlay loop muted playsInline className="login-page-video-bg">
        <source src="https://misbah.info/wp-content/uploads/2024/05/misbah-bg.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <main className="flex min-h-screen flex-col items-center justify-center bg-transparent p-4 relative z-10">
        {/* The title "Register" is inside the RegisterForm component via CardTitle */}
        <RegisterForm />
      </main>
    </>
  );
};

export default RegisterPage;
