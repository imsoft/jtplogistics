import { cn } from "@/lib/utils";

interface FormAlertProps {
  message: string;
  variant: "error" | "success";
  className?: string;
}

export function FormAlert({ message, variant, className }: FormAlertProps) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "rounded-md border px-3 py-2 text-sm",
        variant === "error"
          ? "border-destructive/50 bg-destructive/10 text-destructive"
          : "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400",
        className
      )}
    >
      {message}
    </div>
  );
}
