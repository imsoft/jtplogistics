-- Permisos del módulo mural (RH)
ALTER TABLE "users"
ADD COLUMN "can_view_mural" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "can_create_mural" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "can_update_mural" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "can_delete_mural" BOOLEAN NOT NULL DEFAULT false;

-- Tipo de entrada del mural
CREATE TYPE "MuralEntryType" AS ENUM ('event', 'vacation', 'training');

-- Eventos, vacaciones y capacitaciones
CREATE TABLE "mural_entries" (
  "id" TEXT NOT NULL,
  "type" "MuralEntryType" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "location" TEXT,
  "start_date" TIMESTAMP(3) NOT NULL,
  "end_date" TIMESTAMP(3),
  "image_url" TEXT,
  "image_public_id" TEXT,
  "subject_user_id" TEXT,
  "author_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "mural_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mural_entries_start_date_idx" ON "mural_entries"("start_date");
CREATE INDEX "mural_entries_type_start_date_idx" ON "mural_entries"("type", "start_date");

ALTER TABLE "mural_entries"
ADD CONSTRAINT "mural_entries_subject_user_id_fkey" FOREIGN KEY ("subject_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "mural_entries"
ADD CONSTRAINT "mural_entries_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Blog / noticias del mural
CREATE TABLE "mural_posts" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "excerpt" TEXT,
  "content_json" TEXT NOT NULL DEFAULT '',
  "cover_url" TEXT,
  "cover_public_id" TEXT,
  "published" BOOLEAN NOT NULL DEFAULT false,
  "published_at" TIMESTAMP(3),
  "author_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "mural_posts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mural_posts_published_published_at_idx" ON "mural_posts"("published", "published_at");

ALTER TABLE "mural_posts"
ADD CONSTRAINT "mural_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
