DO $$
BEGIN
  CREATE TYPE "public"."user_role" AS ENUM('OWNER', 'MEMBER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" "user_role" DEFAULT 'MEMBER' NOT NULL;
