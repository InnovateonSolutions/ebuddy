CREATE EXTENSION IF NOT EXISTS pgcrypto;
--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "api_key_hash" text;
--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "api_key_preview" text;
--> statement-breakpoint
UPDATE "user_preferences"
SET
  "api_key_hash" = encode(digest("api_key", 'sha256'), 'hex'),
  "api_key_preview" = substring("api_key" from 1 for 8) || repeat('•', 24) || right("api_key", 8)
WHERE "api_key" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "user_preferences" DROP COLUMN "api_key";
--> statement-breakpoint
DROP TABLE IF EXISTS "visit_counter";
