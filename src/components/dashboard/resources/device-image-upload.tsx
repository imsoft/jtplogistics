"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Label } from "@/components/ui/label";

interface DeviceImageUploadProps {
  label?: string;
  imageUrl: string;
  /** Endpoint de subida que devuelve { url, publicId }. */
  endpoint: string;
  /** Carpeta destino en Cloudinary. */
  folder?: string;
  onChange: (imageUrl: string, imagePublicId: string) => void;
}

export function DeviceImageUpload({
  label = "Imagen del equipo",
  imageUrl,
  endpoint,
  folder,
  onChange,
}: DeviceImageUploadProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (folder) fd.append("folder", folder);
      const res = await fetch(endpoint, { method: "POST", body: fd });
      if (!res.ok) throw new Error("Error al subir la imagen");
      const { url, publicId } = await res.json();
      onChange(url, publicId);
    } catch {
      setError("No se pudo subir la imagen. Intenta de nuevo.");
    } finally {
      setIsLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-start gap-3">
        <div
          className="relative flex h-28 w-28 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed bg-muted/40 text-muted-foreground transition-colors hover:bg-muted"
          onClick={() => !isLoading && inputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Subir imagen del equipo"
          onKeyDown={(e) => e.key === "Enter" && !isLoading && inputRef.current?.click()}
        >
          {imageUrl ? (
            <Image src={imageUrl} alt={label} fill className="object-cover" sizes="112px" />
          ) : isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <div className="flex flex-col items-center gap-1 text-center text-xs">
              <ImagePlus className="h-6 w-6" />
              <span>Subir foto</span>
            </div>
          )}
          {isLoading && imageUrl && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          )}
        </div>
        {imageUrl && !isLoading && (
          <button
            type="button"
            onClick={() => onChange("", "")}
            className="inline-flex items-center gap-1 text-xs text-destructive hover:underline"
          >
            <X className="h-3.5 w-3.5" />
            Quitar
          </button>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={isLoading}
      />
    </div>
  );
}
