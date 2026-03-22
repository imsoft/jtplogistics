"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Camera, Loader2 } from "lucide-react";

interface CoverImageUploadProps {
  currentImage: string | null;
  endpoint: string;
  onSuccess?: (url: string) => void;
}

export function CoverImageUpload({
  currentImage,
  endpoint,
  onSuccess,
}: CoverImageUploadProps) {
  const [image, setImage] = useState<string | null>(currentImage);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(endpoint, { method: "POST", body: fd });
      if (!res.ok) throw new Error("Error al subir imagen");
      const { url } = await res.json();
      setImage(url);
      onSuccess?.(url);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <div
        className="relative cursor-pointer group overflow-hidden rounded-lg border"
        style={{ width: "100%", maxWidth: 480, aspectRatio: "3/2" }}
        onClick={() => !isLoading && inputRef.current?.click()}
        aria-label="Cambiar imagen de portada"
        role="button"
        tabIndex={0}
        onKeyDown={(e) =>
          e.key === "Enter" && !isLoading && inputRef.current?.click()
        }
      >
        {image ? (
          <Image
            src={image}
            alt="Imagen de portada"
            fill
            className="object-cover"
            sizes="480px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground text-sm">
            Sin imagen
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
          {isLoading ? (
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          ) : (
            <Camera className="h-8 w-8 text-white" />
          )}
        </div>
      </div>
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
