"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

interface ResourceEditHeaderProps {
  title: string;
  description: string;
  backHref: string;
  backLabel: string;
  deleteTitle: string;
  deleteDescription?: string;
  onDelete: () => void;
}

export function ResourceEditHeader({
  title,
  description,
  backHref,
  backLabel,
  deleteTitle,
  deleteDescription,
  onDelete,
}: ResourceEditHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href={backHref} aria-label={backLabel}>
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl truncate">{title}</h1>
          <p className="text-muted-foreground truncate text-xs sm:text-sm">{description}</p>
        </div>
      </div>
      <DeleteConfirmDialog
        title={deleteTitle}
        description={deleteDescription}
        onConfirm={onDelete}
      />
    </div>
  );
}
