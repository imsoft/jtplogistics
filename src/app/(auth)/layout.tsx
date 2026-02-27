export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 px-3 py-8 sm:px-4 sm:py-12">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
