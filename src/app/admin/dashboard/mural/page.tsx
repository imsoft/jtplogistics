import { MuralBoard } from "@/components/dashboard/mural/mural-board";

export default function MuralPage() {
  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      <div>
        <h1 className="page-heading">Mural</h1>
        <p className="text-muted-foreground mt-1 text-[10px] font-semibold uppercase tracking-wide sm:text-xs">
          Celebraciones, eventos y noticias del equipo JTP
        </p>
      </div>
      <MuralBoard basePath="/admin/dashboard/mural" />
    </div>
  );
}
