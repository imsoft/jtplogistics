-- AlterTable: change default values for collaborator permissions to false
ALTER TABLE "users" ALTER COLUMN "can_view_messages" SET DEFAULT false;
ALTER TABLE "users" ALTER COLUMN "can_view_ideas" SET DEFAULT false;
ALTER TABLE "users" ALTER COLUMN "can_view_routes" SET DEFAULT false;
ALTER TABLE "users" ALTER COLUMN "can_view_route_logs" SET DEFAULT false;
ALTER TABLE "users" ALTER COLUMN "can_view_unit_types" SET DEFAULT false;
ALTER TABLE "users" ALTER COLUMN "can_view_quotes" SET DEFAULT false;
ALTER TABLE "users" ALTER COLUMN "can_view_providers" SET DEFAULT false;
ALTER TABLE "users" ALTER COLUMN "can_view_clients" SET DEFAULT false;
ALTER TABLE "users" ALTER COLUMN "can_view_employees" SET DEFAULT false;
ALTER TABLE "users" ALTER COLUMN "can_view_vendors" SET DEFAULT false;
ALTER TABLE "users" ALTER COLUMN "can_view_laptops" SET DEFAULT false;
ALTER TABLE "users" ALTER COLUMN "can_view_phones" SET DEFAULT false;
ALTER TABLE "users" ALTER COLUMN "can_view_emails" SET DEFAULT false;
ALTER TABLE "users" ALTER COLUMN "can_view_tasks" SET DEFAULT false;

-- Set existing collaborators to false so admin enables them explicitly
UPDATE "users" SET
  "can_view_messages" = false,
  "can_view_ideas" = false,
  "can_view_routes" = false,
  "can_view_route_logs" = false,
  "can_view_unit_types" = false,
  "can_view_quotes" = false,
  "can_view_providers" = false,
  "can_view_clients" = false,
  "can_view_employees" = false,
  "can_view_vendors" = false,
  "can_view_laptops" = false,
  "can_view_phones" = false,
  "can_view_emails" = false,
  "can_view_tasks" = false
WHERE "role" = 'collaborator';
