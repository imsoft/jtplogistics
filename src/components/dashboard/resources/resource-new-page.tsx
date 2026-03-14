"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface ResourceNewPageProps {
  title: string;
  description: string;
  backHref: string;
  backLabel: string;
  error?: string | null;
  children: React.ReactNode;
}

export function ResourceNewPage({
  title,
  description,
  backHref,
  backLabel,
  error,
  children,
}: ResourceNewPageProps) {
  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      <div className="flex items-center gap-1.5">
        <Button variant="ghost" size="icon" asChild className="shrink-0 text-muted-foreground hover:text-foreground">
          <Link href={backHref} aria-label={backLabel}>
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
          <p className="text-muted-foreground truncate text-xs sm:text-sm">{description}</p>
        </div>
      </div>
      <Separator />
      <div className="w-full min-w-0">
        {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
        {children}
      </div>
    </div>
  );
}
