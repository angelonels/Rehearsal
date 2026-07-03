CREATE TYPE "public"."experience_level" AS ENUM('entry', 'mid', 'senior', 'lead');--> statement-breakpoint
CREATE TYPE "public"."interview_type" AS ENUM('behavioral', 'technical', 'system_design', 'culture_fit');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('created', 'active', 'completed', 'report_pending', 'report_ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."speaker" AS ENUM('candidate', 'interviewer');--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"overall_score" integer NOT NULL,
	"summary" text NOT NULL,
	"strengths" jsonb NOT NULL,
	"improvements" jsonb NOT NULL,
	"competencies" jsonb NOT NULL,
	"detailed_feedback" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reports_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "interview_type" NOT NULL,
	"target_role" varchar(100) NOT NULL,
	"status" "session_status" DEFAULT 'created' NOT NULL,
	"room_name" varchar(160) NOT NULL,
	"duration_minutes" integer NOT NULL,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_room_name_unique" UNIQUE("room_name")
);
--> statement-breakpoint
CREATE TABLE "transcript_turns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"speaker" "speaker" NOT NULL,
	"content" text NOT NULL,
	"sequence" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(80) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"job_role" varchar(100) NOT NULL,
	"experience_level" "experience_level" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcript_turns" ADD CONSTRAINT "transcript_turns_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sessions_user_created_idx" ON "sessions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "turns_session_sequence_idx" ON "transcript_turns" USING btree ("session_id","sequence");