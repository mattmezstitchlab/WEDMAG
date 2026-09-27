ALTER TABLE "wedding_project_items" RENAME TO "wedding_dossiers";--> statement-breakpoint
ALTER TABLE "wedding_dossiers" DROP CONSTRAINT "wedding_project_items_project_id_wedding_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "wedding_dossiers" DROP CONSTRAINT "wedding_project_items_project_id_subject_id_pk";--> statement-breakpoint
ALTER TABLE "wedding_dossiers" ADD COLUMN "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "wedding_dossiers" ADD COLUMN "state" text DEFAULT 'selection' NOT NULL;--> statement-breakpoint
ALTER TABLE "wedding_dossiers" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "wedding_dossiers" ADD CONSTRAINT "wedding_dossiers_project_id_wedding_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."wedding_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "wedding_dossiers_project_subject_unique" ON "wedding_dossiers" USING btree ("project_id","subject_id");