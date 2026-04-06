import Image from "next/image";
import Link from "next/link";

interface AuthPageHeaderProps {
  subtitle: string;
}

export function AuthPageHeader({ subtitle }: AuthPageHeaderProps) {
  return (
    <div className="mb-6 text-center sm:mb-8">
      <Link href="/" className="inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg">
        <Image
          src="/images/logo/jtp-logistics.png"
          alt="JTP Logistics"
          width={260}
          height={65}
          className="mx-auto h-28 w-auto sm:h-32 drop-shadow-sm"
          priority
        />
      </Link>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
        {subtitle}
      </p>
    </div>
  );
}
