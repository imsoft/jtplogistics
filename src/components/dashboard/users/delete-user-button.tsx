"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

interface DeleteUserButtonProps {
  userId: string;
  userName: string;
}

export function DeleteUserButton({ userId, userName }: DeleteUserButtonProps) {
  const router = useRouter();

  async function handleConfirm() {
    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error ?? "Error al eliminar el usuario.");
      return;
    }
    toast.success("Usuario eliminado.");
    router.push("/admin/dashboard/users");
  }

  return (
    <DeleteConfirmDialog
      title="¿Eliminar usuario?"
      description={`Se eliminará a ${userName} junto con todos sus datos. Esta acción no se puede deshacer.`}
      onConfirm={handleConfirm}
    />
  );
}
