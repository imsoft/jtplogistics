import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { redirectIfAuthenticated } from "@/lib/auth-server";

export default async function HomePage() {
  await redirectIfAuthenticated();

  return (
    <div className="relative min-h-screen bg-background">
      <div className="mx-auto min-h-screen max-w-7xl lg:grid lg:grid-cols-12 lg:gap-x-8 lg:px-8">
        <div className="px-6 pt-10 pb-12 sm:pb-16 lg:col-span-7 lg:px-0 lg:pt-40 lg:pb-24 xl:col-span-6">
          <div className="mx-auto max-w-lg lg:mx-0">
            <Link href="/" className="inline-block">
              <Image
                src="/images/logo/jtp-logistics.png"
                alt="JTP Logistics"
                width={480}
                height={120}
                className="h-56 w-auto sm:h-64 lg:h-72"
                priority
              />
            </Link>
            <div className="hidden sm:mt-8 sm:flex lg:mt-4">
              <div className="relative rounded-full px-3 py-1 text-sm text-muted-foreground ring-1 ring-foreground/10 hover:ring-foreground/20">
                Gestión de rutas y flotas para tu operación.{" "}
                <Link
                  href="/register"
                  className="font-semibold whitespace-nowrap text-primary"
                >
                  <span aria-hidden="true" className="absolute inset-0" />
                  Crear cuenta <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
            <h1 className="mt-24 text-5xl font-semibold tracking-tight text-pretty text-foreground sm:mt-10 sm:text-7xl">
              El mejor socio comercial
            </h1>
            <p className="mt-8 text-lg font-medium text-pretty text-muted-foreground sm:text-xl sm:leading-8">
              Planifica rutas, asigna transportistas y da seguimiento a tus envíos
              en un solo lugar. Simple, rápido y pensado para equipos que no paran.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Button size="lg" asChild>
                <Link href="/register">Crear cuenta</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">
                  Iniciar sesión <span aria-hidden="true">→</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
        <div className="relative aspect-[3/2] w-full lg:col-span-5 lg:-mr-8 lg:aspect-auto xl:absolute xl:inset-0 xl:left-1/2 xl:mr-0">
          <Image
            src="/images/login/login-image.jpg"
            alt="JTP Logistics"
            aria-hidden
            fill
            quality={90}
            className="bg-muted object-cover object-center"
            sizes="(max-width: 1024px) 100vw, 60vw"
            priority
          />
        </div>
      </div>
    </div>
  );
}
