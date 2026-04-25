CREATE TABLE "campaigns" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX "idx_campaigns_user_updated" ON "campaigns" ("user_id", "updated_at");

CREATE TABLE "campaign_notes" (
  "id" text PRIMARY KEY NOT NULL,
  "campaign_id" text NOT NULL REFERENCES "campaigns"("id") ON DELETE cascade,
  "relative_path" text NOT NULL,
  "folder" text NOT NULL DEFAULT '',
  "title" text NOT NULL,
  "content" text NOT NULL,
  "links" text[] NOT NULL DEFAULT '{}',
  "tags" text[] NOT NULL DEFAULT '{}',
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX "idx_campaign_notes_campaign_path" ON "campaign_notes" ("campaign_id", "relative_path");
