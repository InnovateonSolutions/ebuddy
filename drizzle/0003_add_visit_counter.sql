CREATE TABLE "visit_counter" (
	"id" integer PRIMARY KEY DEFAULT 1,
	"count" integer NOT NULL DEFAULT 0,
	"updated_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
INSERT INTO "visit_counter" ("id", "count") VALUES (1, 0);
