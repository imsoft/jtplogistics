import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth-server";
import { uploadToCloudinary } from "@/lib/cloudinary";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const userId = session.user.id;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || !(file instanceof File) || file.size === 0) {
      return Response.json({ error: "Se requiere un archivo de imagen." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

    const safeName = (session.user.name ?? "user").replace(/[^a-zA-Z0-9]/g, "");
    const folder = `Profile Pictures/${safeName}${userId}`;

    const upload = await uploadToCloudinary(base64, {
      folder,
      resource_type: "image",
    });

    await prisma.user.update({
      where: { id: userId },
      data: { image: upload.secure_url },
    });

    return Response.json({ url: upload.secure_url });
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error(e);
    return Response.json({ error: "Error al subir la imagen." }, { status: 500 });
  }
}
