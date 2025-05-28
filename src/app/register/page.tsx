import RegisterForm from '@/components/auth/RegisterForm';

const RegisterPage = () => {
  return (
    <>
      <main className="flex min-h-screen flex-col items-center justify-center bg-transparent p-4 relative z-10">
        <h1>Register</h1>
        <RegisterForm />
      </main>
    </>
  );
};

export default RegisterPage;
