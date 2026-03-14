export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-3 py-8 sm:px-4 sm:py-12"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% -10%, oklch(0.92 0.04 264.376 / 0.35) 0%, transparent 70%), oklch(0.974 0.008 264.376)",
      }}
    >
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
