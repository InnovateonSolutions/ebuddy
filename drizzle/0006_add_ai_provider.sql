ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "ai_provider" text DEFAULT 'claude' NOT NULL;
--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "ollama_model" text DEFAULT 'llama3:latest' NOT NULL;
