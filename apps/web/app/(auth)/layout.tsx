export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-background to-accent-50 dark:from-primary-950/30 dark:via-background dark:to-accent-950/30 p-6">
      <div className="w-full max-w-md animate-fade-in">{children}</div>
    </main>
  );
}
