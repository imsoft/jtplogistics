import { NotFoundState } from "@/components/ui/error-state";

export default function NotFound() {
  return (
    <NotFoundState
      homeHref="/carrier/dashboard"
      homeLabel="Ir al panel"
    />
  );
}
