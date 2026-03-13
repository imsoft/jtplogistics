-- Renombrar valor del enum UserRole de vendedor a vendor (PostgreSQL 10+)
ALTER TYPE "UserRole" RENAME VALUE 'vendedor' TO 'vendor';
