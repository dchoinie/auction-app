DO $$ BEGIN
 CREATE TYPE "public"."position" AS ENUM('QB', 'RB', 'WR', 'TE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auction-app_nfl_player" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"position" "position" NOT NULL,
	"nfl_team_name" varchar(100) NOT NULL,
	"assigned_team_id" integer,
	"drafted_amount" integer,
	"is_keeper" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auction-app_roster" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"qb" integer,
	"rb1" integer,
	"rb2" integer,
	"wr1" integer,
	"wr2" integer,
	"te" integer,
	"flex1" integer,
	"flex2" integer,
	"bench1" integer,
	"bench2" integer,
	"bench3" integer,
	"bench4" integer,
	"bench5" integer,
	"bench6" integer,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "auction-app_roster_team_id_unique" UNIQUE("team_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auction-app_team" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"owner_name" varchar(255) NOT NULL,
	"owner_id" varchar(255) NOT NULL,
	"draft_order" integer,
	"total_budget" integer DEFAULT 200 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auction-app_nfl_player" ADD CONSTRAINT "auction-app_nfl_player_assigned_team_id_auction-app_team_id_fk" FOREIGN KEY ("assigned_team_id") REFERENCES "public"."auction-app_team"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auction-app_roster" ADD CONSTRAINT "auction-app_roster_team_id_auction-app_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."auction-app_team"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auction-app_roster" ADD CONSTRAINT "auction-app_roster_qb_auction-app_nfl_player_id_fk" FOREIGN KEY ("qb") REFERENCES "public"."auction-app_nfl_player"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auction-app_roster" ADD CONSTRAINT "auction-app_roster_rb1_auction-app_nfl_player_id_fk" FOREIGN KEY ("rb1") REFERENCES "public"."auction-app_nfl_player"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auction-app_roster" ADD CONSTRAINT "auction-app_roster_rb2_auction-app_nfl_player_id_fk" FOREIGN KEY ("rb2") REFERENCES "public"."auction-app_nfl_player"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auction-app_roster" ADD CONSTRAINT "auction-app_roster_wr1_auction-app_nfl_player_id_fk" FOREIGN KEY ("wr1") REFERENCES "public"."auction-app_nfl_player"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auction-app_roster" ADD CONSTRAINT "auction-app_roster_wr2_auction-app_nfl_player_id_fk" FOREIGN KEY ("wr2") REFERENCES "public"."auction-app_nfl_player"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auction-app_roster" ADD CONSTRAINT "auction-app_roster_te_auction-app_nfl_player_id_fk" FOREIGN KEY ("te") REFERENCES "public"."auction-app_nfl_player"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auction-app_roster" ADD CONSTRAINT "auction-app_roster_flex1_auction-app_nfl_player_id_fk" FOREIGN KEY ("flex1") REFERENCES "public"."auction-app_nfl_player"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auction-app_roster" ADD CONSTRAINT "auction-app_roster_flex2_auction-app_nfl_player_id_fk" FOREIGN KEY ("flex2") REFERENCES "public"."auction-app_nfl_player"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auction-app_roster" ADD CONSTRAINT "auction-app_roster_bench1_auction-app_nfl_player_id_fk" FOREIGN KEY ("bench1") REFERENCES "public"."auction-app_nfl_player"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auction-app_roster" ADD CONSTRAINT "auction-app_roster_bench2_auction-app_nfl_player_id_fk" FOREIGN KEY ("bench2") REFERENCES "public"."auction-app_nfl_player"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auction-app_roster" ADD CONSTRAINT "auction-app_roster_bench3_auction-app_nfl_player_id_fk" FOREIGN KEY ("bench3") REFERENCES "public"."auction-app_nfl_player"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auction-app_roster" ADD CONSTRAINT "auction-app_roster_bench4_auction-app_nfl_player_id_fk" FOREIGN KEY ("bench4") REFERENCES "public"."auction-app_nfl_player"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auction-app_roster" ADD CONSTRAINT "auction-app_roster_bench5_auction-app_nfl_player_id_fk" FOREIGN KEY ("bench5") REFERENCES "public"."auction-app_nfl_player"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auction-app_roster" ADD CONSTRAINT "auction-app_roster_bench6_auction-app_nfl_player_id_fk" FOREIGN KEY ("bench6") REFERENCES "public"."auction-app_nfl_player"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "position_idx" ON "auction-app_nfl_player" USING btree ("position");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nfl_team_idx" ON "auction-app_nfl_player" USING btree ("nfl_team_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assigned_team_idx" ON "auction-app_nfl_player" USING btree ("assigned_team_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "player_name_idx" ON "auction-app_nfl_player" USING btree ("first_name","last_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_id_idx" ON "auction-app_roster" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "name_idx" ON "auction-app_team" USING btree ("name");