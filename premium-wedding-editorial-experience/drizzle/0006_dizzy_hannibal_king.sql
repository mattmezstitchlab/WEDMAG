ALTER TABLE "wedding_dossier_contacts" ADD COLUMN "attested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "wedding_dossier_contacts" ADD COLUMN "confirmed_at" timestamp with time zone;--> statement-breakpoint
UPDATE "wedding_dossier_contacts" SET "attested_at" = "updated_at" WHERE "status" = 'contacte';