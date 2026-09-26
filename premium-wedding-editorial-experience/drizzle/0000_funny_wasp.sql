CREATE TABLE "wedding_selections" (
	"session_id" text NOT NULL,
	"subject_id" text NOT NULL,
	"status" text DEFAULT 'interested' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "wedding_selections_session_id_subject_id_pk" PRIMARY KEY("session_id","subject_id")
);
