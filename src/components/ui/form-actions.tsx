import Link from "next/link";
import { Button } from "@/components/ui/button";

interface FormActionsProps {
  submitLabel: string;
  cancelHref: string;
  isSubmitting?: boolean;
}

export function FormActions({ submitLabel, cancelHref, isSubmitting = false }: FormActionsProps) {
  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
        {submitLabel}
      </Button>
      <Button type="button" variant="outline" asChild className="w-full sm:w-auto">
        <Link href={cancelHref}>Cancelar</Link>
      </Button>
    </div>
  );
}
