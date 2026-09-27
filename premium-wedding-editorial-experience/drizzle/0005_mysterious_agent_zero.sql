CREATE TABLE "wedding_dossier_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dossier_id" uuid NOT NULL,
	"professional_ref" text,
	"declared_name" text,
	"declared_role" text,
	"status" text DEFAULT 'selectionne' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wedding_dossier_contacts" ADD CONSTRAINT "wedding_dossier_contacts_dossier_id_wedding_dossiers_id_fk" FOREIGN KEY ("dossier_id") REFERENCES "public"."wedding_dossiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wedding_dossier_contacts_dossier_idx" ON "wedding_dossier_contacts" USING btree ("dossier_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wedding_dossier_contacts_dossier_professional_unique" ON "wedding_dossier_contacts" USING btree ("dossier_id","professional_ref") WHERE "wedding_dossier_contacts"."professional_ref" IS NOT NULL;