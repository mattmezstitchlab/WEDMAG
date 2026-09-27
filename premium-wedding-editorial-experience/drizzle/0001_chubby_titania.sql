CREATE TABLE "wedding_project_items" (
	"project_id" uuid NOT NULL,
	"subject_id" text NOT NULL,
	"source" text DEFAULT 'wedmag' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wedding_project_items_project_id_subject_id_pk" PRIMARY KEY("project_id","subject_id")
);
--> statement-breakpoint
CREATE TABLE "wedding_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wedding_project_items" ADD CONSTRAINT "wedding_project_items_project_id_wedding_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."wedding_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "wedding_projects_session_unique" ON "wedding_projects" USING btree ("session_id");