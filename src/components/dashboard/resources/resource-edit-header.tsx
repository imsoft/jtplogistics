"use client";

import React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Separator } from "@/components/ui/separator";

interface ResourceEditHeaderProps {
  title: string;
  description: string;
  backHref: string;
  backLabel: string;
  deleteTitle: string;
  deleteDescription?: string;
  onDelete: () => void;
  showDelete?: boolean;
  children?: React.ReactNode;
}

export function ResourceEditHeader({
  title,
  description,
  backHref,
  backLabel,
  deleteTitle,
  deleteDescription,
  onDelete,
  showDelete = true,
  children,
}: ResourceEditHeaderProps) {
  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <Button variant="ghost" size="icon" asChild className="shrink-0 text-muted-foreground hover:text-foreground">
            <Link href={backHref} aria-label={backLabel}>
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl truncate">{title}</h1>
            <p className="text-muted-foreground truncate text-xs sm:text-sm">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {children}
          {showDelete && (
            <DeleteConfirmDialog
              title={deleteTitle}
              description={deleteDescription}
              onConfirm={onDelete}
            />
          )}
        </div>
      </div>
      <Separator />
    </div>
  );
}
