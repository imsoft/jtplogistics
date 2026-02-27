"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Camera, Loader2 } from "lucide-react";

interface AvatarUploadProps {
  currentImage: string | null;
  name: string;
  endpoint: string;
  onSuccess?: (url: string) => void;
  size?: number;
}

export function AvatarUpload({
  currentImage,
  name,
  endpoint,
  onSuccess,
  size = 80,
}: AvatarUploadProps) {
  const [image, setImage] = useState<string | null>(currentImage);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");

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
      // silent — no interrumpir al usuario
    } finally {
      setIsLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <div
        className="relative cursor-pointer group"
        style={{ width: size, height: size }}
        onClick={() => !isLoading && inputRef.current?.click()}
        aria-label="Cambiar foto de perfil"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && !isLoading && inputRef.current?.click()}
      >
        <div
          className="bg-primary text-primary-foreground flex w-full h-full items-center justify-center rounded-full overflow-hidden text-sm font-semibold select-none"
          style={{ fontSize: size * 0.28 }}
        >
          {image ? (
            <Image
              src={image}
              alt={name}
              fill
              className="object-cover rounded-full"
              sizes={`${size}px`}
            />
          ) : (
            initials
          )}
        </div>
        <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {isLoading ? (
            <Loader2 className="text-white animate-spin" style={{ width: size * 0.3, height: size * 0.3 }} />
          ) : (
            <Camera className="text-white" style={{ width: size * 0.3, height: size * 0.3 }} />
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
