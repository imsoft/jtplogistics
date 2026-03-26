-- AlterTable
ALTER TABLE "employee_profiles"
ADD COLUMN IF NOT EXISTS "owner_user_id" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "employee_profiles_owner_user_id_idx"
ON "employee_profiles"("owner_user_id");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'employee_profiles_owner_user_id_fkey'
  ) THEN
    ALTER TABLE "employee_profiles"
    ADD CONSTRAINT "employee_profiles_owner_user_id_fkey"
    FOREIGN KEY ("owner_user_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
