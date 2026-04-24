DO $$
BEGIN
  CREATE TYPE "public"."privileged_access_outcome" AS ENUM('allowed', 'denied');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "privileged_access_audit" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "capability" text NOT NULL,
  "action" text NOT NULL,
  "resource" text NOT NULL,
  "outcome" "privileged_access_outcome" NOT NULL,
  "details" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_privileged_access_audit_user_created"
  ON "privileged_access_audit" ("user_id","created_at");
