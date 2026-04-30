ALTER TABLE "users"
ADD COLUMN "can_create_records" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "can_read_records" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "can_update_records" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "can_delete_records" BOOLEAN NOT NULL DEFAULT false;
