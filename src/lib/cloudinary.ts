/**
 * Cloudinary: configuración y helpers para subida y URLs de medios.
 * Variables: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 */

import { v2 as cloudinary } from "cloudinary";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
}

export { cloudinary };

export type UploadResult = {
  secure_url: string;
  public_id: string;
  width?: number;
  height?: number;
};

/**
 * Sube un archivo a Cloudinary (desde buffer o stream).
 * Opciones: folder, resource_type ('image' | 'video' | 'raw'), etc.
 */
export async function uploadToCloudinary(
  source: string | Buffer | NodeJS.ReadableStream,
  options: {
    folder?: string;
    resource_type?: "image" | "video" | "raw" | "auto";
    public_id?: string;
  } = {}
): Promise<UploadResult> {
  const result = await cloudinary.uploader.upload(source as string, {
    folder: options.folder,
    resource_type: options.resource_type ?? "image",
    public_id: options.public_id,
  });
  return {
    secure_url: result.secure_url,
    public_id: result.public_id,
    width: result.width,
    height: result.height,
  };
}

/**
 * Elimina un recurso de Cloudinary por su public_id.
 */
export async function deleteFromCloudinary(
  publicId: string,
  options?: { resource_type?: "image" | "video" | "raw" }
): Promise<{ result: string }> {
  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: options?.resource_type ?? "image",
  });
  return result as { result: string };
}

/**
 * Genera la URL pública de un recurso (opcionalmente con transformaciones).
 */
export function cloudinaryUrl(
  publicId: string,
  options?: {
    width?: number;
    height?: number;
    crop?: string;
    format?: string;
  }
): string {
  return cloudinary.url(publicId, {
    secure: true,
    ...options,
  });
}
