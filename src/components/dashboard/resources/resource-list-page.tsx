import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface ResourceListPageProps {
  title: string;
  description: string;
  newHref?: string;
  newLabel?: string;
  children: React.ReactNode;
}

export function ResourceListPage({
  title,
  description,
  newHref,
  newLabel,
  children,
}: ResourceListPageProps) {
  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="page-heading">{title}</h1>
          <p className="text-muted-foreground mt-1 text-[10px] font-semibold uppercase tracking-wide sm:text-xs">
            {description}
          </p>
        </div>
        {newHref && newLabel ? (
          <Button asChild className="w-full shrink-0 sm:w-fit" size="sm">
            <Link href={newHref}>
              <Plus className="size-4" />
              {newLabel}
            </Link>
          </Button>
        ) : null}
      </div>
      <Separator />
      {children}
    </div>
  );
}
