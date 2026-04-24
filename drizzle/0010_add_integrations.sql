CREATE TYPE "public"."integration_status" AS ENUM('active', 'inactive', 'error');

CREATE TABLE "integrations" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL UNIQUE,
  "status" "integration_status" NOT NULL DEFAULT 'inactive',
  "last_checked_at" timestamp,
  "metadata" jsonb,
  "created_at" timestamp NOT NULL DEFAULT now()
);
