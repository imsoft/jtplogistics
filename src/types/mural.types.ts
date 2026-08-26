export type MuralEntryType = "event" | "vacation" | "training";

/** Tipos de tarjeta que se muestran en el mural, incluyendo los derivados. */
export type MuralItemKind = MuralEntryType | "birthday" | "anniversary";

export interface MuralEntry {
  id: string;
  type: MuralEntryType;
  title: string;
  description: string | null;
  location: string | null;
  startDate: string;
  endDate: string | null;
  imageUrl: string | null;
  imagePublicId: string | null;
  subjectUserId: string | null;
  subjectName: string | null;
  /** Foto de la persona, para las filas de vacaciones. */
  subjectImage?: string | null;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface MuralEntryFormData {
  type: MuralEntryType;
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  imageUrl: string;
  imagePublicId: string;
  subjectUserId: string;
  notifyByEmail: boolean;
}

export interface MuralPost {
  id: string;
  title: string;
  excerpt: string | null;
  contentJson: string;
  coverUrl: string | null;
  coverPublicId: string | null;
  published: boolean;
  publishedAt: string | null;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface MuralPostFormData {
  title: string;
  excerpt: string;
  contentJson: string;
  coverUrl: string;
  coverPublicId: string;
  published: boolean;
  notifyByEmail: boolean;
}

/** Cumpleaños o aniversario derivado del perfil del colaborador. */
export interface MuralCelebration {
  kind: "birthday" | "anniversary";
  userId: string;
  name: string;
  image: string | null;
  position: string | null;
  /** Fecha de la celebración en el año consultado (ISO, solo día). */
  date: string;
  /** Años cumplidos (edad o antigüedad) en esa fecha. */
  years: number | null;
}

export interface MuralPermissions {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}
